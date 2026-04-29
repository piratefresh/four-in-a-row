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
import { roomConfigValidator } from "../../gameConfig";

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
