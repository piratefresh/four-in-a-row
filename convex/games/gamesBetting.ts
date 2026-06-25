/**
 * Human player betting actions.
 *
 * Handles check, call, raise, fold, and turn-clock expiry for human players.
 * Bot turn orchestration lives in gamesBotTurn.ts. Dialogue lives in
 * gamesBotDialogue.ts. Trace helpers live in gamesTrace.ts.
 */

import { ConvexError } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  completeResolvedConfig,
  resolveConfig,
  type ResolvedGameConfig,
} from "../gameConfig";
import { FIRST_BOT_GAME_TUTORIAL_ID } from "../rooms/helpers";
import {
  advanceTurn,
  handlePostActionProgression,
  scheduleBotTurnIfNeeded,
} from "./gamesProgression";
import {
  AI_DEALER_PLAYER_ID,
  DEV_BOT_AUTH_PREFIX,
  sortHandsByTurnOrder,
} from "./gamesShared";
import { getBotCharacterForAuthUserId } from "../aiStrategy";
import { recordAction, recordRaise } from "../activityFeed";
import { insertGameActionTrace } from "./gamesTrace";

// Re-export bot turn handler for the Convex entry point (convex/games.ts).
export { internalProcessBotTurnHandler } from "./gamesBotTurn";

// ── Types ──────────────────────────────────────────────────────────

type PlayerActionArgs = {
  gameId: Doc<"games">["_id"];
  playerId: string;
  clientIsMobile?: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────

function getGameConfig(game: Doc<"games">): ResolvedGameConfig {
  return completeResolvedConfig(game.config ?? resolveConfig());
}

async function getActivityRoomInfo(
  ctx: MutationCtx,
  gameId: Id<"games">,
) {
  const game = await ctx.db.get(gameId);
  if (!game) return null;
  const roomId = game.roomId as Id<"rooms">;
  const room = await ctx.db.get(roomId);
  if (!room || room.tutorialId) return null;
  return { roomId, roomCode: room.code, roomTitle: room.title };
}

async function getActivityPlayerName(ctx: MutationCtx, playerId: string) {
  if (playerId === AI_DEALER_PLAYER_ID) return "AI Dealer";
  const normalizedPlayerId = ctx.db.normalizeId("players", playerId);
  if (!normalizedPlayerId) return playerId;
  const player = await ctx.db.get(normalizedPlayerId);
  const character = getBotCharacterForAuthUserId(player?.authUserId ?? "");
  return character?.name ?? player?.name ?? playerId;
}

function getAudiencePatch(args: PlayerActionArgs) {
  return typeof args.clientIsMobile === "boolean"
    ? { lastAudienceIsMobile: args.clientIsMobile }
    : {};
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

// ── Handlers ───────────────────────────────────────────────────────

export async function checkHandler(ctx: MutationCtx, args: PlayerActionArgs) {
  const game = assertActiveBettingGame(await ctx.db.get(args.gameId));
  const playerId = args.playerId.trim();
  const { orderedHands, currentTurnHand } = await getCurrentTurnHand(ctx, game, playerId);
  if (game.currentBet > 0 && currentTurnHand.betThisRound < game.currentBet) {
    throw new ConvexError({ code: "CANNOT_CHECK", message: `You must call ${game.currentBet} or fold.` });
  }
  const now = Date.now();
  const audiencePatch = getAudiencePatch(args);
  await ctx.db.patch(currentTurnHand._id, {
    hasActed: true,
    lastAction: "check",
    updatedAt: now,
  });
  if (typeof args.clientIsMobile === "boolean") {
    await ctx.db.patch(game._id, { ...audiencePatch, updatedAt: now });
  }
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
  const audiencePatch = getAudiencePatch(args);
  await ctx.db.patch(currentTurnHand._id, {
    chips: currentTurnHand.chips - amountToCall,
    betThisRound: currentTurnHand.betThisRound + amountToCall,
    totalBet: currentTurnHand.totalBet + amountToCall,
    hasActed: true,
    lastAction: "call",
    updatedAt: now,
  });
  await ctx.db.patch(game._id, { pot: game.pot + amountToCall, ...audiencePatch, updatedAt: now });
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
  const roomInfo = await getActivityRoomInfo(ctx, game._id);
  if (roomInfo) {
    await recordAction(ctx, {
      roomId: roomInfo.roomId,
      playerName: await getActivityPlayerName(ctx, playerId),
      actionType: "call",
      roomCode: roomInfo.roomCode,
      roomTitle: roomInfo.roomTitle,
    });
  }
  return { ok: true, action: "call" as const, playerId, amountCalled: amountToCall, chipsAfterCall: currentTurnHand.chips - amountToCall, betAfterCall: currentTurnHand.betThisRound + amountToCall };
}

export async function raiseHandler(
  ctx: MutationCtx,
  args: PlayerActionArgs & { raiseToAmount: number },
) {
  const game = assertActiveBettingGame(await ctx.db.get(args.gameId));
  const config = getGameConfig(game);
  const playerId = args.playerId.trim();
  const raisesThisRound = game.raisesThisRound ?? 0;
  if (raisesThisRound >= config.maxRaisesPerRound) throw new ConvexError({ code: "RAISE_CAP_REACHED", message: `Maximum ${config.maxRaisesPerRound} raises per betting round reached.` });
  const raiseToAmount = Math.floor(args.raiseToAmount);
  if (!Number.isFinite(raiseToAmount) || raiseToAmount <= game.currentBet) throw new ConvexError({ code: "INVALID_RAISE_AMOUNT", message: `Raise amount must be greater than current bet of ${game.currentBet}.` });
  const validRaiseOptions = config.raiseLadder.filter((amount) => amount > game.currentBet);
  if (validRaiseOptions.length === 0) throw new ConvexError({ code: "RAISE_CAP_REACHED", message: "Maximum raise level reached." });
  if (!validRaiseOptions.includes(raiseToAmount)) throw new ConvexError({ code: "INVALID_RAISE_AMOUNT", message: `Raise amount must match a valid ladder level above ${game.currentBet}: ${validRaiseOptions.join(", ")}.` });
  const { orderedHands, currentTurnHand } = await getCurrentTurnHand(ctx, game, playerId);
  const additionalChipsNeeded = raiseToAmount - currentTurnHand.betThisRound;
  const amountToCall = game.currentBet - currentTurnHand.betThisRound;
  if (
    config.bettingStructure === "potLimit" &&
    raiseToAmount > game.pot + Math.max(0, amountToCall)
  ) {
    throw new ConvexError({
      code: "POT_LIMIT_EXCEEDED",
      message: `Pot limit raise cannot exceed ${game.pot + Math.max(0, amountToCall)}.`,
    });
  }
  if (currentTurnHand.chips < additionalChipsNeeded) throw new ConvexError({ code: "INSUFFICIENT_CHIPS", message: `You need ${additionalChipsNeeded} chips to raise to ${raiseToAmount}, but only have ${currentTurnHand.chips}.` });
  const now = Date.now();
  const audiencePatch = getAudiencePatch(args);
  await ctx.db.patch(currentTurnHand._id, { chips: currentTurnHand.chips - additionalChipsNeeded, betThisRound: raiseToAmount, totalBet: currentTurnHand.totalBet + additionalChipsNeeded, hasActed: true, lastAction: "raise", updatedAt: now });
  for (const hand of orderedHands) if (hand._id !== currentTurnHand._id && !hand.hasFolded) await ctx.db.patch(hand._id, { hasActed: false, updatedAt: now });
  await ctx.db.patch(game._id, { pot: game.pot + additionalChipsNeeded, currentBet: raiseToAmount, raisesThisRound: raisesThisRound + 1, ...audiencePatch, updatedAt: now });
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
  const roomInfo = await getActivityRoomInfo(ctx, game._id);
  if (roomInfo) {
    await recordRaise(ctx, {
      roomId: roomInfo.roomId,
      playerName: await getActivityPlayerName(ctx, playerId),
      amount: raiseToAmount,
      roomCode: roomInfo.roomCode,
      roomTitle: roomInfo.roomTitle,
    });
  }
  return { ok: true, action: "raise" as const, playerId, raisedTo: raiseToAmount, amountAdded: additionalChipsNeeded };
}

export async function foldHandler(ctx: MutationCtx, args: PlayerActionArgs) {
  const game = assertActiveBettingGame(await ctx.db.get(args.gameId));
  const playerId = args.playerId.trim();
  const { orderedHands, currentTurnHand } = await getCurrentTurnHand(ctx, game, playerId);
  const now = Date.now();
  const audiencePatch = getAudiencePatch(args);
  await ctx.db.patch(currentTurnHand._id, { hasFolded: true, hasActed: true, lastAction: "fold", updatedAt: now });
  if (typeof args.clientIsMobile === "boolean") {
    await ctx.db.patch(game._id, { ...audiencePatch, updatedAt: now });
  }
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
  const roomInfo = await getActivityRoomInfo(ctx, game._id);
  if (roomInfo) {
    await recordAction(ctx, {
      roomId: roomInfo.roomId,
      playerName: await getActivityPlayerName(ctx, playerId),
      actionType: "fold",
      roomCode: roomInfo.roomCode,
      roomTitle: roomInfo.roomTitle,
    });
  }
  return { ok: true, action: "fold" as const, playerId };
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
    return { ok: false, reason: "Turn timer expired against a stale turn." };
  }

  const room = await ctx.db.get(game.roomId as Id<"rooms">);
  if (room?.tutorialId === FIRST_BOT_GAME_TUTORIAL_ID) {
    await ctx.db.patch(game._id, {
      turnClockCalledAt: undefined,
      turnClockExpiresAt: undefined,
      turnClockCallerPlayerId: undefined,
      turnClockTargetPlayerId: undefined,
      updatedAt: Date.now(),
    });
    return { ok: false, reason: "Turn timer is disabled for tutorial games." };
  }

  const { currentTurnHand } = await getOrderedHandsAndCurrentTurnHand(ctx, game);
  if (currentTurnHand.playerId !== args.playerId) {
    return { ok: false, reason: "Turn changed before the clock resolved." };
  }

  await foldHandler(ctx, { gameId: args.gameId, playerId: args.playerId });
  return { ok: true, action: "fold" as const, playerId: args.playerId };
}
