import { ConvexError } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../_generated/server";
import {
  MAX_RAISES_PER_ROUND,
  RAISE_LADDER,
  TURN_CLOCK_CALLED_DURATION_MS,
  TURN_CLOCK_GRACE_PERIOD_MS,
} from "../gameState";
import {
  advanceTurn,
  handlePostActionProgression,
  scheduleBotTurnIfNeeded,
} from "./gamesProgression";
import {
  AI_DEALER_PLAYER_ID,
  BOT_DIALOGUE_PILE_ON_REDUCTION,
  DEV_BOT_AUTH_PREFIX,
  sortHandsByTurnOrder,
} from "./gamesShared";
import { getBotCharacterForAuthUserId, getModelForDifficulty, AI_PERSONALITIES, isBluffLikely, shouldBelievePlayer } from "../aiStrategy";
import { AI_DIFFICULTY, type AIDifficulty } from "../aiBettingConstants";
import {
  type DialogueTrigger,
  prepareDialoguePrompt,
  tryTemplateReaction,
  buildGameStateDescription,
  cleanDialogueResponse,
  parseDialogueResponse,
} from "../aiDialogue";
import { getDialogueProfile } from "../aiPersonalities";
import { isOpenRouterConfigured, callOpenRouterChat } from "../openRouterClient";

const BOT_AI_TIMEOUT_MS = 4_000;

type PlayerActionArgs = { gameId: Doc<"games">["_id"]; playerId: string };
type ScheduledBotTurnArgs = PlayerActionArgs & {
  expectedStage?: string;
  expectedCurrentPlayerIndex?: number;
  expectedTurnStartedAt?: number;
};

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
  const { orderedHands, currentTurnHand } = await getOrderedHandsAndCurrentTurnHand(ctx, game);
  if (!playerId) throw new ConvexError({ code: "INVALID_PLAYER_ID", message: "Player ID is required." });
  if (currentTurnHand.playerId !== playerId) throw new ConvexError({ code: "NOT_YOUR_TURN", message: "It is not your turn." });
  if (currentTurnHand.hasFolded) throw new ConvexError({ code: "PLAYER_ALREADY_FOLDED", message: "You have already folded." });
  return { orderedHands, currentTurnHand };
}

async function getOrderedHandsAndCurrentTurnHand(
  ctx: MutationCtx,
  game: Doc<"games">,
) {
  const hands = await ctx.db.query("playerHands").withIndex("by_game", (q) => q.eq("gameId", game._id)).collect();
  if (hands.length === 0) throw new ConvexError({ code: "HANDS_NOT_FOUND", message: "No hands found for this game." });
  const orderedHands = sortHandsByTurnOrder(hands);
  const currentTurnHand = orderedHands[game.currentPlayerIndex];
  if (!currentTurnHand) throw new ConvexError({ code: "INVALID_TURN_INDEX", message: "Current turn index is out of range." });
  if (currentTurnHand.hasFolded) throw new ConvexError({ code: "PLAYER_ALREADY_FOLDED", message: "Current turn player has already folded." });
  return { orderedHands, currentTurnHand };
}

async function isAutomatedTurnPlayer(
  ctx: MutationCtx,
  game: Doc<"games">,
  playerId: string,
) {
  if (playerId === AI_DEALER_PLAYER_ID) {
    return true;
  }

  const normalizedPlayerId = ctx.db.normalizeId("players", playerId);
  if (!normalizedPlayerId) {
    return false;
  }

  const player = await ctx.db.get(normalizedPlayerId);
  return (
    !!player &&
    player.roomId === game.roomId &&
    player.status === "active" &&
    player.authUserId.startsWith(DEV_BOT_AUTH_PREFIX)
  );
}

async function getTracePlayerInfo(
  ctx: MutationCtx,
  game: Doc<"games">,
  playerId: string,
) {
  if (playerId === AI_DEALER_PLAYER_ID) {
    return { playerName: "AI Dealer", isBot: true, characterId: undefined };
  }

  const normalizedPlayerId = ctx.db.normalizeId("players", playerId);
  if (!normalizedPlayerId) {
    return { playerName: playerId, isBot: false, characterId: undefined };
  }

  const player = await ctx.db.get(normalizedPlayerId);
  const character = getBotCharacterForAuthUserId(player?.authUserId ?? "");
  return {
    playerName: character?.name ?? player?.name ?? playerId,
    isBot:
      !!player &&
      player.roomId === game.roomId &&
      player.authUserId.startsWith(DEV_BOT_AUTH_PREFIX),
    characterId: character?.id,
  };
}

async function insertGameActionTrace(
  ctx: MutationCtx,
  args: {
    game: Doc<"games">;
    playerId: string;
    action: string;
    potBefore: number;
    potAfter: number;
    chipsBefore: number;
    chipsAfter: number;
    raiseAmount?: number;
  },
) {
  const player = await getTracePlayerInfo(ctx, args.game, args.playerId);
  await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
    gameId: args.game._id,
    roomId: args.game.roomId as Id<"rooms">,
    category: "game_action",
    playerId: args.playerId,
    playerName: player.playerName,
    characterId: player.characterId,
    isBot: player.isBot,
    action: args.action,
    stage: args.game.stage,
    potBefore: args.potBefore,
    potAfter: args.potAfter,
    chipsBefore: args.chipsBefore,
    chipsAfter: args.chipsAfter,
    raiseAmount: args.raiseAmount,
  });
}

export async function checkHandler(ctx: MutationCtx, args: PlayerActionArgs) {
  const game = assertActiveBettingGame(await ctx.db.get(args.gameId));
  const playerId = args.playerId.trim();
  const { orderedHands, currentTurnHand } = await getCurrentTurnHand(ctx, game, playerId);
  if (game.currentBet > 0 && currentTurnHand.betThisRound < game.currentBet) {
    throw new ConvexError({ code: "CANNOT_CHECK", message: `You must call ${game.currentBet} or fold.` });
  }
  const now = Date.now();
  await ctx.db.patch(currentTurnHand._id, {
    hasActed: true,
    lastAction: "check",
    updatedAt: now,
  });
  await insertGameActionTrace(ctx, {
    game,
    playerId,
    action: "check",
    potBefore: game.pot,
    potAfter: game.pot,
    chipsBefore: currentTurnHand.chips,
    chipsAfter: currentTurnHand.chips,
  });
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
    lastAction: "call",
    updatedAt: now,
  });
  await ctx.db.patch(game._id, { pot: game.pot + amountToCall, updatedAt: now });
  await insertGameActionTrace(ctx, {
    game,
    playerId,
    action: "call",
    potBefore: game.pot,
    potAfter: game.pot + amountToCall,
    chipsBefore: currentTurnHand.chips,
    chipsAfter: currentTurnHand.chips - amountToCall,
  });
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
  const validRaiseOptions = RAISE_LADDER.filter((amount) => amount > game.currentBet);
  if (validRaiseOptions.length === 0) throw new ConvexError({ code: "RAISE_CAP_REACHED", message: "Maximum raise level reached." });
  if (!validRaiseOptions.includes(raiseToAmount)) throw new ConvexError({ code: "INVALID_RAISE_AMOUNT", message: `Raise amount must match a valid ladder level above ${game.currentBet}: ${validRaiseOptions.join(", ")}.` });
  const { orderedHands, currentTurnHand } = await getCurrentTurnHand(ctx, game, playerId);
  const additionalChipsNeeded = raiseToAmount - currentTurnHand.betThisRound;
  if (currentTurnHand.chips < additionalChipsNeeded) throw new ConvexError({ code: "INSUFFICIENT_CHIPS", message: `You need ${additionalChipsNeeded} chips to raise to ${raiseToAmount}, but only have ${currentTurnHand.chips}.` });
  const now = Date.now();
  await ctx.db.patch(currentTurnHand._id, { chips: currentTurnHand.chips - additionalChipsNeeded, betThisRound: raiseToAmount, totalBet: currentTurnHand.totalBet + additionalChipsNeeded, hasActed: true, lastAction: "raise", updatedAt: now });
  for (const hand of orderedHands) if (hand._id !== currentTurnHand._id && !hand.hasFolded) await ctx.db.patch(hand._id, { hasActed: false, updatedAt: now });
  await ctx.db.patch(game._id, { pot: game.pot + additionalChipsNeeded, currentBet: raiseToAmount, raisesThisRound: raisesThisRound + 1, updatedAt: now });
  await insertGameActionTrace(ctx, {
    game,
    playerId,
    action: "raise",
    potBefore: game.pot,
    potAfter: game.pot + additionalChipsNeeded,
    chipsBefore: currentTurnHand.chips,
    chipsAfter: currentTurnHand.chips - additionalChipsNeeded,
    raiseAmount: raiseToAmount,
  });
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
  await ctx.db.patch(currentTurnHand._id, { hasFolded: true, hasActed: true, lastAction: "fold", updatedAt: now });
  await insertGameActionTrace(ctx, {
    game,
    playerId,
    action: "fold",
    potBefore: game.pot,
    potAfter: game.pot,
    chipsBefore: currentTurnHand.chips,
    chipsAfter: currentTurnHand.chips,
  });
  const updatedHands = orderedHands.map((hand) => ({
    _id: hand._id, playerId: hand.playerId,
    hasFolded: hand._id === currentTurnHand._id ? true : hand.hasFolded,
    hasActed: hand._id === currentTurnHand._id ? true : hand.hasActed,
    betThisRound: hand.betThisRound, chips: hand.chips, totalBet: hand.totalBet,
  }));
  await handlePostActionProgression(ctx, game as any, updatedHands);
  return { ok: true, action: "fold" as const, playerId };
}

export async function callClockHandler(
  ctx: MutationCtx,
  args: PlayerActionArgs,
) {
  const game = assertActiveBettingGame(await ctx.db.get(args.gameId));
  const callerPlayerId = args.playerId.trim();
  const { orderedHands, currentTurnHand } = await getOrderedHandsAndCurrentTurnHand(
    ctx,
    game,
  );

  if (!callerPlayerId) {
    throw new ConvexError({
      code: "INVALID_PLAYER_ID",
      message: "Player ID is required.",
    });
  }

  const callerHand = orderedHands.find((hand) => hand.playerId === callerPlayerId);
  if (!callerHand || callerHand.hasFolded) {
    throw new ConvexError({
      code: "CLOCK_CALLER_NOT_ACTIVE",
      message: "Only active players in the hand can call the clock.",
    });
  }

  if (currentTurnHand.playerId === callerPlayerId) {
    throw new ConvexError({
      code: "CLOCK_CANNOT_TARGET_SELF",
      message: "You cannot call the clock on your own turn.",
    });
  }

  if (await isAutomatedTurnPlayer(ctx, game, currentTurnHand.playerId)) {
    throw new ConvexError({
      code: "CLOCK_NOT_AVAILABLE",
      message: "Automated players cannot be put on the clock.",
    });
  }

  const now = Date.now();
  if (game.turnClockExpiresAt !== undefined) {
    throw new ConvexError({
      code: "CLOCK_ALREADY_RUNNING",
      message: "The clock is already running for this turn.",
    });
  }

  if (game.turnStartedAt === undefined) {
    throw new ConvexError({
      code: "CLOCK_NOT_AVAILABLE",
      message: "The current turn has not started yet.",
    });
  }

  const elapsed = now - game.turnStartedAt;
  if (elapsed < TURN_CLOCK_GRACE_PERIOD_MS) {
    const secondsRemaining = Math.ceil(
      (TURN_CLOCK_GRACE_PERIOD_MS - elapsed) / 1000,
    );
    throw new ConvexError({
      code: "CLOCK_TOO_EARLY",
      message: `Clock becomes available in ${secondsRemaining}s.`,
    });
  }

  const turnClockExpiresAt = now + TURN_CLOCK_CALLED_DURATION_MS;
  await ctx.db.patch(game._id, {
    turnClockCalledAt: now,
    turnClockExpiresAt,
    turnClockCallerPlayerId: callerPlayerId,
    turnClockTargetPlayerId: currentTurnHand.playerId,
    updatedAt: now,
  });

  await ctx.scheduler.runAfter(
    TURN_CLOCK_CALLED_DURATION_MS,
    (internal as typeof internal).games.internalResolveExpiredTurnClock,
    {
      gameId: game._id,
      playerId: currentTurnHand.playerId,
      turnClockExpiresAt,
    },
  );

  return {
    ok: true,
    callerPlayerId,
    targetPlayerId: currentTurnHand.playerId,
    turnClockExpiresAt,
  };
}

export async function internalResolveExpiredTurnClockHandler(
  ctx: MutationCtx,
  args: PlayerActionArgs & { turnClockExpiresAt: number },
) {
  const game = await ctx.db.get(args.gameId);
  if (
    !game ||
    game.status !== "active" ||
    game.stage === "final" ||
    game.stage === "showdown" ||
    game.turnClockExpiresAt !== args.turnClockExpiresAt ||
    game.turnClockTargetPlayerId !== args.playerId
  ) {
    return { ok: false, reason: "Clock expired against a stale turn." };
  }

  const { currentTurnHand } = await getOrderedHandsAndCurrentTurnHand(ctx, game);
  if (currentTurnHand.playerId !== args.playerId) {
    return { ok: false, reason: "Turn changed before the clock resolved." };
  }

  const amountToCall = game.currentBet - currentTurnHand.betThisRound;
  if (amountToCall <= 0) {
    await checkHandler(ctx, { gameId: args.gameId, playerId: args.playerId });
    return { ok: true, action: "check" as const, playerId: args.playerId };
  }

  await foldHandler(ctx, { gameId: args.gameId, playerId: args.playerId });
  return { ok: true, action: "fold" as const, playerId: args.playerId };
}

export async function internalProcessBotTurnHandler(
  ctx: ActionCtx,
  args: ScheduledBotTurnArgs,
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
  if (
    args.expectedStage !== undefined &&
    (game.stage !== args.expectedStage ||
      game.currentPlayerIndex !== args.expectedCurrentPlayerIndex ||
      game.turnStartedAt !== args.expectedTurnStartedAt)
  ) {
    logBotTurn("aborting bot turn because the scheduled turn is stale", {
      expectedStage: args.expectedStage,
      actualStage: game.stage,
      expectedCurrentPlayerIndex: args.expectedCurrentPlayerIndex,
      actualCurrentPlayerIndex: game.currentPlayerIndex,
      expectedTurnStartedAt: args.expectedTurnStartedAt,
      actualTurnStartedAt: game.turnStartedAt,
    });
    return { ok: false, reason: "Scheduled bot turn is stale" };
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

  const botPlayer = runtimeState.players.find((p) => String(p._id) === args.playerId);
  const botAuthUserId = botPlayer?.authUserId ?? "";
  const roomId = game.roomId as Id<"rooms">;
  const difficulty = (runtimeState.room?.difficulty as AIDifficulty | undefined) ?? AI_DIFFICULTY.MEDIUM;

  const sendDialogue = async (action: string) => {
    if (!botAuthUserId) return;
    try {
      const character = getBotCharacterForAuthUserId(botAuthUserId);
      const personality = character?.personality ?? AI_PERSONALITIES.BALANCED;

      const recentMessages = await ctx.runQuery(api.messages.getRecentMessages, {
        roomId,
        limit: 10,
      });

      const playerMessages = recentMessages
        .filter((m) => m.type === "player")
        .map((m) => m.text);

      const bluffDetected = isBluffLikely(playerMessages);
      const believesPlayer = shouldBelievePlayer(personality, bluffDetected);

      await maybeSendBotDialogue(ctx, {
        gameId: args.gameId,
        roomId,
        playerId: args.playerId,
        botAuthUserId,
        action,
        gameStage: game.stage,
        pot: game.pot,
        botChips: currentTurnHand.chips,
        currentBet: game.currentBet,
        believesPlayer,
      });
    } catch {
      // best-effort: never block the game
    }
  };

  if (!isOpenRouterConfigured()) {
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
      await sendDialogue("check");
      return { ok: true, action: "check", playerId: currentTurnHand.playerId };
    }
    if (currentTurnHand.chips >= amountToCall) {
      await runCall();
      logBotTurn("fallback action resolved to call", { playerId: currentTurnHand.playerId, amountToCall });
      await sendDialogue("call");
      return { ok: true, action: "call", playerId: currentTurnHand.playerId };
    }
    await runFold();
    logBotTurn("fallback action resolved to fold", { playerId: currentTurnHand.playerId, amountToCall, chips: currentTurnHand.chips });
    await sendDialogue("fold");
    return { ok: true, action: "fold", playerId: currentTurnHand.playerId };
  }
  try {
    const character = getBotCharacterForAuthUserId(botAuthUserId);
    const personality = character?.personality ?? AI_PERSONALITIES.BALANCED;

    const recentMessages = await ctx.runQuery(api.messages.getRecentMessages, {
      roomId,
      limit: 10,
    });

    const playerMessages = recentMessages
      .filter((m) => m.type === "player")
      .map((m) => m.text);

    const bluffDetected = isBluffLikely(playerMessages);
    const believesPlayer = shouldBelievePlayer(personality, bluffDetected);

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
      difficulty,
      bluffDetected,
      believesPlayer,
    });
    const decision = await ctx.runAction(internal.ai.aiDecideBet, {
      difficulty,
      personality,
      handTiles: currentTurnHand.tiles,
      communityTiles: game.communityTiles,
      stage: game.stage,
      currentBet: game.currentBet,
      chips: currentTurnHand.chips,
      pot: game.pot,
      raiseLadder: RAISE_LADDER,
      maxRaises: MAX_RAISES_PER_ROUND,
      currentRaises: game.raisesThisRound ?? 0,
      timeoutMs: BOT_AI_TIMEOUT_MS,
      believesPlayer: believesPlayer ?? undefined,
      gameId: args.gameId,
      roomId,
      playerId: args.playerId,
      playerName: botPlayer?.name ?? character?.name,
      characterId: character?.id,
    });
    logBotTurn("received AI betting decision", {
      playerId: currentTurnHand.playerId,
      action: decision.action,
      raiseAmount: decision.raiseAmount,
      reasoning: decision.reasoning,
    });
    if (decision.action === "fold") {
      // Never fold when checking is free
      if (amountToCall <= 0) {
        await runCheck();
        logBotTurn("overrode AI fold to check (no bet to call)", { playerId: currentTurnHand.playerId, reasoning: decision.reasoning });
        await sendDialogue("check");
        return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: `Overrode fold: ${decision.reasoning}` };
      }
      await runFold();
      logBotTurn("executed AI fold", { playerId: currentTurnHand.playerId, reasoning: decision.reasoning });
      await sendDialogue("fold");
      return { ok: true, action: "fold", playerId: currentTurnHand.playerId, reasoning: decision.reasoning };
    }
    if (decision.action === "check" && amountToCall <= 0) {
      await runCheck();
      logBotTurn("executed AI check", { playerId: currentTurnHand.playerId, reasoning: decision.reasoning });
      await sendDialogue("check");
      return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: decision.reasoning };
    }
    if (decision.action === "call") {
      if (amountToCall <= 0) {
        await runCheck();
        logBotTurn("converted AI call into check because there was nothing to call", {
          playerId: currentTurnHand.playerId,
          reasoning: decision.reasoning,
        });
        await sendDialogue("check");
        return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: decision.reasoning };
      }
      if (currentTurnHand.chips < amountToCall) {
        await runFold();
        logBotTurn("converted AI call into fold because chips were insufficient", {
          playerId: currentTurnHand.playerId,
          amountToCall,
          chips: currentTurnHand.chips,
        });
        await sendDialogue("fold");
        return { ok: true, action: "fold", playerId: currentTurnHand.playerId, reasoning: "Insufficient chips" };
      }
      await runCall();
      logBotTurn("executed AI call", { playerId: currentTurnHand.playerId, amountToCall, reasoning: decision.reasoning });
      await sendDialogue("call");
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
        await sendDialogue("raise");
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
        await sendDialogue("call");
        return { ok: true, action: "call", playerId: currentTurnHand.playerId, reasoning: "Insufficient chips to raise" };
      }
      if (amountToCall <= 0) {
        await runCheck();
        logBotTurn("invalid AI raise downgraded to check", { playerId: currentTurnHand.playerId });
        await sendDialogue("check");
        return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: "AI fallback" };
      }
      await runFold();
      logBotTurn("invalid AI raise downgraded to fold", { playerId: currentTurnHand.playerId, amountToCall, chips: currentTurnHand.chips });
      await sendDialogue("fold");
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
      await sendDialogue("check");
      return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: "AI fallback" };
    }
    await runFold();
    logBotTurn("generic fallback resolved to fold", { playerId: currentTurnHand.playerId, amountToCall });
    await sendDialogue("fold");
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
      await sendDialogue("check");
      return { ok: true, action: "check", playerId: currentTurnHand.playerId };
    }
    if (currentTurnHand.chips >= amountToCall) {
      await runCall();
      logBotTurn("error fallback resolved to call", { playerId: currentTurnHand.playerId, amountToCall });
      await sendDialogue("call");
      return { ok: true, action: "call", playerId: currentTurnHand.playerId };
    }
    await runFold();
    logBotTurn("error fallback resolved to fold", { playerId: currentTurnHand.playerId, amountToCall, chips: currentTurnHand.chips });
    await sendDialogue("fold");
    return { ok: true, action: "fold", playerId: currentTurnHand.playerId };
  }
}

/**
 * Map a bot betting action to a dialogue trigger.
 */
function mapActionToDialogueTrigger(action: string): DialogueTrigger | null {
  switch (action) {
    case "fold": return "botFolds";
    case "raise": return "botRaises";
    case "call": return "playerCall";
    case "check": return "playerCheck";
    default: return null;
  }
}

/**
 * Attempt to generate and send AI dialogue after a bot takes an action.
 * This is a best-effort side effect — failures are logged but don't affect game flow.
 */
function formatRecentMessages(
  messages: Array<{ senderName: string; text: string; type: string; repliedByBots?: string[] }>,
  _botName: string,
): string {
  if (messages.length === 0) return "";
  return messages
    .map((msg) => {
      if (msg.type === "system") return `[System] ${msg.text}`;
      if (msg.type === "ai") {
        return `[${msg.senderName} (bot)] ${msg.text}`;
      }
      const repliedTag = msg.repliedByBots?.length
        ? ` (replied by: ${msg.repliedByBots.join(", ")})`
        : "";
      return `${msg.senderName}: ${msg.text}${repliedTag}`;
    })
    .join("\n");
}

export async function maybeSendBotDialogue(
  ctx: ActionCtx,
  args: {
    gameId: Doc<"games">["_id"];
    roomId: Doc<"rooms">["_id"];
    playerId: string;
    botAuthUserId: string;
    action: string;
    gameStage: string;
    pot: number;
    botChips: number;
    currentBet: number;
    believesPlayer?: boolean | null;
  },
): Promise<void> {
  try {
    const character = getBotCharacterForAuthUserId(args.botAuthUserId);
    if (!character) return;

    const trigger = mapActionToDialogueTrigger(args.action);
    if (!trigger) return;

    const recentMessages = await ctx.runQuery(api.messages.getRecentMessages, {
      roomId: args.roomId,
      limit: 10,
    });

    // Find the most recent player message to track pile-on responses
    let latestPlayerMsg: (typeof recentMessages)[number] | undefined;
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      if (recentMessages[i].type === "player") {
        latestPlayerMsg = recentMessages[i];
        break;
      }
    }
    const alreadyRepliedCount = latestPlayerMsg?.repliedByBots?.length ?? 0;

    // If other bots already replied to the latest player message, dramatically reduce
    // the chance of this bot also responding
    if (alreadyRepliedCount > 0) {
      const reductionFactor = Math.pow(BOT_DIALOGUE_PILE_ON_REDUCTION, alreadyRepliedCount);
      if (Math.random() > reductionFactor) return;
    }

    const recentMessagesStr = formatRecentMessages(recentMessages, character.name);

    const templateResult = tryTemplateReaction({
      botCharacterId: character.id as any,
      trigger,
      gameState: "",
      recentMessages: recentMessagesStr,
      believesPlayer: args.believesPlayer ?? null,
    });

    if (templateResult) {
      await ctx.runMutation(api.messages.sendAsAI, {
        roomId: args.roomId,
        playerId: args.playerId as any,
        text: templateResult.message,
      });
      await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
        gameId: args.gameId,
        roomId: args.roomId,
        category: "ai_dialogue",
        playerId: args.playerId,
        playerName: character.name,
        characterId: character.id,
        isBot: true,
        stage: args.gameStage,
        action: args.action,
        personality: character.personality,
        dialogueTrigger: trigger,
        dialogueMessage: templateResult.message,
        usedFallback: true,
        metadata: { source: "template" },
      });
      if (latestPlayerMsg && alreadyRepliedCount < 3) {
        try {
          await ctx.runMutation(api.messages.markPlayerMessageReplied, {
            messageId: latestPlayerMsg._id,
            botName: character.name,
          });
        } catch {}
      }
      return;
    }

    const gameStateDesc = buildGameStateDescription({
      stage: args.gameStage,
      pot: args.pot,
      botChips: args.botChips,
      currentBet: args.currentBet,
      isBotTurn: false,
    });

    const { shouldSpeak, prompt } = prepareDialoguePrompt({
      botCharacterId: character.id as any,
      trigger,
      gameState: gameStateDesc,
      recentMessages: recentMessagesStr,
      believesPlayer: args.believesPlayer ?? null,
    });

    if (!shouldSpeak) return;

    if (!isOpenRouterConfigured()) return;

    // RAG: try to find a cached response for similar context
    const contextText = `Trigger: ${trigger}. ${gameStateDesc} Chat: ${recentMessagesStr || "none"}`;

    let cachedResponse: string | null = null;
    try {
      const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
        text: contextText,
      });

      cachedResponse = await ctx.runAction(internal.aiCache.searchDialogueCache, {
        embedding,
        personality: character.personality,
        trigger,
      });
    } catch (embedError) {
      console.warn("[bot-dialogue] RAG lookup failed, falling through to LLM", {
        error: String(embedError),
      });
    }

    if (cachedResponse) {
      await ctx.runMutation(api.messages.sendAsAI, {
        roomId: args.roomId,
        playerId: args.playerId as any,
        text: cachedResponse,
      });
      await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
        gameId: args.gameId,
        roomId: args.roomId,
        category: "ai_dialogue",
        playerId: args.playerId,
        playerName: character.name,
        characterId: character.id,
        isBot: true,
        stage: args.gameStage,
        action: args.action,
        personality: character.personality,
        dialogueTrigger: trigger,
        dialogueMessage: cachedResponse,
        inputPrompt: prompt,
        usedFallback: true,
        metadata: { source: "rag_cache", contextText },
      });
      if (latestPlayerMsg && alreadyRepliedCount < 3) {
        try {
          await ctx.runMutation(api.messages.markPlayerMessageReplied, {
            messageId: latestPlayerMsg._id,
            botName: character.name,
          });
        } catch {}
      }
      return;
    }

    // Cache miss: generate via LLM
    const model = getModelForDifficulty("medium");
    const profile = getDialogueProfile(character.personality);

    const { content: rawResponse, latencyMs } = await callOpenRouterChat({
      model,
      prompt,
      timeoutMs: 3000,
      responseFormat: { type: "json_object" },
    });
    const cleaned = parseDialogueResponse(rawResponse) ?? cleanDialogueResponse(rawResponse, profile.maxTokens);

    if (!cleaned) return;

    // Store in cache for future reuse (best-effort)
    try {
      const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
        text: contextText,
      });

      await ctx.runMutation(internal.aiCache.insertDialogueCacheEntry, {
        personality: character.personality,
        trigger,
        contextText,
        embedding,
        responseText: cleaned,
      });
    } catch (cacheError) {
      console.warn("[bot-dialogue] Failed to cache dialogue response", {
        error: String(cacheError),
      });
    }

    await ctx.runMutation(api.messages.sendAsAI, {
      roomId: args.roomId,
      playerId: args.playerId as any,
      text: cleaned,
    });

    await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
      gameId: args.gameId,
      roomId: args.roomId,
      category: "ai_dialogue",
      playerId: args.playerId,
      playerName: character.name,
      characterId: character.id,
      isBot: true,
      stage: args.gameStage,
      action: args.action,
      model,
      personality: character.personality,
      dialogueTrigger: trigger,
      dialogueMessage: cleaned,
      inputPrompt: prompt,
      outputRaw: rawResponse,
      outputParsed: cleaned,
      usedFallback: false,
      metadata: { latencyMs, contextText },
    });

    if (latestPlayerMsg && alreadyRepliedCount < 3) {
      try {
        await ctx.runMutation(api.messages.markPlayerMessageReplied, {
          messageId: latestPlayerMsg._id,
          botName: character.name,
        });
      } catch {}
    }
  } catch (error) {
    console.warn("[bot-dialogue] Failed to generate dialogue", { error: String(error) });
  }
}
