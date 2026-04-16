import { ConvexError } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../_generated/server";
import { MAX_RAISES_PER_ROUND, RAISE_LADDER } from "../gameState";
import {
  advanceTurn,
  handlePostActionProgression,
  scheduleBotTurnIfNeeded,
} from "./gamesProgression";
import { sortHandsByTurnOrder } from "./gamesShared";

type PlayerActionArgs = { gameId: Doc<"games">["_id"]; playerId: string };

function logBotTurn(
  message: string,
  details: Record<string, unknown>,
) {
  console.log(`[bot-turn] ${message}`, details);
}

function assertActiveBettingGame(game: Doc<"games"> | null) {
  if (!game) throw new ConvexError({ code: "GAME_NOT_FOUND", message: "Game does not exist." });
  if (game.status !== "active") {
    throw new ConvexError({ code: "INVALID_GAME_STATUS", message: "Only active games can accept bets." });
  }
  if (game.stage === "final" || game.stage === "showdown") {
    throw new ConvexError({ code: "BETTING_NOT_ALLOWED", message: `Betting is not allowed during ${game.stage}.` });
  }
  return game;
}

async function getCurrentTurnHand(ctx: MutationCtx, game: Doc<"games">, playerId: string) {
  if (!playerId) throw new ConvexError({ code: "INVALID_PLAYER_ID", message: "Player ID is required." });
  const hands = await ctx.db.query("playerHands").withIndex("by_game", (q) => q.eq("gameId", game._id)).collect();
  if (hands.length === 0) throw new ConvexError({ code: "HANDS_NOT_FOUND", message: "No hands found for this game." });
  const orderedHands = sortHandsByTurnOrder(hands);
  const currentTurnHand = orderedHands[game.currentPlayerIndex];
  if (!currentTurnHand) throw new ConvexError({ code: "INVALID_TURN_INDEX", message: "Current turn index is out of range." });
  if (currentTurnHand.playerId !== playerId) throw new ConvexError({ code: "NOT_YOUR_TURN", message: "It is not your turn." });
  if (currentTurnHand.hasFolded) throw new ConvexError({ code: "PLAYER_ALREADY_FOLDED", message: "You have already folded." });
  return { orderedHands, currentTurnHand };
}

export async function checkHandler(ctx: MutationCtx, args: PlayerActionArgs) {
  const game = assertActiveBettingGame(await ctx.db.get(args.gameId));
  const playerId = args.playerId.trim();
  const { orderedHands, currentTurnHand } = await getCurrentTurnHand(ctx, game, playerId);
  if (game.currentBet > 0 && currentTurnHand.betThisRound < game.currentBet) {
    throw new ConvexError({ code: "CANNOT_CHECK", message: `You must call ${game.currentBet} or fold.` });
  }
  const now = Date.now();
  await ctx.db.patch(currentTurnHand._id, { hasActed: true, updatedAt: now });
  const updatedHands = orderedHands.map((hand) => ({
    _id: hand._id, playerId: hand.playerId, hasFolded: hand.hasFolded,
    hasActed: hand._id === currentTurnHand._id ? true : hand.hasActed,
    betThisRound: hand.betThisRound, chips: hand.chips, totalBet: hand.totalBet,
  }));
  await handlePostActionProgression(ctx, game as any, updatedHands);
  return { ok: true, action: "check" as const, playerId };
}

export async function callHandler(ctx: MutationCtx, args: PlayerActionArgs) {
  const game = assertActiveBettingGame(await ctx.db.get(args.gameId));
  const playerId = args.playerId.trim();
  const { orderedHands, currentTurnHand } = await getCurrentTurnHand(ctx, game, playerId);
  const amountToCall = game.currentBet - currentTurnHand.betThisRound;
  if (amountToCall <= 0) throw new ConvexError({ code: "NOTHING_TO_CALL", message: "You have already matched the current bet. Use check instead." });
  if (currentTurnHand.chips < amountToCall) throw new ConvexError({ code: "INSUFFICIENT_CHIPS", message: `You need ${amountToCall} chips to call, but only have ${currentTurnHand.chips}.` });
  const now = Date.now();
  await ctx.db.patch(currentTurnHand._id, {
    chips: currentTurnHand.chips - amountToCall,
    betThisRound: currentTurnHand.betThisRound + amountToCall,
    totalBet: currentTurnHand.totalBet + amountToCall,
    hasActed: true,
    updatedAt: now,
  });
  await ctx.db.patch(game._id, { pot: game.pot + amountToCall, updatedAt: now });
  const updatedHands = orderedHands.map((hand) => ({
    _id: hand._id, playerId: hand.playerId, hasFolded: hand.hasFolded,
    hasActed: hand._id === currentTurnHand._id ? true : hand.hasActed,
    betThisRound: hand._id === currentTurnHand._id ? hand.betThisRound + amountToCall : hand.betThisRound,
    chips: hand._id === currentTurnHand._id ? hand.chips - amountToCall : hand.chips,
    totalBet: hand._id === currentTurnHand._id ? hand.totalBet + amountToCall : hand.totalBet,
  }));
  await handlePostActionProgression(ctx, game as any, updatedHands);
  return { ok: true, action: "call" as const, playerId, amountCalled: amountToCall, chipsAfterCall: currentTurnHand.chips - amountToCall, betAfterCall: currentTurnHand.betThisRound + amountToCall };
}

export async function raiseHandler(
  ctx: MutationCtx,
  args: PlayerActionArgs & { raiseToAmount: number },
) {
  const game = assertActiveBettingGame(await ctx.db.get(args.gameId));
  const playerId = args.playerId.trim();
  const raisesThisRound = game.raisesThisRound ?? 0;
  if (raisesThisRound >= MAX_RAISES_PER_ROUND) throw new ConvexError({ code: "RAISE_CAP_REACHED", message: `Maximum ${MAX_RAISES_PER_ROUND} raises per betting round reached.` });
  const raiseToAmount = Math.floor(args.raiseToAmount);
  if (!Number.isFinite(raiseToAmount) || raiseToAmount <= game.currentBet) throw new ConvexError({ code: "INVALID_RAISE_AMOUNT", message: `Raise amount must be greater than current bet of ${game.currentBet}.` });
  const nextRaiseLevel = RAISE_LADDER.find((amount) => amount > game.currentBet);
  if (nextRaiseLevel === undefined) throw new ConvexError({ code: "RAISE_CAP_REACHED", message: "Maximum raise level reached." });
  if (raiseToAmount !== nextRaiseLevel) throw new ConvexError({ code: "INVALID_RAISE_AMOUNT", message: `Raise amount must be the next ladder level: ${nextRaiseLevel}.` });
  const { orderedHands, currentTurnHand } = await getCurrentTurnHand(ctx, game, playerId);
  const additionalChipsNeeded = raiseToAmount - currentTurnHand.betThisRound;
  if (currentTurnHand.chips < additionalChipsNeeded) throw new ConvexError({ code: "INSUFFICIENT_CHIPS", message: `You need ${additionalChipsNeeded} chips to raise to ${raiseToAmount}, but only have ${currentTurnHand.chips}.` });
  const now = Date.now();
  await ctx.db.patch(currentTurnHand._id, { chips: currentTurnHand.chips - additionalChipsNeeded, betThisRound: raiseToAmount, totalBet: currentTurnHand.totalBet + additionalChipsNeeded, hasActed: true, updatedAt: now });
  for (const hand of orderedHands) if (hand._id !== currentTurnHand._id && !hand.hasFolded) await ctx.db.patch(hand._id, { hasActed: false, updatedAt: now });
  await ctx.db.patch(game._id, { pot: game.pot + additionalChipsNeeded, currentBet: raiseToAmount, raisesThisRound: raisesThisRound + 1, updatedAt: now });
  const updatedHands = orderedHands.map((hand) => ({
    _id: hand._id, playerId: hand.playerId, hasFolded: hand.hasFolded,
    hasActed: hand._id === currentTurnHand._id ? true : false,
    betThisRound: hand._id === currentTurnHand._id ? raiseToAmount : hand.betThisRound,
    chips: hand._id === currentTurnHand._id ? hand.chips - additionalChipsNeeded : hand.chips,
    totalBet: hand._id === currentTurnHand._id ? hand.totalBet + additionalChipsNeeded : hand.totalBet,
  }));
  await advanceTurn(ctx, game as any, updatedHands);
  await scheduleBotTurnIfNeeded(ctx, game._id);
  return { ok: true, action: "raise" as const, playerId, raisedTo: raiseToAmount, amountAdded: additionalChipsNeeded };
}

export async function foldHandler(ctx: MutationCtx, args: PlayerActionArgs) {
  const game = assertActiveBettingGame(await ctx.db.get(args.gameId));
  const playerId = args.playerId.trim();
  const { orderedHands, currentTurnHand } = await getCurrentTurnHand(ctx, game, playerId);
  const now = Date.now();
  await ctx.db.patch(currentTurnHand._id, { hasFolded: true, hasActed: true, updatedAt: now });
  const updatedHands = orderedHands.map((hand) => ({
    _id: hand._id, playerId: hand.playerId,
    hasFolded: hand._id === currentTurnHand._id ? true : hand.hasFolded,
    hasActed: hand._id === currentTurnHand._id ? true : hand.hasActed,
    betThisRound: hand.betThisRound, chips: hand.chips, totalBet: hand.totalBet,
  }));
  await handlePostActionProgression(ctx, game as any, updatedHands);
  return { ok: true, action: "fold" as const, playerId };
}

export async function internalProcessBotTurnHandler(
  ctx: ActionCtx,
  args: PlayerActionArgs,
): Promise<
  | { ok: true; action: "check" | "call" | "fold"; playerId: string; reasoning?: string }
  | { ok: true; action: "raise"; playerId: string; raiseAmount: number; reasoning?: string }
  | { ok: false; reason: string }
> {
  logBotTurn("starting bot turn", {
    gameId: args.gameId,
    playerId: args.playerId,
  });
  const runtimeState = await ctx.runQuery(internal.games.internalGetGameRuntimeState, { gameId: args.gameId });
  const game = runtimeState?.game;
  if (!game || game.status !== "active") {
    logBotTurn("aborting bot turn because game is not active", {
      gameFound: !!game,
      gameStatus: game?.status,
    });
    return { ok: false, reason: "Game not active" };
  }
  if (game.stage === "final" || game.stage === "showdown") {
    logBotTurn("aborting bot turn because stage does not allow betting", {
      gameId: args.gameId,
      stage: game.stage,
    });
    return { ok: false, reason: `Bots do not act during ${game.stage}` };
  }
  const hands = runtimeState.hands;
  if (hands.length === 0) {
    logBotTurn("aborting bot turn because no hands were found", {
      gameId: args.gameId,
    });
    return { ok: false, reason: "No hands found" };
  }
  const orderedHands = sortHandsByTurnOrder(hands);
  const currentTurnHand = orderedHands[game.currentPlayerIndex];
  if (!currentTurnHand) {
    logBotTurn("aborting bot turn because current turn index is invalid", {
      gameId: args.gameId,
      currentPlayerIndex: game.currentPlayerIndex,
      handCount: orderedHands.length,
    });
    return { ok: false, reason: "Current turn index out of range" };
  }
  if (currentTurnHand.playerId !== args.playerId) {
    logBotTurn("aborting bot turn because the turn moved", {
      expectedPlayerId: args.playerId,
      actualPlayerId: currentTurnHand.playerId,
      currentPlayerIndex: game.currentPlayerIndex,
    });
    return { ok: false, reason: "Turn changed before bot action executed" };
  }
  const amountToCall = game.currentBet - currentTurnHand.betThisRound;
  const runCheck = () => ctx.runMutation(api.games.check, { gameId: args.gameId, playerId: args.playerId });
  const runCall = () => ctx.runMutation(api.games.call, { gameId: args.gameId, playerId: args.playerId });
  const runFold = () => ctx.runMutation(api.games.fold, { gameId: args.gameId, playerId: args.playerId });
  if (!process.env.OPENROUTER_API_KEY) {
    logBotTurn("OPENROUTER_API_KEY missing, using betting fallback", {
      gameId: args.gameId,
      playerId: args.playerId,
      stage: game.stage,
      currentBet: game.currentBet,
      amountToCall,
      chips: currentTurnHand.chips,
    });
    if (game.currentBet === 0 || amountToCall <= 0) {
      await runCheck();
      logBotTurn("fallback action resolved to check", { playerId: currentTurnHand.playerId });
      return { ok: true, action: "check", playerId: currentTurnHand.playerId };
    }
    if (currentTurnHand.chips >= amountToCall) {
      await runCall();
      logBotTurn("fallback action resolved to call", { playerId: currentTurnHand.playerId, amountToCall });
      return { ok: true, action: "call", playerId: currentTurnHand.playerId };
    }
    await runFold();
    logBotTurn("fallback action resolved to fold", { playerId: currentTurnHand.playerId, amountToCall, chips: currentTurnHand.chips });
    return { ok: true, action: "fold", playerId: currentTurnHand.playerId };
  }
  try {
    logBotTurn("requesting AI betting decision", {
      gameId: args.gameId,
      playerId: args.playerId,
      stage: game.stage,
      currentBet: game.currentBet,
      amountToCall,
      betThisRound: currentTurnHand.betThisRound,
      chips: currentTurnHand.chips,
      pot: game.pot,
      raisesThisRound: game.raisesThisRound ?? 0,
    });
    const decision = await ctx.runAction(internal.ai.aiDecideBet, { difficulty: "medium", handTiles: currentTurnHand.tiles, communityTiles: game.communityTiles, stage: game.stage, currentBet: game.currentBet, chips: currentTurnHand.chips, pot: game.pot, raiseLadder: RAISE_LADDER, maxRaises: MAX_RAISES_PER_ROUND, currentRaises: game.raisesThisRound ?? 0 });
    logBotTurn("received AI betting decision", {
      playerId: currentTurnHand.playerId,
      action: decision.action,
      raiseAmount: decision.raiseAmount,
      reasoning: decision.reasoning,
    });
    if (decision.action === "fold") {
      await runFold();
      logBotTurn("executed AI fold", { playerId: currentTurnHand.playerId, reasoning: decision.reasoning });
      return { ok: true, action: "fold", playerId: currentTurnHand.playerId, reasoning: decision.reasoning };
    }
    if (decision.action === "check" && amountToCall <= 0) {
      await runCheck();
      logBotTurn("executed AI check", { playerId: currentTurnHand.playerId, reasoning: decision.reasoning });
      return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: decision.reasoning };
    }
    if (decision.action === "call") {
      if (amountToCall <= 0) {
        await runCheck();
        logBotTurn("converted AI call into check because there was nothing to call", {
          playerId: currentTurnHand.playerId,
          reasoning: decision.reasoning,
        });
        return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: decision.reasoning };
      }
      if (currentTurnHand.chips < amountToCall) {
        await runFold();
        logBotTurn("converted AI call into fold because chips were insufficient", {
          playerId: currentTurnHand.playerId,
          amountToCall,
          chips: currentTurnHand.chips,
        });
        return { ok: true, action: "fold", playerId: currentTurnHand.playerId, reasoning: "Insufficient chips" };
      }
      await runCall();
      logBotTurn("executed AI call", { playerId: currentTurnHand.playerId, amountToCall, reasoning: decision.reasoning });
      return { ok: true, action: "call", playerId: currentTurnHand.playerId, reasoning: decision.reasoning };
    }
    if (decision.action === "raise" && decision.raiseAmount) {
      const raiseToAmount = decision.raiseAmount;
      const additionalChipsNeeded = raiseToAmount - currentTurnHand.betThisRound;
      if (additionalChipsNeeded <= currentTurnHand.chips && (game.raisesThisRound ?? 0) < MAX_RAISES_PER_ROUND && raiseToAmount === RAISE_LADDER.find((amount) => amount > game.currentBet)) {
        await ctx.runMutation(api.games.raise, { gameId: args.gameId, playerId: args.playerId, raiseToAmount });
        logBotTurn("executed AI raise", {
          playerId: currentTurnHand.playerId,
          raiseToAmount,
          additionalChipsNeeded,
          reasoning: decision.reasoning,
        });
        return { ok: true, action: "raise", playerId: currentTurnHand.playerId, raiseAmount: raiseToAmount, reasoning: decision.reasoning };
      }
      logBotTurn("AI raise was invalid, using fallback resolution", {
        playerId: currentTurnHand.playerId,
        raiseToAmount,
        additionalChipsNeeded,
        currentBet: game.currentBet,
        raisesThisRound: game.raisesThisRound ?? 0,
      });
      if (amountToCall > 0 && currentTurnHand.chips >= amountToCall) {
        await runCall();
        logBotTurn("invalid AI raise downgraded to call", { playerId: currentTurnHand.playerId, amountToCall });
        return { ok: true, action: "call", playerId: currentTurnHand.playerId, reasoning: "Insufficient chips to raise" };
      }
      if (amountToCall <= 0) {
        await runCheck();
        logBotTurn("invalid AI raise downgraded to check", { playerId: currentTurnHand.playerId });
        return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: "AI fallback" };
      }
      await runFold();
      logBotTurn("invalid AI raise downgraded to fold", { playerId: currentTurnHand.playerId, amountToCall, chips: currentTurnHand.chips });
      return { ok: true, action: "fold", playerId: currentTurnHand.playerId, reasoning: "Insufficient chips" };
    }
    logBotTurn("AI returned an unusable decision, applying generic fallback", {
      playerId: currentTurnHand.playerId,
      action: decision.action,
      amountToCall,
    });
    if (amountToCall <= 0) {
      await runCheck();
      logBotTurn("generic fallback resolved to check", { playerId: currentTurnHand.playerId });
      return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: "AI fallback" };
    }
    await runFold();
    logBotTurn("generic fallback resolved to fold", { playerId: currentTurnHand.playerId, amountToCall });
    return { ok: true, action: "fold", playerId: currentTurnHand.playerId, reasoning: "AI fallback" };
  } catch (error) {
    console.error("[bot-turn] AI betting execution failed", {
      gameId: args.gameId,
      playerId: args.playerId,
      error: String(error),
    });
    if (game.currentBet === 0 || amountToCall <= 0) {
      await runCheck();
      logBotTurn("error fallback resolved to check", { playerId: currentTurnHand.playerId });
      return { ok: true, action: "check", playerId: currentTurnHand.playerId };
    }
    if (currentTurnHand.chips >= amountToCall) {
      await runCall();
      logBotTurn("error fallback resolved to call", { playerId: currentTurnHand.playerId, amountToCall });
      return { ok: true, action: "call", playerId: currentTurnHand.playerId };
    }
    await runFold();
    logBotTurn("error fallback resolved to fold", { playerId: currentTurnHand.playerId, amountToCall, chips: currentTurnHand.chips });
    return { ok: true, action: "fold", playerId: currentTurnHand.playerId };
  }
}
