import { mutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getAuthenticatedUserId, getRoomByCode } from "../helpers";
import { addDevBotsToRoom, rejoinRoomMember } from "../players";
import { normalizeName } from "../helpers";
import { PLAYER_NAME_MAX_LENGTH } from "../../constants";
import { createOpenRoom } from "../lifecycle";
import { AI_DIFFICULTY, type AIDifficulty } from "../../aiBettingConstants";
import { economyModeValidator, roomConfigValidator, DEFAULT_BUY_IN } from "../../gameConfig";

const IS_E2E = process.env.E2E_TESTING === "true";
const E2E_USER_ID = "e2e-test-user";

export const debugRejoinRoom = mutation({
  args: { code: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await rejoinRoomMember(ctx, { ...args, defaultName: "Dev Player" });
  },
});

export const debugFillRoomWithBots = mutation({
  args: { code: v.string(), count: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "Authentication required." });
    }

    const room = await getRoomByCode(ctx, args.code);
    const result = await addDevBotsToRoom(ctx, room, args.count ?? 2);

    const existingGame = await ctx.db
      .query("games")
      .withIndex("by_room", (q) => q.eq("roomId", String(room._id)))
      .first();
    if (existingGame) {
      await ctx.scheduler.runAfter(0, internal.games.internalRedealGameForRoom, {
        roomId: room._id,
      });
    }

    return {
      added: result.added,
      totalActivePlayers: result.totalActivePlayers,
      redealtGame: !!existingGame,
    };
  },
});

export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    const allHands = await ctx.db.query("playerHands").collect();
    for (const hand of allHands) {
      await ctx.db.delete(hand._id);
    }

    const allWordSubmissions = await ctx.db.query("wordSubmissions").collect();
    for (const submission of allWordSubmissions) {
      await ctx.db.delete(submission._id);
    }

    const allGames = await ctx.db.query("games").collect();
    for (const game of allGames) {
      await ctx.db.delete(game._id);
    }

    const allMessages = await ctx.db.query("messages").collect();
    for (const message of allMessages) {
      await ctx.db.delete(message._id);
    }

    const allPlayers = await ctx.db.query("players").collect();
    for (const player of allPlayers) {
      await ctx.db.delete(player._id);
    }

    const allRooms = await ctx.db.query("rooms").collect();
    for (const room of allRooms) {
      await ctx.db.delete(room._id);
    }

    return {
      ok: true,
      deleted: {
        playerHands: allHands.length,
        wordSubmissions: allWordSubmissions.length,
        games: allGames.length,
        messages: allMessages.length,
        players: allPlayers.length,
        rooms: allRooms.length,
      },
    };
  },
});

export const e2eCreateTestRoom = mutation({
  args: {
    playerName: v.string(),
    botCount: v.optional(v.number()),
    roomTitle: v.optional(v.string()),
    difficulty: v.optional(v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    )),
    isBotGame: v.optional(v.boolean()),
    config: v.optional(roomConfigValidator),
    economyMode: v.optional(economyModeValidator),
    buyIn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!IS_E2E) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "e2eCreateTestRoom is only available in E2E testing mode.",
      });
    }

    const authUserId = E2E_USER_ID;

    const name = normalizeName(args.playerName);
    if (name.length === 0 || name.length > PLAYER_NAME_MAX_LENGTH) {
      throw new ConvexError({
        code: "INVALID_NAME",
        message: `Name must be between 1 and ${PLAYER_NAME_MAX_LENGTH} characters.`,
      });
    }

    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("authUserId_status", (q) => q.eq("authUserId", authUserId).eq("status", "active"))
      .first();
    if (existingPlayer) {
      await ctx.db.patch(existingPlayer._id, { status: "left" });
    }

    const { roomId, code, now } = await createOpenRoom(ctx, {
      title: args.roomTitle?.trim() || undefined,
      isBotGame: args.isBotGame ?? args.difficulty !== undefined,
      difficulty: (args.difficulty as AIDifficulty | undefined) ?? AI_DIFFICULTY.MEDIUM,
      config: args.config,
      economyMode: args.economyMode,
      buyIn: args.economyMode === "balance" ? (args.buyIn ?? DEFAULT_BUY_IN) : undefined,
    });

    const playerId = await ctx.db.insert("players", {
      roomId,
      authUserId,
      name,
      seatIndex: 0,
      isHost: true,
      status: "active",
      lastSeenAt: now,
    });

    await ctx.db.patch(roomId, { hostPlayerId: playerId });

    const botCount = args.botCount ?? 2;
    const room = await getRoomByCode(ctx, code);
    if (botCount > 0) {
      await addDevBotsToRoom(ctx, room, botCount);
    }

    return {
      roomId: String(roomId),
      code,
      playerId,
      seatIndex: 0,
      authUserId,
      maxPlayers: room.maxPlayers,
    };
  },
});


/**
 * Reset all test state for the E2E user: leave any active room, clear
 * activeGameId, remove test rooms created by the E2E user, and resolve
 * any orphaned state. Used at the start of each test run.
 */
export const e2eResetTestState = mutation({
  args: {},
  handler: async (ctx) => {
    if (!IS_E2E) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "e2eResetTestState is only available in E2E testing mode.",
      });
    }

    // Leave any active room the E2E user is in
    const activePlayer = await ctx.db
      .query("players")
      .withIndex("authUserId_status", (q) =>
        q.eq("authUserId", E2E_USER_ID).eq("status", "active"),
      )
      .first();

    if (activePlayer) {
      await ctx.db.patch(activePlayer._id, { status: "left", lastSeenAt: Date.now() });

      // If this was the last active player, close the room
      const remaining = await ctx.db
        .query("players")
        .withIndex("roomId_status", (q) =>
          q.eq("roomId", activePlayer.roomId).eq("status", "active"),
        )
        .collect();

      if (remaining.length === 0) {
        const room = await ctx.db.get(activePlayer.roomId);
        if (room && room.status === "open") {
          await ctx.db.patch(room._id, { status: "closed", lastActiveAt: Date.now() });
        }
      }
    }

    return { ok: true };
  },
});

/**
 * Force-complete the current active hand for the E2E user. Used when
 * a test needs to advance past a hand without playing through it.
 */
export const e2eCompleteCurrentHand = mutation({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    if (!IS_E2E) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "e2eCompleteCurrentHand is only available in E2E testing mode.",
      });
    }

    const gameId = ctx.db.normalizeId("games", args.gameId);
    if (!gameId) {
      throw new ConvexError({ code: "GAME_NOT_FOUND", message: "Invalid game ID." });
    }

    const game = await ctx.db.get(gameId);
    if (!game) {
      throw new ConvexError({ code: "GAME_NOT_FOUND", message: "Game does not exist." });
    }

    // Fold all non-folded players to end the hand
    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();

    const activeHands = hands.filter((h) => !h.hasFolded);
    // Keep one player, fold the rest - this ends the hand with a fold-win
    const [winner, ...folders] = activeHands;
    if (!winner) {
      return { ok: true, reason: "no_active_hands" };
    }

    const now = Date.now();
    for (const hand of folders) {
      await ctx.db.patch(hand._id, {
        hasFolded: true,
        lastAction: "fold",
        updatedAt: now,
      });
    }

    // Mark game as completed
    await ctx.db.patch(game._id, {
      status: "completed",
      winnerId: winner.playerId,
      updatedAt: now,
    });

    return { ok: true, winnerId: winner.playerId, foldedCount: folders.length };
  },
});

/**
 * Set a player's table stack (chips) for testing purposes.
 */
export const e2eSetTableStack = mutation({
  args: {
    gameId: v.string(),
    playerId: v.string(),
    chips: v.number(),
  },
  handler: async (ctx, args) => {
    if (!IS_E2E) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "e2eSetTableStack is only available in E2E testing mode.",
      });
    }

    const gameId = ctx.db.normalizeId("games", args.gameId);
    if (!gameId) {
      throw new ConvexError({ code: "INVALID_ID", message: "Invalid game ID." });
    }

    const hand = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .filter((q) => q.eq(q.field("playerId"), args.playerId))
      .first();

    if (!hand) {
      throw new ConvexError({ code: "HAND_NOT_FOUND", message: "Player hand not found." });
    }

    await ctx.db.patch(hand._id, { chips: args.chips, updatedAt: Date.now() });
    return { ok: true, chips: args.chips };
  },
});

/**
 * Mark a player as disconnected by setting lastSeenAt far in the past.
 */
export const e2eSetPlayerDisconnected = mutation({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    if (!IS_E2E) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "e2eSetPlayerDisconnected is only available in E2E testing mode.",
      });
    }

    const playerId = ctx.db.normalizeId("players", args.playerId);
    if (!playerId) {
      throw new ConvexError({ code: "PLAYER_NOT_FOUND", message: "Invalid player ID." });
    }

    const player = await ctx.db.get(playerId);
    if (!player) {
      throw new ConvexError({ code: "PLAYER_NOT_FOUND", message: "Player not found." });
    }

    // Set lastSeenAt to 30 minutes ago (well past the 2-minute timeout)
    await ctx.db.patch(player._id, { lastSeenAt: Date.now() - 30 * 60 * 1000 });
    return { ok: true };
  },
});

/**
 * Force-expire a player's presence so the disconnect timeout fires.
 */
export const e2eExpirePlayerPresence = mutation({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    if (!IS_E2E) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "e2eExpirePlayerPresence is only available in E2E testing mode.",
      });
    }

    const playerId = ctx.db.normalizeId("players", args.playerId);
    if (!playerId) {
      throw new ConvexError({ code: "PLAYER_NOT_FOUND", message: "Invalid player ID." });
    }

    const player = await ctx.db.get(playerId);
    if (!player) {
      throw new ConvexError({ code: "PLAYER_NOT_FOUND", message: "Player not found." });
    }

    // Set lastSeenAt far enough in the past that the reaping logic treats them as expired
    // (reapInactivePlayersForRoom uses a 2-minute threshold)
    await ctx.db.patch(player._id, { lastSeenAt: 0 });
    return { ok: true };
  },
});
