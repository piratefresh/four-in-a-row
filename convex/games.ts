import { ConvexError, v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  createInitialGameDocument,
  createShuffledDeck,
  gameDeckTileValidator,
  getNextStage,
  INITIAL_HAND_SIZE,
} from "./gameState";
import type { GameStage } from "./gameState";
import type { Id } from "./_generated/dataModel";

const AI_DEALER_PLAYER_ID = "ai_dealer";
const INITIAL_CHIPS = 1000;
const REVEAL_COUNT_BY_STAGE: Record<GameStage, number> = {
  preflop: 2,
  flop: 1,
  turn: 1,
  river: 1,
  final: 0,
  showdown: 0,
};

export const createGameForRoom = mutation({
  args: {
    roomId: v.string(),
    deck: v.optional(v.array(gameDeckTileValidator)),
  },
  handler: async (ctx, args) => {
    const roomId = args.roomId.trim();
    if (!roomId) {
      throw new ConvexError({
        code: "INVALID_ROOM_ID",
        message: "Room ID is required.",
      });
    }

    const openGame = await ctx.db
      .query("games")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", roomId).eq("status", "active"),
      )
      .unique();

    if (openGame) {
      throw new ConvexError({
        code: "GAME_ALREADY_ACTIVE",
        message: "An active game already exists for this room.",
      });
    }

    const waitingGame = await ctx.db
      .query("games")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", roomId).eq("status", "waiting"),
      )
      .unique();

    if (waitingGame) {
      return waitingGame._id;
    }

    const gameDoc = createInitialGameDocument(roomId, args.deck ?? []);
    return await ctx.db.insert("games", gameDoc);
  },
});

export const startGame = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new ConvexError({
        code: "GAME_NOT_FOUND",
        message: "Game does not exist.",
      });
    }

    if (game.status !== "waiting") {
      throw new ConvexError({
        code: "INVALID_GAME_STATUS",
        message: "Only waiting games can be started.",
      });
    }

    const roomId = game.roomId as Id<"rooms">;
    const room = await ctx.db.get(roomId);
    if (!room) {
      throw new ConvexError({
        code: "ROOM_NOT_FOUND",
        message: "Room does not exist.",
      });
    }

    const activePlayers = await ctx.db
      .query("players")
      .withIndex("roomId_status", (q) =>
        q.eq("roomId", room._id).eq("status", "active"),
      )
      .collect();

    if (activePlayers.length < 1) {
      throw new ConvexError({
        code: "NOT_ENOUGH_PLAYERS",
        message: "At least 1 active player is required to start.",
      });
    }

    activePlayers.sort((a, b) => a.seatIndex - b.seatIndex);
    const participantIds = activePlayers.map((player) => player._id as string);
    if (participantIds.length === 1) {
      participantIds.push(AI_DEALER_PLAYER_ID);
    }

    const requiredTiles = participantIds.length * INITIAL_HAND_SIZE;
    const workingDeck =
      game.deck.length > 0 ? [...game.deck] : createShuffledDeck();

    if (workingDeck.length < requiredTiles) {
      throw new ConvexError({
        code: "DECK_EXHAUSTED",
        message: "Not enough tiles in deck for initial distribution.",
      });
    }

    const existingHands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect();

    for (const hand of existingHands) {
      await ctx.db.delete(hand._id);
    }

    const now = Date.now();
    for (const participantId of participantIds) {
      const tiles = workingDeck.splice(0, INITIAL_HAND_SIZE);
      await ctx.db.insert("playerHands", {
        gameId: game._id,
        playerId: participantId,
        tiles,
        chips: INITIAL_CHIPS,
        betThisRound: 0,
        totalBet: 0,
        hasActed: false,
        hasFolded: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(game._id, {
      status: "active",
      deck: workingDeck,
      currentBet: 0,
      currentPlayerIndex: 0,
      updatedAt: now,
    });
    await setRoomUsersActiveGameId(ctx, room._id, String(game._id));

    return {
      ok: true,
      gameId: game._id,
      status: "active" as const,
      dealtHandSize: INITIAL_HAND_SIZE,
      playersDealt: participantIds.length,
      includesAiDealer: participantIds.includes(AI_DEALER_PLAYER_ID),
    };
  },
});

export const advanceStage = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new ConvexError({
        code: "GAME_NOT_FOUND",
        message: "Game does not exist.",
      });
    }

    if (game.status !== "active") {
      throw new ConvexError({
        code: "INVALID_GAME_STATUS",
        message: "Only active games can advance.",
      });
    }

    const nextStage = getNextStage(game.stage);
    const now = Date.now();
    const roomId = ctx.db.normalizeId("rooms", game.roomId);

    if (!nextStage) {
      await ctx.db.patch(game._id, {
        status: "completed",
        updatedAt: now,
      });
      if (roomId) {
        await setRoomUsersActiveGameId(ctx, roomId, undefined);
      }
      return {
        ok: true,
        gameId: game._id,
        stage: game.stage,
        status: "completed" as const,
      };
    }

    // Reveal community tiles based on stage
    let communityTiles = [...game.communityTiles];
    let deck = [...game.deck];

    if (nextStage === "flop" && communityTiles.length === 0) {
      // Reveal 3 cards for flop
      const newTiles = deck.splice(0, 3);
      communityTiles = newTiles.map(({ letter, baseValue }) => ({
        letter,
        baseValue,
        revealed: true
      }));
    } else if (nextStage === "turn" && communityTiles.length === 3) {
      // Reveal 1 card for turn
      const newTile = deck.shift();
      if (newTile) {
        communityTiles.push({
          letter: newTile.letter,
          baseValue: newTile.baseValue,
          revealed: true
        });
      }
    } else if (nextStage === "river" && communityTiles.length === 4) {
      // Reveal 1 card for river
      const newTile = deck.shift();
      if (newTile) {
        communityTiles.push({
          letter: newTile.letter,
          baseValue: newTile.baseValue,
          revealed: true
        });
      }
    }

    const nextStatus = nextStage === "showdown" ? "completed" : game.status;
    await ctx.db.patch(game._id, {
      stage: nextStage,
      status: nextStatus,
      communityTiles,
      deck,
      updatedAt: now,
    });
    if (nextStatus === "completed" && roomId) {
      await setRoomUsersActiveGameId(ctx, roomId, undefined);
    }

    return {
      ok: true,
      gameId: game._id,
      stage: nextStage,
      status: nextStatus,
    };
  },
});

export const getGameByRoom = query({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    const roomId = args.roomId.trim();
    if (!roomId) {
      return null;
    }

    const activeGame = await ctx.db
      .query("games")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", roomId).eq("status", "active"),
      )
      .unique();

    if (activeGame) {
      return activeGame;
    }

    const waitingGame = await ctx.db
      .query("games")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", roomId).eq("status", "waiting"),
      )
      .unique();

    if (waitingGame) {
      return waitingGame;
    }

    const completed = await ctx.db
      .query("games")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", roomId).eq("status", "completed"),
      )
      .order("desc")
      .take(1);

    return completed[0] ?? null;
  },
});

export const getPlayerHands = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    hands.sort((a, b) => a.playerId.localeCompare(b.playerId));
    return hands;
  },
});

// Helper function to sort hands by turn order
function sortHandsByTurnOrder<T extends { createdAt: number; playerId: string }>(
  hands: T[],
) {
  return [...hands].sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt - b.createdAt;
    }
    return a.playerId.localeCompare(b.playerId);
  });
}

// Helper to check if betting round is complete
function isBettingRoundComplete(
  hands: Array<{
    hasFolded: boolean;
    hasActed: boolean;
    betThisRound: number;
  }>,
  currentBet: number,
): boolean {
  const activePlayers = hands.filter((h) => !h.hasFolded);

  if (activePlayers.length <= 1) {
    return true;
  }

  const allActed = activePlayers.every((h) => h.hasActed);
  if (!allActed) {
    return false;
  }

  const allBetsMatch = activePlayers.every((h) => h.betThisRound === currentBet);
  return allBetsMatch;
}

async function setRoomUsersActiveGameId(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  activeGameId?: string,
) {
  const activePlayers = await ctx.db
    .query("players")
    .withIndex("roomId_status", (q) =>
      q.eq("roomId", roomId).eq("status", "active"),
    )
    .collect();

  const userIds = new Set<string>();
  for (const player of activePlayers) {
    if (player.authUserId) {
      userIds.add(player.authUserId);
    }
  }

  for (const userId of userIds) {
    const normalizedUserId = ctx.db.normalizeId("user", userId);
    if (normalizedUserId) {
      await ctx.db.patch(normalizedUserId, { activeGameId });
    }
  }
}

// Helper to auto-advance stage after betting round completes
async function autoAdvanceStage(
  ctx: any,
  gameId: Id<"games">,
  game: any,
  hands: any[],
) {
  const nextStage = getNextStage(game.stage);
  const now = Date.now();

  if (!nextStage) {
    await ctx.db.patch(gameId, {
      status: "completed" as const,
      updatedAt: now,
    });
    const roomId = ctx.db.normalizeId("rooms", game.roomId);
    if (roomId) {
      await setRoomUsersActiveGameId(ctx, roomId, undefined);
    }
    return { advanced: true, nextStage: null, status: "completed" as const };
  }

  const revealCount = REVEAL_COUNT_BY_STAGE[game.stage as GameStage] ?? 0;
  const nextCommunityTiles = [...game.communityTiles];
  const nextDeck = [...game.deck];

  if (revealCount > 0) {
    if (nextDeck.length < revealCount) {
      throw new ConvexError({
        code: "DECK_EXHAUSTED",
        message: `Not enough tiles in deck to reveal ${revealCount} community tile(s).`,
      });
    }

    for (let i = 0; i < revealCount; i++) {
      const tile = nextDeck.shift();
      if (!tile) {
        throw new ConvexError({
          code: "DECK_EXHAUSTED",
          message: "Deck was unexpectedly exhausted while revealing tiles.",
        });
      }
      nextCommunityTiles.push({
        letter: tile.letter,
        baseValue: tile.baseValue,
        revealed: true,
      });
    }
  }

  // Reset betting for next round
  for (const hand of hands) {
    if (!hand.hasFolded) {
      await ctx.db.patch(hand._id, {
        betThisRound: 0,
        hasActed: false,
        updatedAt: now,
      });
    }
  }

  await ctx.db.patch(gameId, {
    stage: nextStage,
    communityTiles: nextCommunityTiles,
    deck: nextDeck,
    currentBet: 0,
    currentPlayerIndex: 0,
    updatedAt: now,
  });

  return {
    advanced: true,
    nextStage,
    status: game.status,
    revealedTiles: revealCount,
  };
}

// CHECK mutation - Pass with no bet (only allowed if current bet is 0 or you've already matched it)
export const check = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new ConvexError({
        code: "GAME_NOT_FOUND",
        message: "Game does not exist.",
      });
    }

    if (game.status !== "active") {
      throw new ConvexError({
        code: "INVALID_GAME_STATUS",
        message: "Only active games can accept bets.",
      });
    }

    const playerId = args.playerId.trim();
    if (!playerId) {
      throw new ConvexError({
        code: "INVALID_PLAYER_ID",
        message: "Player ID is required.",
      });
    }

    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect();

    if (hands.length === 0) {
      throw new ConvexError({
        code: "HANDS_NOT_FOUND",
        message: "No hands found for this game.",
      });
    }

    const orderedHands = sortHandsByTurnOrder(hands);
    const currentTurnHand = orderedHands[game.currentPlayerIndex];
    if (!currentTurnHand) {
      throw new ConvexError({
        code: "INVALID_TURN_INDEX",
        message: "Current turn index is out of range.",
      });
    }

    if (currentTurnHand.playerId !== playerId) {
      throw new ConvexError({
        code: "NOT_YOUR_TURN",
        message: "It is not your turn.",
      });
    }

    if (currentTurnHand.hasFolded) {
      throw new ConvexError({
        code: "PLAYER_ALREADY_FOLDED",
        message: "You have already folded.",
      });
    }

    // Can only check if current bet is 0 or you've already matched it
    if (game.currentBet > 0 && currentTurnHand.betThisRound < game.currentBet) {
      throw new ConvexError({
        code: "CANNOT_CHECK",
        message: `You must call ${game.currentBet} or fold.`,
      });
    }

    const now = Date.now();
    await ctx.db.patch(currentTurnHand._id, {
      hasActed: true,
      updatedAt: now,
    });

    const updatedHands = orderedHands.map((hand) =>
      hand._id === currentTurnHand._id ? { ...hand, hasActed: true } : hand,
    );

    // Check if betting round is complete
    if (isBettingRoundComplete(updatedHands, game.currentBet)) {
      const advanceResult = await autoAdvanceStage(ctx, game._id, game, updatedHands);
      return {
        ok: true,
        action: "check" as const,
        playerId,
        ...advanceResult,
      };
    }

    // Move to next player
    let nextPlayerIndex = game.currentPlayerIndex;
    for (let step = 1; step <= updatedHands.length; step++) {
      const candidateIndex = (game.currentPlayerIndex + step) % updatedHands.length;
      if (!updatedHands[candidateIndex]?.hasFolded) {
        nextPlayerIndex = candidateIndex;
        break;
      }
    }

    await ctx.db.patch(game._id, {
      currentPlayerIndex: nextPlayerIndex,
      updatedAt: now,
    });

    return {
      ok: true,
      action: "check" as const,
      playerId,
      advanced: false,
      nextPlayerId: updatedHands[nextPlayerIndex]?.playerId ?? null,
    };
  },
});

// CALL mutation - Match the current bet
export const call = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new ConvexError({
        code: "GAME_NOT_FOUND",
        message: "Game does not exist.",
      });
    }

    if (game.status !== "active") {
      throw new ConvexError({
        code: "INVALID_GAME_STATUS",
        message: "Only active games can accept bets.",
      });
    }

    const playerId = args.playerId.trim();
    if (!playerId) {
      throw new ConvexError({
        code: "INVALID_PLAYER_ID",
        message: "Player ID is required.",
      });
    }

    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect();

    if (hands.length === 0) {
      throw new ConvexError({
        code: "HANDS_NOT_FOUND",
        message: "No hands found for this game.",
      });
    }

    const orderedHands = sortHandsByTurnOrder(hands);
    const currentTurnHand = orderedHands[game.currentPlayerIndex];
    if (!currentTurnHand) {
      throw new ConvexError({
        code: "INVALID_TURN_INDEX",
        message: "Current turn index is out of range.",
      });
    }

    if (currentTurnHand.playerId !== playerId) {
      throw new ConvexError({
        code: "NOT_YOUR_TURN",
        message: "It is not your turn.",
      });
    }

    if (currentTurnHand.hasFolded) {
      throw new ConvexError({
        code: "PLAYER_ALREADY_FOLDED",
        message: "You have already folded.",
      });
    }

    const amountToCall = game.currentBet - currentTurnHand.betThisRound;
    if (amountToCall <= 0) {
      throw new ConvexError({
        code: "NOTHING_TO_CALL",
        message: "You have already matched the current bet. Use check instead.",
      });
    }

    if (currentTurnHand.chips < amountToCall) {
      throw new ConvexError({
        code: "INSUFFICIENT_CHIPS",
        message: `You need ${amountToCall} chips to call, but only have ${currentTurnHand.chips}.`,
      });
    }

    const now = Date.now();
    await ctx.db.patch(currentTurnHand._id, {
      chips: currentTurnHand.chips - amountToCall,
      betThisRound: currentTurnHand.betThisRound + amountToCall,
      totalBet: currentTurnHand.totalBet + amountToCall,
      hasActed: true,
      updatedAt: now,
    });

    await ctx.db.patch(game._id, {
      pot: game.pot + amountToCall,
      updatedAt: now,
    });

    const updatedHands = orderedHands.map((hand) =>
      hand._id === currentTurnHand._id
        ? {
            ...hand,
            betThisRound: hand.betThisRound + amountToCall,
            hasActed: true,
          }
        : hand,
    );

    // Check if betting round is complete
    if (isBettingRoundComplete(updatedHands, game.currentBet)) {
      const advanceResult = await autoAdvanceStage(ctx, game._id, game, updatedHands);
      return {
        ok: true,
        action: "call" as const,
        playerId,
        amountCalled: amountToCall,
        ...advanceResult,
      };
    }

    // Move to next player
    let nextPlayerIndex = game.currentPlayerIndex;
    for (let step = 1; step <= updatedHands.length; step++) {
      const candidateIndex = (game.currentPlayerIndex + step) % updatedHands.length;
      if (!updatedHands[candidateIndex]?.hasFolded) {
        nextPlayerIndex = candidateIndex;
        break;
      }
    }

    await ctx.db.patch(game._id, {
      currentPlayerIndex: nextPlayerIndex,
      updatedAt: now,
    });

    return {
      ok: true,
      action: "call" as const,
      playerId,
      amountCalled: amountToCall,
      advanced: false,
      nextPlayerId: updatedHands[nextPlayerIndex]?.playerId ?? null,
    };
  },
});

// RAISE mutation - Increase the bet
export const raise = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.string(),
    raiseToAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new ConvexError({
        code: "GAME_NOT_FOUND",
        message: "Game does not exist.",
      });
    }

    if (game.status !== "active") {
      throw new ConvexError({
        code: "INVALID_GAME_STATUS",
        message: "Only active games can accept bets.",
      });
    }

    const playerId = args.playerId.trim();
    if (!playerId) {
      throw new ConvexError({
        code: "INVALID_PLAYER_ID",
        message: "Player ID is required.",
      });
    }

    const raiseToAmount = Math.floor(args.raiseToAmount);
    if (!Number.isFinite(raiseToAmount) || raiseToAmount <= game.currentBet) {
      throw new ConvexError({
        code: "INVALID_RAISE_AMOUNT",
        message: `Raise amount must be greater than current bet of ${game.currentBet}.`,
      });
    }

    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect();

    if (hands.length === 0) {
      throw new ConvexError({
        code: "HANDS_NOT_FOUND",
        message: "No hands found for this game.",
      });
    }

    const orderedHands = sortHandsByTurnOrder(hands);
    const currentTurnHand = orderedHands[game.currentPlayerIndex];
    if (!currentTurnHand) {
      throw new ConvexError({
        code: "INVALID_TURN_INDEX",
        message: "Current turn index is out of range.",
      });
    }

    if (currentTurnHand.playerId !== playerId) {
      throw new ConvexError({
        code: "NOT_YOUR_TURN",
        message: "It is not your turn.",
      });
    }

    if (currentTurnHand.hasFolded) {
      throw new ConvexError({
        code: "PLAYER_ALREADY_FOLDED",
        message: "You have already folded.",
      });
    }

    const additionalChipsNeeded = raiseToAmount - currentTurnHand.betThisRound;
    if (currentTurnHand.chips < additionalChipsNeeded) {
      throw new ConvexError({
        code: "INSUFFICIENT_CHIPS",
        message: `You need ${additionalChipsNeeded} chips to raise to ${raiseToAmount}, but only have ${currentTurnHand.chips}.`,
      });
    }

    const now = Date.now();
    await ctx.db.patch(currentTurnHand._id, {
      chips: currentTurnHand.chips - additionalChipsNeeded,
      betThisRound: raiseToAmount,
      totalBet: currentTurnHand.totalBet + additionalChipsNeeded,
      hasActed: true,
      updatedAt: now,
    });

    // Reset hasActed for all other active players (raise reopens betting)
    for (const hand of orderedHands) {
      if (hand._id !== currentTurnHand._id && !hand.hasFolded) {
        await ctx.db.patch(hand._id, {
          hasActed: false,
          updatedAt: now,
        });
      }
    }

    // Move to next player
    let nextPlayerIndex = game.currentPlayerIndex;
    for (let step = 1; step <= orderedHands.length; step++) {
      const candidateIndex = (game.currentPlayerIndex + step) % orderedHands.length;
      if (!orderedHands[candidateIndex]?.hasFolded) {
        nextPlayerIndex = candidateIndex;
        break;
      }
    }

    await ctx.db.patch(game._id, {
      pot: game.pot + additionalChipsNeeded,
      currentBet: raiseToAmount,
      currentPlayerIndex: nextPlayerIndex,
      updatedAt: now,
    });

    return {
      ok: true,
      action: "raise" as const,
      playerId,
      raisedTo: raiseToAmount,
      amountAdded: additionalChipsNeeded,
      advanced: false,
      nextPlayerId: orderedHands[nextPlayerIndex]?.playerId ?? null,
    };
  },
});

// FOLD mutation - Give up this hand
export const fold = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new ConvexError({
        code: "GAME_NOT_FOUND",
        message: "Game does not exist.",
      });
    }

    if (game.status !== "active") {
      throw new ConvexError({
        code: "INVALID_GAME_STATUS",
        message: "Only active games can accept folds.",
      });
    }

    const playerId = args.playerId.trim();
    if (!playerId) {
      throw new ConvexError({
        code: "INVALID_PLAYER_ID",
        message: "Player ID is required.",
      });
    }

    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect();

    if (hands.length === 0) {
      throw new ConvexError({
        code: "HANDS_NOT_FOUND",
        message: "No hands found for this game.",
      });
    }

    const orderedHands = sortHandsByTurnOrder(hands);
    const currentTurnHand = orderedHands[game.currentPlayerIndex];
    if (!currentTurnHand) {
      throw new ConvexError({
        code: "INVALID_TURN_INDEX",
        message: "Current turn index is out of range.",
      });
    }

    if (currentTurnHand.playerId !== playerId) {
      throw new ConvexError({
        code: "NOT_YOUR_TURN",
        message: "It is not your turn.",
      });
    }

    if (currentTurnHand.hasFolded) {
      throw new ConvexError({
        code: "PLAYER_ALREADY_FOLDED",
        message: "You have already folded.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(currentTurnHand._id, {
      hasFolded: true,
      hasActed: true,
      updatedAt: now,
    });

    const updatedHands = orderedHands.map((hand) =>
      hand._id === currentTurnHand._id
        ? { ...hand, hasFolded: true, hasActed: true }
        : hand,
    );

    // Check if only one player remains
    const remainingPlayers = updatedHands.filter((h) => !h.hasFolded);
    if (remainingPlayers.length <= 1) {
      await ctx.db.patch(game._id, {
        status: "completed",
        updatedAt: now,
      });
      const roomId = ctx.db.normalizeId("rooms", game.roomId);
      if (roomId) {
        await setRoomUsersActiveGameId(ctx, roomId, undefined);
      }
      return {
        ok: true,
        action: "fold" as const,
        playerId,
        gameOver: true,
        winner: remainingPlayers[0]?.playerId ?? null,
      };
    }

    // Move to next player
    let nextPlayerIndex = game.currentPlayerIndex;
    for (let step = 1; step <= updatedHands.length; step++) {
      const candidateIndex = (game.currentPlayerIndex + step) % updatedHands.length;
      if (!updatedHands[candidateIndex]?.hasFolded) {
        nextPlayerIndex = candidateIndex;
        break;
      }
    }

    await ctx.db.patch(game._id, {
      currentPlayerIndex: nextPlayerIndex,
      updatedAt: now,
    });

    // Check if betting round is complete after fold
    if (isBettingRoundComplete(updatedHands, game.currentBet)) {
      const advanceResult = await autoAdvanceStage(ctx, game._id, game, updatedHands);
      return {
        ok: true,
        action: "fold" as const,
        playerId,
        gameOver: false,
        ...advanceResult,
      };
    }

    return {
      ok: true,
      action: "fold" as const,
      playerId,
      gameOver: false,
      advanced: false,
      nextPlayerId: updatedHands[nextPlayerIndex]?.playerId ?? null,
    };
  },
});

// Word validation via Dictionary API
// Internal mutation for database operations
export const submitWordInternal = internalMutation({
  args: {
    gameId: v.id("games"),
    playerId: v.string(),
    word: v.string(),
    tiles: v.array(
      v.object({
        letter: v.string(),
        baseValue: v.number(),
        source: v.union(v.literal("hand"), v.literal("community")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { gameId, playerId, word, tiles } = args;

    const normalizedWord = word.toLowerCase().trim();
    const normalizedPlayerId = playerId.trim();

    // Get game state
    const game = await ctx.db.get(gameId);
    if (!game) {
      throw new ConvexError({
        code: "GAME_NOT_FOUND",
        message: "Game does not exist.",
      });
    }

    if (game.status !== "active") {
      throw new ConvexError({
        code: "INVALID_GAME_STATUS",
        message: "Game is not active.",
      });
    }

    if (game.stage === "showdown") {
      throw new ConvexError({
        code: "INVALID_GAME_STAGE",
        message: "Word submissions are closed during showdown.",
      });
    }

    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();

    if (hands.length === 0) {
      throw new ConvexError({
        code: "HANDS_NOT_FOUND",
        message: "No hands found for this game.",
      });
    }

    const orderedHands = sortHandsByTurnOrder(hands);
    const currentTurnHand = orderedHands[game.currentPlayerIndex];
    if (!currentTurnHand) {
      throw new ConvexError({
        code: "INVALID_TURN_INDEX",
        message: "Current turn index is out of range.",
      });
    }

    if (currentTurnHand.playerId !== normalizedPlayerId) {
      throw new ConvexError({
        code: "NOT_YOUR_TURN",
        message: "It is not your turn.",
      });
    }

    const playerHand = currentTurnHand;

    if (playerHand.hasFolded) {
      throw new ConvexError({
        code: "PLAYER_FOLDED",
        message: "Cannot submit word after folding.",
      });
    }

    if (playerHand.hasActed) {
      throw new ConvexError({
        code: "PLAYER_ALREADY_ACTED",
        message: "You have already acted this round.",
      });
    }

    const existingSubmission = await ctx.db
      .query("wordSubmissions")
      .withIndex("by_game_player", (q) =>
        q.eq("gameId", gameId).eq("playerId", normalizedPlayerId),
      )
      .filter((q) => q.eq(q.field("stage"), game.stage))
      .unique();

    if (existingSubmission) {
      throw new ConvexError({
        code: "ALREADY_SUBMITTED",
        message: "You have already submitted a word for this stage.",
      });
    }

    // Validate tiles
    const handTileCount = new Map<string, number>();
    for (const tile of playerHand.tiles) {
      const key = `${tile.letter}-${tile.baseValue}`;
      handTileCount.set(key, (handTileCount.get(key) || 0) + 1);
    }

    const communityTileCount = new Map<string, number>();
    for (const tile of game.communityTiles.filter(t => t.revealed)) {
      const key = `${tile.letter}-${tile.baseValue}`;
      communityTileCount.set(key, (communityTileCount.get(key) || 0) + 1);
    }

    const usedHandTiles = new Map<string, number>();
    const usedCommunityTiles = new Map<string, number>();

    for (const tile of tiles) {
      const key = `${tile.letter}-${tile.baseValue}`;

      if (tile.source === "hand") {
        const used = (usedHandTiles.get(key) || 0) + 1;
        const available = handTileCount.get(key) || 0;
        if (used > available) {
          throw new ConvexError({
            code: "INVALID_TILE_USAGE",
            message: `Tile ${tile.letter} not available in hand or used too many times.`,
          });
        }
        usedHandTiles.set(key, used);
      } else {
        const used = (usedCommunityTiles.get(key) || 0) + 1;
        const available = communityTileCount.get(key) || 0;
        if (used > available) {
          throw new ConvexError({
            code: "INVALID_TILE_USAGE",
            message: `Community tile ${tile.letter} not available or used too many times.`,
          });
        }
        usedCommunityTiles.set(key, used);
      }
    }

    // Validate word matches tiles
    const wordLetters = normalizedWord.split("");
    const tileLetters = tiles.map(t => t.letter.toLowerCase());
    if (wordLetters.length !== tileLetters.length) {
      throw new ConvexError({
        code: "WORD_TILE_MISMATCH",
        message: "Word length does not match number of tiles.",
      });
    }

    for (let i = 0; i < wordLetters.length; i++) {
      if (wordLetters[i] !== tileLetters[i]) {
        throw new ConvexError({
          code: "WORD_TILE_MISMATCH",
          message: "Word does not match tile letters.",
        });
      }
    }

    // Calculate score
    const now = Date.now();
    const score = calculateScore(normalizedWord, now, game.updatedAt);

    // Create submission
    await ctx.db.insert("wordSubmissions", {
      gameId,
      playerId: normalizedPlayerId,
      stage: game.stage,
      word: normalizedWord,
      tiles,
      score: score.total,
      scoreBreakdown: {
        lengthPoints: score.lengthPoints,
        speedBonus: score.speedBonus,
        validWordBonus: score.validWordBonus,
      },
      createdAt: now,
    });

    // Update player state - mark as having acted
    await ctx.db.patch(playerHand._id, {
      hasActed: true,
      updatedAt: now,
    });

    return {
      ok: true,
      word: normalizedWord,
      score: score.total,
      scoreBreakdown: score,
      submissionTime: now,
    };
  },
});

// Scoring logic - 3 points per letter as per ticket requirements
function calculateLengthPoints(wordLength: number): number {
  return wordLength * 3;
}

function calculateSpeedBonus(submissionTime: number, stageStartTime: number): number {
  const secondsElapsed = (submissionTime - stageStartTime) / 1000;
  if (secondsElapsed <= 10) return 10;
  if (secondsElapsed <= 20) return 5;
  return 0;
}

function calculateScore(word: string, submissionTime: number, stageStartTime: number) {
  const lengthPoints = calculateLengthPoints(word.length);
  const speedBonus = calculateSpeedBonus(submissionTime, stageStartTime);
  const validWordBonus = 5; // Always 5 since we validate before calling this

  return {
    lengthPoints,
    speedBonus,
    validWordBonus,
    total: lengthPoints + speedBonus + validWordBonus,
  };
}

export const submitWord = action({
  args: {
    gameId: v.id("games"),
    playerId: v.string(),
    word: v.string(),
    tiles: v.array(
      v.object({
        letter: v.string(),
        baseValue: v.number(),
        source: v.union(v.literal("hand"), v.literal("community")),
      })
    ),
  },
  handler: async (ctx, args): Promise<{
    ok: boolean;
    word: string;
    score: number;
    scoreBreakdown: any;
    submissionTime: number;
  }> => {
    const { gameId, playerId, word, tiles } = args;
    const normalizedPlayerId = playerId.trim();

    // Validate word format
    const normalizedWord = word.toLowerCase().trim();
    if (!normalizedPlayerId) {
      throw new ConvexError({
        code: "INVALID_PLAYER_ID",
        message: "Player ID is required.",
      });
    }
    if (normalizedWord.length < 2 || normalizedWord.length > 7) {
      throw new ConvexError({
        code: "INVALID_WORD_LENGTH",
        message: "Word must be between 2 and 7 letters.",
      });
    }

    // Validate word via Free Dictionary API through internal action.
    const validationData = await ctx.runAction(
      internal.validateWord.validateDictionaryWord,
      { word: normalizedWord },
    );
    if (!validationData.valid) {
      throw new ConvexError({
        code: "INVALID_WORD",
        message: `"${normalizedWord}" is not a valid dictionary word.`,
      });
    }

    // Call helper mutation to handle database operations
    return await ctx.runMutation(internal.games.submitWordInternal, {
      gameId,
      playerId: normalizedPlayerId,
      word: normalizedWord,
      tiles,
    });
  },
});
