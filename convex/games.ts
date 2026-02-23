import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  createInitialGameDocument,
  createShuffledDeck,
  gameDeckTileValidator,
  getNextStage,
  INITIAL_HAND_SIZE,
} from "./gameState";
import type { Id } from "./_generated/dataModel";

const AI_DEALER_PLAYER_ID = "ai_dealer";

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
        bet: 0,
        hasActed: false,
        hasFolded: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(game._id, {
      status: "active",
      deck: workingDeck,
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
