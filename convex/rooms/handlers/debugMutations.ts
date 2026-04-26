import { mutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getAuthenticatedUserId, getRoomByCode } from "../helpers";
import { addDevBotsToRoom, rejoinRoomMember } from "../players";

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
