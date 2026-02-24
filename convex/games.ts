import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
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

    if (!nextStage) {
      await ctx.db.patch(game._id, {
        status: "completed",
        updatedAt: now,
      });
      return {
        ok: true,
        gameId: game._id,
        stage: game.stage,
        status: "completed" as const,
      };
    }

    const nextStatus = nextStage === "showdown" ? "completed" : game.status;
    await ctx.db.patch(game._id, {
      stage: nextStage,
      status: nextStatus,
      updatedAt: now,
    });

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
