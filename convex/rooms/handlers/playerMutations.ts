import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import {
  normalizeRoomCode,
  getAuthenticatedUserId,
  getAuthenticatedOrGuestTutorialUserId,
  getAnyActiveAuthedPlayer,
  getActiveAuthedPlayerInRoom,
  isTutorialRoom,
} from "../helpers";
import { internalStartGameHandler } from "../../games/gamesSetup";
import { requireVerifiedUser } from "../../verifyUser";

export const heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "Authentication required." });
    }

    const player = await getAnyActiveAuthedPlayer(ctx, authUserId);
    if (!player) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You are not an active member of a room.",
      });
    }

    if (player.status === "left") {
      throw new ConvexError({ code: "PLAYER_LEFT", message: "Player already left the room." });
    }

    const now = Date.now();
    await ctx.db.patch(player._id, { lastSeenAt: now });

    return { ok: true, roomId: player.roomId, playerId: player._id, lastSeenAt: now };
  },
});

export const heartbeatByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = normalizeRoomCode(args.code);
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "Authentication required." });
    }

    const room = await ctx.db.query("rooms").withIndex("code", (q) => q.eq("code", code)).unique();
    if (!room) {
      throw new ConvexError({ code: "ROOM_NOT_FOUND", message: "Room does not exist." });
    }

    const player = await getActiveAuthedPlayerInRoom(ctx, room._id, authUserId);
    if (!player) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You are not an active member of this room.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(player._id, { lastSeenAt: now });
    await ctx.db.patch(room._id, { lastActiveAt: now });

    return { ok: true, roomId: room._id, playerId: player._id, lastSeenAt: now };
  },
});

export const toggleReady = mutation({
  args: { code: v.string(), guestAuthUserId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const code = normalizeRoomCode(args.code);

    const room = await ctx.db.query("rooms").withIndex("code", (q) => q.eq("code", code)).unique();
    if (!room) {
      throw new ConvexError({ code: "ROOM_NOT_FOUND", message: "Room not found." });
    }

    const authUserId = isTutorialRoom(room)
      ? await getAuthenticatedOrGuestTutorialUserId(ctx, args.guestAuthUserId)
      : (await requireVerifiedUser(ctx)).authUserId;

    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication or a tutorial guest session is required.",
      });
    }

    const waitingGame = await ctx.db
      .query("games")
      .withIndex("by_room_status", (q) => q.eq("roomId", String(room._id)).eq("status", "waiting"))
      .unique();

    if (!waitingGame) {
      const activeGame = await ctx.db
        .query("games")
        .withIndex("by_room_status", (q) => q.eq("roomId", String(room._id)).eq("status", "active"))
        .unique();

      throw new ConvexError({
        code: activeGame ? "GAME_ALREADY_ACTIVE" : "NO_WAITING_GAME",
        message: activeGame ? "The next hand already started." : "There is no next hand waiting for ready checks.",
      });
    }

    const player = await ctx.db
      .query("players")
      .withIndex("roomId_status", (q) => q.eq("roomId", room._id).eq("status", "active"))
      .filter((q) => q.eq(q.field("authUserId"), authUserId))
      .unique();

    if (!player) {
      throw new ConvexError({ code: "PLAYER_NOT_FOUND", message: "You are not a member of this room." });
    }

    const newReadyStatus = !player.readyStatus;
    await ctx.db.patch(player._id, { readyStatus: newReadyStatus });

    const allPlayers = await ctx.db
      .query("players")
      .withIndex("roomId_status", (q) => q.eq("roomId", room._id).eq("status", "active"))
      .collect();

    const allReady = allPlayers.length >= 2 && allPlayers.every((p) => p.readyStatus);

    if (allReady && newReadyStatus) {
      const game = await ctx.db
        .query("games")
        .withIndex("by_room_status", (q) => q.eq("roomId", String(room._id)).eq("status", "waiting"))
        .unique();

      if (game) {
        await internalStartGameHandler(ctx, { gameId: game._id });
      }
    }

    return { readyStatus: newReadyStatus };
  },
});
