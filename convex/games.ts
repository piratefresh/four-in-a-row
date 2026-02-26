import { ConvexError, v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  createInitialGameDocument,
  createShuffledDeck,
  gameDeckTileValidator,
  getNextStage,
  getNewRevealCountForStage,
  INITIAL_HAND_SIZE,
  ANTE_AMOUNT,
  RAISE_LADDER,
  MAX_RAISES_PER_ROUND,
  SPEED_BONUS_TIER_1_SECONDS,
  SPEED_BONUS_TIER_2_SECONDS,
} from "./gameState";
import type { GameStage, GameDeckTile, GameTile } from "./gameState";
import type { Id } from "./_generated/dataModel";

const AI_DEALER_PLAYER_ID = "ai_dealer";
const INITIAL_CHIPS = 1000;

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

    const COMMUNITY_TILES_COUNT = 5;
    const requiredTiles = participantIds.length * INITIAL_HAND_SIZE + COMMUNITY_TILES_COUNT;

    // Always generate a fresh deck with choice cards when starting a game
    const workingDeck = createShuffledDeck();

    // Debug: Log choice card count
    const choiceCards = workingDeck.filter(card => card.kind === "choice");
    console.log(`Deck generated: ${workingDeck.length} total cards, ${choiceCards.length} choice cards`);

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

    // Create community tiles (all unrevealed initially)
    const communityTiles = [];
    for (let i = 0; i < COMMUNITY_TILES_COUNT; i++) {
      const card = workingDeck.splice(0, 1)[0];
      if (!card) {
        throw new ConvexError({
          code: "DECK_EXHAUSTED",
          message: "Deck ran out of cards during community tile creation.",
        });
      }

      if (card.kind === "single") {
        communityTiles.push({
          kind: "single" as const,
          letter: card.letter,
          baseValue: card.baseValue,
          revealed: false,
          // Optional: Add multipliers to some tiles
          // multiplier: i === 2 ? "2L" as const : i === 4 ? "3L" as const : undefined,
        });
      } else {
        // Choice card
        communityTiles.push({
          kind: "choice" as const,
          options: card.options,
          baseValues: card.baseValues,
          revealed: false,
          // Optional: Add multipliers to some tiles
          // multiplier: i === 2 ? "2L" as const : i === 4 ? "3L" as const : undefined,
        });
      }
    }

    const now = Date.now();
    const totalAnte = ANTE_AMOUNT * participantIds.length;

    for (const participantId of participantIds) {
      const tiles = workingDeck.splice(0, INITIAL_HAND_SIZE);

      // Validate player has sufficient chips for ante
      if (INITIAL_CHIPS < ANTE_AMOUNT) {
        throw new ConvexError({
          code: "INSUFFICIENT_CHIPS_FOR_ANTE",
          message: `Players must have at least ${ANTE_AMOUNT} chips to play.`,
        });
      }

      await ctx.db.insert("playerHands", {
        gameId: game._id,
        playerId: participantId,
        tiles,
        chips: INITIAL_CHIPS - ANTE_AMOUNT,
        betThisRound: 0,
        totalBet: ANTE_AMOUNT,
        hasActed: false,
        hasFolded: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(game._id, {
      status: "active",
      communityTiles,
      deck: workingDeck,
      pot: totalAnte,
      currentBet: 0,
      currentPlayerIndex: 0,
      raisesThisRound: 0,
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

// Internal mutation for auto-starting game (called by scheduler)
export const internalStartGame = internalMutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.status !== "waiting") {
      // Game already started or doesn't exist, silently return
      return { ok: false, reason: "Game not in waiting state" };
    }

    const roomId = game.roomId as Id<"rooms">;
    const room = await ctx.db.get(roomId);
    if (!room) {
      return { ok: false, reason: "Room not found" };
    }

    const activePlayers = await ctx.db
      .query("players")
      .withIndex("roomId_status", (q) =>
        q.eq("roomId", room._id).eq("status", "active"),
      )
      .collect();

    if (activePlayers.length < 1) {
      return { ok: false, reason: "Not enough players" };
    }

    activePlayers.sort((a, b) => a.seatIndex - b.seatIndex);
    const participantIds = activePlayers.map((player) => player._id as string);
    if (participantIds.length === 1) {
      participantIds.push(AI_DEALER_PLAYER_ID);
    }

    const COMMUNITY_TILES_COUNT = 5;
    const requiredTiles = participantIds.length * INITIAL_HAND_SIZE + COMMUNITY_TILES_COUNT;

    const workingDeck = createShuffledDeck();

    if (workingDeck.length < requiredTiles) {
      return { ok: false, reason: "Deck exhausted" };
    }

    const existingHands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect();

    for (const hand of existingHands) {
      await ctx.db.delete(hand._id);
    }

    // Create community tiles (all unrevealed initially)
    const communityTiles = [];
    for (let i = 0; i < COMMUNITY_TILES_COUNT; i++) {
      const card = workingDeck.splice(0, 1)[0];
      if (!card) {
        return { ok: false, reason: "Deck exhausted during community tile creation" };
      }

      if (card.kind === "single") {
        communityTiles.push({
          kind: "single" as const,
          letter: card.letter,
          baseValue: card.baseValue,
          revealed: false,
        });
      } else {
        communityTiles.push({
          kind: "choice" as const,
          options: card.options,
          baseValues: card.baseValues,
          revealed: false,
        });
      }
    }

    const now = Date.now();
    const totalAnte = ANTE_AMOUNT * participantIds.length;

    for (const participantId of participantIds) {
      const tiles = workingDeck.splice(0, INITIAL_HAND_SIZE);

      await ctx.db.insert("playerHands", {
        gameId: game._id,
        playerId: participantId,
        tiles,
        chips: INITIAL_CHIPS - ANTE_AMOUNT,
        betThisRound: 0,
        totalBet: ANTE_AMOUNT,
        hasActed: false,
        hasFolded: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(game._id, {
      status: "active",
      communityTiles,
      deck: workingDeck,
      pot: totalAnte,
      currentBet: 0,
      currentPlayerIndex: 0,
      raisesThisRound: 0,
      updatedAt: now,
    });
    await setRoomUsersActiveGameId(ctx, room._id, String(game._id));

    return { ok: true };
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

    if (game.stage === "final" || game.stage === "showdown") {
      throw new ConvexError({
        code: "BETTING_NOT_ALLOWED",
        message: `Betting is not allowed during ${game.stage}.`,
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

    const updatedHands = orderedHands.map((hand) => ({
      _id: hand._id,
      playerId: hand.playerId,
      hasFolded: hand.hasFolded,
      hasActed: hand._id === currentTurnHand._id ? true : hand.hasActed,
      betThisRound: hand.betThisRound,
      chips: hand.chips,
      totalBet: hand.totalBet,
    }));

    // Handle turn and stage progression
    await handlePostActionProgression(ctx, game as any, updatedHands);

    return {
      ok: true,
      action: "check" as const,
      playerId,
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

    if (game.stage === "final" || game.stage === "showdown") {
      throw new ConvexError({
        code: "BETTING_NOT_ALLOWED",
        message: `Betting is not allowed during ${game.stage}.`,
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

    const updatedHands = orderedHands.map((hand) => ({
      _id: hand._id,
      playerId: hand.playerId,
      hasFolded: hand.hasFolded,
      hasActed: hand._id === currentTurnHand._id ? true : hand.hasActed,
      betThisRound: hand._id === currentTurnHand._id ? hand.betThisRound + amountToCall : hand.betThisRound,
      chips: hand._id === currentTurnHand._id ? hand.chips - amountToCall : hand.chips,
      totalBet: hand._id === currentTurnHand._id ? hand.totalBet + amountToCall : hand.totalBet,
    }));

    // Handle turn and stage progression
    await handlePostActionProgression(ctx, game as any, updatedHands);

    return {
      ok: true,
      action: "call" as const,
      playerId,
      amountCalled: amountToCall,
      chipsAfterCall: currentTurnHand.chips - amountToCall,
      betAfterCall: currentTurnHand.betThisRound + amountToCall,
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

    if (game.stage === "final" || game.stage === "showdown") {
      throw new ConvexError({
        code: "BETTING_NOT_ALLOWED",
        message: `Betting is not allowed during ${game.stage}.`,
      });
    }

    const playerId = args.playerId.trim();
    if (!playerId) {
      throw new ConvexError({
        code: "INVALID_PLAYER_ID",
        message: "Player ID is required.",
      });
    }

    // Check raise cap
    const raisesThisRound = game.raisesThisRound ?? 0;
    if (raisesThisRound >= MAX_RAISES_PER_ROUND) {
      throw new ConvexError({
        code: "RAISE_CAP_REACHED",
        message: `Maximum ${MAX_RAISES_PER_ROUND} raises per betting round reached.`,
      });
    }

    const raiseToAmount = Math.floor(args.raiseToAmount);
    if (!Number.isFinite(raiseToAmount) || raiseToAmount <= game.currentBet) {
      throw new ConvexError({
        code: "INVALID_RAISE_AMOUNT",
        message: `Raise amount must be greater than current bet of ${game.currentBet}.`,
      });
    }

    // Enforce fixed raise ladder (must raise to the next ladder level only)
    const nextRaiseLevel = RAISE_LADDER.find((amount) => amount > game.currentBet);
    if (nextRaiseLevel === undefined) {
      throw new ConvexError({
        code: "RAISE_CAP_REACHED",
        message: "Maximum raise level reached.",
      });
    }

    if (raiseToAmount !== nextRaiseLevel) {
      throw new ConvexError({
        code: "INVALID_RAISE_AMOUNT",
        message: `Raise amount must be the next ladder level: ${nextRaiseLevel}.`,
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

    await ctx.db.patch(game._id, {
      pot: game.pot + additionalChipsNeeded,
      currentBet: raiseToAmount,
      raisesThisRound: raisesThisRound + 1,
      updatedAt: now,
    });

    // Build updated hands state for progression logic (raise reopens betting so others have hasActed=false)
    const updatedHands = orderedHands.map((hand) => ({
      _id: hand._id,
      playerId: hand.playerId,
      hasFolded: hand.hasFolded,
      hasActed: hand._id === currentTurnHand._id ? true : false, // Only raiser has acted
      betThisRound: hand._id === currentTurnHand._id ? raiseToAmount : hand.betThisRound,
      chips: hand._id === currentTurnHand._id ? hand.chips - additionalChipsNeeded : hand.chips,
      totalBet: hand._id === currentTurnHand._id ? hand.totalBet + additionalChipsNeeded : hand.totalBet,
    }));

    // Handle turn advancement (stage won't advance because not everyone has acted after raise)
    await advanceTurn(ctx, game as any, updatedHands);

    return {
      ok: true,
      action: "raise" as const,
      playerId,
      raisedTo: raiseToAmount,
      amountAdded: additionalChipsNeeded,
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

    if (game.stage === "final" || game.stage === "showdown") {
      throw new ConvexError({
        code: "BETTING_NOT_ALLOWED",
        message: `Folding is not allowed during ${game.stage}.`,
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

    const updatedHands = orderedHands.map((hand) => ({
      _id: hand._id,
      playerId: hand.playerId,
      hasFolded: hand._id === currentTurnHand._id ? true : hand.hasFolded,
      hasActed: hand._id === currentTurnHand._id ? true : hand.hasActed,
      betThisRound: hand.betThisRound,
      chips: hand.chips,
      totalBet: hand.totalBet,
    }));

    // Handle turn and stage progression
    await handlePostActionProgression(ctx, game as any, updatedHands);

    return {
      ok: true,
      action: "fold" as const,
      playerId,
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
        cardIndex: v.optional(v.number()),
        wasChoice: v.optional(v.boolean()),
      })
    ),
    choiceResolutions: v.optional(
      v.object({
        hand: v.optional(v.record(v.string(), v.string())),
        community: v.optional(v.record(v.string(), v.string())),
      })
    ),
    invalidWord: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { gameId, playerId, word, tiles, choiceResolutions, invalidWord } = args;

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

    if (game.stage !== "showdown") {
      throw new ConvexError({
        code: "INVALID_GAME_STAGE",
        message: "Word submissions are only allowed during showdown.",
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

    // During showdown, find the player's hand (no turn order needed)
    const playerHand = hands.find(h => h.playerId === normalizedPlayerId);
    if (!playerHand) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "Player not found in this game.",
      });
    }

    if (playerHand.hasFolded) {
      throw new ConvexError({
        code: "PLAYER_FOLDED",
        message: "Cannot submit word after folding.",
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
        message: "You have already submitted a word for showdown.",
      });
    }

    // Validate tiles
    const handTileCount = new Map<string, number>();
    for (const tile of playerHand.tiles) {
      if (tile.kind === "single") {
        const key = `${tile.letter}-${tile.baseValue}`;
        handTileCount.set(key, (handTileCount.get(key) || 0) + 1);
      } else {
        // For choice cards, we'll use the card index for tracking
        const key = `choice-${playerHand.tiles.indexOf(tile)}`;
        handTileCount.set(key, 1);
      }
    }

    const communityTileCount = new Map<string, number>();
    game.communityTiles
      .filter((t: GameTile) => t.revealed)
      .forEach((tile: GameTile, index: number) => {
        if (tile.kind === "single") {
          const key = `${tile.letter}-${tile.baseValue}`;
          communityTileCount.set(key, (communityTileCount.get(key) || 0) + 1);
        } else {
          // For choice cards, use the card index
          const key = `choice-${index}`;
          communityTileCount.set(key, 1);
        }
      });

    const usedHandTiles = new Map<string, number>();
    const usedCommunityTiles = new Map<string, number>();

    for (const tile of tiles) {
      // For choice cards, use cardIndex; for single cards, use letter-baseValue
      const key = tile.wasChoice && tile.cardIndex !== undefined
        ? `choice-${tile.cardIndex}`
        : `${tile.letter}-${tile.baseValue}`;

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

    // Calculate score (0 for invalid words)
    const now = Date.now();
    const showdownStart = game.showdownStartedAt ?? game.updatedAt;
    const score = invalidWord
      ? { total: 0, lengthPoints: 0, speedBonus: 0, validWordBonus: 0 }
      : calculateScore(normalizedWord, now, showdownStart);

    // Create submission
    await ctx.db.insert("wordSubmissions", {
      gameId,
      playerId: normalizedPlayerId,
      stage: game.stage,
      word: normalizedWord,
      tiles,
      choiceResolutions,
      score: score.total,
      scoreBreakdown: {
        lengthPoints: score.lengthPoints,
        speedBonus: score.speedBonus,
        validWordBonus: score.validWordBonus,
      },
      createdAt: now,
    });

    // Auto-resolve showdown when all non-folded players have submitted.
    const eligiblePlayerIds = hands
      .filter((hand) => !hand.hasFolded)
      .map((hand) => hand.playerId);

    if (eligiblePlayerIds.length === 0) {
      await ctx.db.patch(game._id, {
        status: "completed",
        updatedAt: now,
      });
    } else {
      const allSubmissions = await ctx.db
        .query("wordSubmissions")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .collect();

      const submissionsByPlayer = new Map<string, typeof allSubmissions[0]>();
      for (const submission of allSubmissions) {
        if (!eligiblePlayerIds.includes(submission.playerId)) continue;
        const existing = submissionsByPlayer.get(submission.playerId);
        if (!existing || submission.createdAt > existing.createdAt) {
          submissionsByPlayer.set(submission.playerId, submission);
        }
      }

      const allEligibleSubmitted = eligiblePlayerIds.every((playerId) =>
        submissionsByPlayer.has(playerId),
      );

      if (allEligibleSubmitted && !game.winnerId) {
        const eligibleSubmissions = Array.from(submissionsByPlayer.values());
        const sortedSubmissions = [...eligibleSubmissions].sort((a, b) => {
          if (a.score !== b.score) {
            return b.score - a.score;
          }
          if (a.scoreBreakdown.lengthPoints !== b.scoreBreakdown.lengthPoints) {
            return b.scoreBreakdown.lengthPoints - a.scoreBreakdown.lengthPoints;
          }
          if (a.createdAt !== b.createdAt) {
            return a.createdAt - b.createdAt;
          }
          return a.playerId.localeCompare(b.playerId);
        });

        const winningSubmission = sortedSubmissions[0];
        await ctx.db.patch(game._id, {
          winnerId: winningSubmission.playerId,
          winningWord: winningSubmission.word,
          winningScore: winningSubmission.score,
          winningScoreBreakdown: winningSubmission.scoreBreakdown,
          status: "completed",
          updatedAt: now,
        });
      }
    }

    // During showdown, no turn progression - just return success
    return {
      ok: !invalidWord,
      word: normalizedWord,
      score: score.total,
      scoreBreakdown: score,
      submissionTime: now,
      forfeited: invalidWord,
      message: invalidWord
        ? `"${normalizedWord}" is not a valid dictionary word. Submitted with 0 points.`
        : undefined,
    };
  },
});

export const forfeitShowdown = mutation({
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

    if (game.status !== "active" || game.stage !== "showdown") {
      throw new ConvexError({
        code: "INVALID_GAME_STAGE",
        message: "Forfeit is only allowed during active showdown.",
      });
    }

    const normalizedPlayerId = args.playerId.trim();
    if (!normalizedPlayerId) {
      throw new ConvexError({
        code: "INVALID_PLAYER_ID",
        message: "Player ID is required.",
      });
    }

    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const playerHand = hands.find((hand) => hand.playerId === normalizedPlayerId);
    if (!playerHand) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "Player not found in this game.",
      });
    }

    const now = Date.now();
    if (!playerHand.hasFolded) {
      await ctx.db.patch(playerHand._id, {
        hasFolded: true,
        hasActed: true,
        updatedAt: now,
      });
    }

    // Recompute state after forfeit and resolve showdown if possible.
    const latestHands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const eligiblePlayerIds = latestHands
      .filter((hand) => !hand.hasFolded)
      .map((hand) => hand.playerId);

    const allSubmissions = await ctx.db
      .query("wordSubmissions")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const submissionsByPlayer = new Map<string, typeof allSubmissions[0]>();
    for (const submission of allSubmissions) {
      if (!eligiblePlayerIds.includes(submission.playerId)) continue;
      const existing = submissionsByPlayer.get(submission.playerId);
      if (!existing || submission.createdAt > existing.createdAt) {
        submissionsByPlayer.set(submission.playerId, submission);
      }
    }

    if (eligiblePlayerIds.length === 0) {
      await ctx.db.patch(game._id, {
        status: "completed",
        updatedAt: now,
      });
      return { ok: true, forfeited: true, resolved: true, hasWinner: false };
    }

    if (eligiblePlayerIds.length === 1) {
      const winnerId = eligiblePlayerIds[0];
      const winnerSubmission = submissionsByPlayer.get(winnerId);
      await ctx.db.patch(game._id, {
        winnerId,
        winningWord: winnerSubmission?.word,
        winningScore: winnerSubmission?.score,
        winningScoreBreakdown: winnerSubmission?.scoreBreakdown,
        status: "completed",
        updatedAt: now,
      });
      return { ok: true, forfeited: true, resolved: true, hasWinner: true, winnerId };
    }

    const allEligibleSubmitted = eligiblePlayerIds.every((playerId) =>
      submissionsByPlayer.has(playerId),
    );

    if (!allEligibleSubmitted) {
      return { ok: true, forfeited: true, resolved: false, hasWinner: false };
    }

    const sortedSubmissions = [...submissionsByPlayer.values()].sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      if (a.scoreBreakdown.lengthPoints !== b.scoreBreakdown.lengthPoints) {
        return b.scoreBreakdown.lengthPoints - a.scoreBreakdown.lengthPoints;
      }
      if (a.createdAt !== b.createdAt) {
        return a.createdAt - b.createdAt;
      }
      return a.playerId.localeCompare(b.playerId);
    });

    const winningSubmission = sortedSubmissions[0];
    await ctx.db.patch(game._id, {
      winnerId: winningSubmission.playerId,
      winningWord: winningSubmission.word,
      winningScore: winningSubmission.score,
      winningScoreBreakdown: winningSubmission.scoreBreakdown,
      status: "completed",
      updatedAt: now,
    });

    return {
      ok: true,
      forfeited: true,
      resolved: true,
      hasWinner: true,
      winnerId: winningSubmission.playerId,
    };
  },
});

// Scoring logic - 3 points per letter as per ticket requirements
function calculateLengthPoints(wordLength: number): number {
  return wordLength * 3;
}

function calculateSpeedBonus(submissionTime: number, showdownStartTime: number): number {
  const secondsElapsed = (submissionTime - showdownStartTime) / 1000;
  if (secondsElapsed <= SPEED_BONUS_TIER_1_SECONDS) return 10;
  if (secondsElapsed <= SPEED_BONUS_TIER_2_SECONDS) return 5;
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
        cardIndex: v.optional(v.number()),
        wasChoice: v.optional(v.boolean()),
      })
    ),
    choiceResolutions: v.optional(
      v.object({
        hand: v.optional(v.record(v.string(), v.string())),
        community: v.optional(v.record(v.string(), v.string())),
      })
    ),
  },
  handler: async (ctx, args): Promise<{
    ok: boolean;
    word: string;
    score: number;
    scoreBreakdown: any;
    submissionTime: number;
    forfeited?: boolean;
    message?: string;
  }> => {
    const { gameId, playerId, word, tiles, choiceResolutions } = args;
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
      // Submit invalid word with score of 0 instead of forfeiting
      // This allows players to see all submissions before game ends
      return await ctx.runMutation(internal.games.submitWordInternal, {
        gameId,
        playerId: normalizedPlayerId,
        word: normalizedWord,
        tiles,
        choiceResolutions,
        invalidWord: true, // Mark as invalid but still submit
      });
    }

    // Call helper mutation to handle database operations
    return await ctx.runMutation(internal.games.submitWordInternal, {
      gameId,
      playerId: normalizedPlayerId,
      word: normalizedWord,
      tiles,
      choiceResolutions,
    });
  },
});

// ===== Showdown and Winner Resolution =====

export const resolveShowdown = mutation({
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

    if (game.stage !== "showdown") {
      throw new ConvexError({
        code: "INVALID_GAME_STAGE",
        message: "Game must be in showdown stage to resolve winner.",
      });
    }

    if (game.winnerId) {
      throw new ConvexError({
        code: "WINNER_ALREADY_DETERMINED",
        message: "Winner has already been determined for this game.",
      });
    }

    // Get all player hands to determine who's eligible (not folded)
    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const eligiblePlayerIds = hands
      .filter(h => !h.hasFolded)
      .map(h => h.playerId);

    if (eligiblePlayerIds.length === 0) {
      // No eligible players - no winner case
      await ctx.db.patch(game._id, {
        status: "completed",
        updatedAt: Date.now(),
      });
      return {
        ok: true,
        hasWinner: false,
        message: "No eligible players for showdown.",
      };
    }

    // Get final submissions for eligible players (last submission per player)
    const allSubmissions = await ctx.db
      .query("wordSubmissions")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Group submissions by player and take the latest one
    const submissionsByPlayer = new Map<string, typeof allSubmissions[0]>();
    for (const submission of allSubmissions) {
      if (!eligiblePlayerIds.includes(submission.playerId)) continue;

      const existing = submissionsByPlayer.get(submission.playerId);
      if (!existing || submission.createdAt > existing.createdAt) {
        submissionsByPlayer.set(submission.playerId, submission);
      }
    }

    const eligibleSubmissions = Array.from(submissionsByPlayer.values());

    if (eligibleSubmissions.length === 0) {
      // No submissions - no winner case
      await ctx.db.patch(game._id, {
        status: "completed",
        updatedAt: Date.now(),
      });
      return {
        ok: true,
        hasWinner: false,
        message: "No valid submissions for showdown.",
      };
    }

    // Sort submissions to find winner
    // Tie-break rules:
    // 1. Highest total score
    // 2. Higher word length points
    // 3. Faster submission time (earlier createdAt)
    // 4. Deterministic fallback (alphabetical by playerId)
    const sortedSubmissions = [...eligibleSubmissions].sort((a, b) => {
      // 1. Highest total score wins
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      // 2. Higher word length points
      if (a.scoreBreakdown.lengthPoints !== b.scoreBreakdown.lengthPoints) {
        return b.scoreBreakdown.lengthPoints - a.scoreBreakdown.lengthPoints;
      }

      // 3. Faster submission time (earlier timestamp wins)
      if (a.createdAt !== b.createdAt) {
        return a.createdAt - b.createdAt;
      }

      // 4. Deterministic fallback
      return a.playerId.localeCompare(b.playerId);
    });

    const winningSubmission = sortedSubmissions[0];

    // Persist winner to game
    const now = Date.now();
    await ctx.db.patch(game._id, {
      winnerId: winningSubmission.playerId,
      winningWord: winningSubmission.word,
      winningScore: winningSubmission.score,
      winningScoreBreakdown: winningSubmission.scoreBreakdown,
      status: "completed",
      updatedAt: now,
    });

    return {
      ok: true,
      hasWinner: true,
      winnerId: winningSubmission.playerId,
      winningWord: winningSubmission.word,
      winningScore: winningSubmission.score,
      winningScoreBreakdown: winningSubmission.scoreBreakdown,
      allSubmissions: sortedSubmissions.map(s => ({
        playerId: s.playerId,
        word: s.word,
        score: s.score,
        scoreBreakdown: s.scoreBreakdown,
      })),
    };
  },
});

export const getWordSubmissions = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      return null;
    }

    if (game.stage !== "showdown") {
      return null;
    }

    // Get all submissions
    const allSubmissions = await ctx.db
      .query("wordSubmissions")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Get player hands to know who folded
    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const eligiblePlayerIds = hands
      .filter(h => !h.hasFolded)
      .map(h => h.playerId);

    // Group submissions by player and take the latest one
    const submissionsByPlayer = new Map<string, typeof allSubmissions[0]>();
    for (const submission of allSubmissions) {
      if (!eligiblePlayerIds.includes(submission.playerId)) continue;

      const existing = submissionsByPlayer.get(submission.playerId);
      if (!existing || submission.createdAt > existing.createdAt) {
        submissionsByPlayer.set(submission.playerId, submission);
      }
    }

    const eligibleSubmissions = Array.from(submissionsByPlayer.values());

    return {
      submissions: eligibleSubmissions
        .sort((a, b) => b.score - a.score)
        .map(s => ({
          playerId: s.playerId,
          word: s.word,
          tiles: s.tiles,
          choiceResolutions: s.choiceResolutions,
          score: s.score,
          scoreBreakdown: s.scoreBreakdown,
        })),
      isCompleted: game.status === "completed",
      winnerId: game.winnerId,
    };
  },
});

export const getShowdownResults = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      return null;
    }

    if (game.stage !== "showdown" || game.status !== "completed") {
      return null;
    }

    // Get all submissions
    const allSubmissions = await ctx.db
      .query("wordSubmissions")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Get player hands to know who folded
    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Group submissions by player and take the latest one
    const submissionsByPlayer = new Map<string, typeof allSubmissions[0]>();
    for (const submission of allSubmissions) {
      const existing = submissionsByPlayer.get(submission.playerId);
      if (!existing || submission.createdAt > existing.createdAt) {
        submissionsByPlayer.set(submission.playerId, submission);
      }
    }

    // Create results for all players including forfeited/folded players
    const allPlayerResults = hands.map(hand => {
      const submission = submissionsByPlayer.get(hand.playerId);

      if (hand.hasFolded && !submission) {
        // Player forfeited/folded without submitting
        return {
          playerId: hand.playerId,
          word: null,
          score: 0,
          scoreBreakdown: null,
          status: "forfeited" as const,
        };
      } else if (submission) {
        // Player submitted a word
        return {
          playerId: submission.playerId,
          word: submission.word,
          score: submission.score,
          scoreBreakdown: submission.scoreBreakdown,
          status: "submitted" as const,
        };
      } else {
        // Player didn't submit (shouldn't happen, but handle it)
        return {
          playerId: hand.playerId,
          word: null,
          score: 0,
          scoreBreakdown: null,
          status: "no-submission" as const,
        };
      }
    });

    return {
      hasWinner: !!game.winnerId,
      winnerId: game.winnerId,
      winningWord: game.winningWord,
      winningScore: game.winningScore,
      winningScoreBreakdown: game.winningScoreBreakdown,
      allSubmissions: allPlayerResults.sort((a, b) => b.score - a.score),
    };
  },
});

// ===== Turn and Stage Advancement Helpers =====

type PlayerHand = {
  _id: Id<"playerHands">;
  playerId: string;
  hasFolded: boolean;
  hasActed: boolean;
  betThisRound: number;
  chips: number;
  totalBet: number;
};

/**
 * Advances turn to the next non-folded player
 * Returns the new player index
 */
async function advanceTurn(
  ctx: MutationCtx,
  game: { _id: Id<"games">; currentPlayerIndex: number },
  orderedHands: PlayerHand[],
): Promise<number> {
  let nextPlayerIndex = game.currentPlayerIndex;

  for (let step = 1; step <= orderedHands.length; step++) {
    const candidateIndex = (game.currentPlayerIndex + step) % orderedHands.length;
    if (!orderedHands[candidateIndex]?.hasFolded) {
      nextPlayerIndex = candidateIndex;
      break;
    }
  }

  await ctx.db.patch(game._id, {
    currentPlayerIndex: nextPlayerIndex,
    updatedAt: Date.now(),
  });

  return nextPlayerIndex;
}

/**
 * Checks if all active (non-folded) players have acted this stage
 */
function allActivePlayersHaveActed(hands: PlayerHand[]): boolean {
  const activePlayers = hands.filter(h => !h.hasFolded);
  return activePlayers.length > 0 && activePlayers.every(h => h.hasActed);
}

/**
 * Checks if only one player remains active (all others folded)
 */
function onlyOnePlayerRemains(hands: PlayerHand[]): boolean {
  const activePlayers = hands.filter(h => !h.hasFolded);
  return activePlayers.length === 1;
}

/**
 * Advances to the next stage and reveals community tiles
 * Resets hasActed flags for all active players
 * Returns true if stage was advanced, false if game should end
 */
async function advanceStage(
  ctx: MutationCtx,
  game: {
    _id: Id<"games">;
    stage: GameStage;
    communityTiles: GameTile[];
    deck: GameDeckTile[];
    currentBet: number;
    raisesThisRound?: number;
  },
  orderedHands: PlayerHand[],
): Promise<boolean> {
  const nextStage = getNextStage(game.stage);

  if (!nextStage) {
    // No next stage - game should end
    return false;
  }

  const now = Date.now();

  // For final stage, skip betting - mark all players as having acted
  const skipBetting = nextStage === "final";

  // Reset hasActed for all active players (or mark as acted for final stage)
  for (const hand of orderedHands) {
    if (!hand.hasFolded) {
      await ctx.db.patch(hand._id, {
        hasActed: skipBetting ? true : false,
        betThisRound: 0,
        updatedAt: now,
      });
    }
  }

  // Reveal community tiles for new stage
  const revealCount = getNewRevealCountForStage(nextStage);
  const updatedCommunityTiles = [...game.communityTiles];
  let revealedSoFar = 0;

  for (let i = 0; i < updatedCommunityTiles.length && revealedSoFar < revealCount; i++) {
    if (!updatedCommunityTiles[i].revealed) {
      updatedCommunityTiles[i] = { ...updatedCommunityTiles[i], revealed: true };
      revealedSoFar++;
    }
  }

  // Final has no betting round; reveal tile and move straight to showdown.
  const targetStage = nextStage === "final" ? "showdown" : nextStage;

  // Update game to new stage
  const updateData: any = {
    stage: targetStage,
    communityTiles: updatedCommunityTiles,
    currentBet: 0,
    currentPlayerIndex: 0, // Reset to first player
    raisesThisRound: 0, // Reset raise counter for new betting round
    updatedAt: now,
  };

  // Set showdown start time when entering showdown stage
  if (targetStage === "showdown") {
    updateData.showdownStartedAt = now;
  }

  await ctx.db.patch(game._id, updateData);

  return true;
}

/**
 * Handles post-action progression: advances turn and potentially stage
 * Call this after any player action (submit word, fold, check, call, raise)
 */
async function handlePostActionProgression(
  ctx: MutationCtx,
  game: {
    _id: Id<"games">;
    stage: GameStage;
    currentPlayerIndex: number;
    communityTiles: GameTile[];
    deck: GameDeckTile[];
    currentBet: number;
    raisesThisRound?: number;
    status: string;
  },
  orderedHands: PlayerHand[],
): Promise<void> {
  const now = Date.now();

  // Check if only one player remains (early end)
  if (onlyOnePlayerRemains(orderedHands)) {
    const winner = orderedHands.find(h => !h.hasFolded);

    if (winner) {
      // Award the pot to the winner by default (no word comparison needed)
      await ctx.db.patch(game._id, {
        stage: "showdown",
        status: "completed",
        winnerId: winner.playerId,
        winningWord: undefined, // No word needed - won by default
        winningScore: undefined,
        winningScoreBreakdown: undefined,
        updatedAt: now,
      });
    } else {
      // Shouldn't happen, but handle gracefully
      await ctx.db.patch(game._id, {
        stage: "showdown",
        status: "completed",
        updatedAt: now,
      });
    }
    return;
  }

  // Check if all active players have acted
  if (allActivePlayersHaveActed(orderedHands)) {
    // Advance to next stage
    const advanced = await advanceStage(ctx, game, orderedHands);

    if (!advanced) {
      // No next stage, game is complete
      await ctx.db.patch(game._id, {
        status: "completed",
        updatedAt: now,
      });
    }
  } else {
    // Not everyone has acted, just advance turn
    await advanceTurn(ctx, game, orderedHands);
  }
}
