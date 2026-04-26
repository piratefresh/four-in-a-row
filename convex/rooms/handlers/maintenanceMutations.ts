import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { isTutorialRoom, isPlayerInactive, getActivePlayersInRoom } from "../helpers";
import {
  createOpenRoom,
  reapInactivePlayersAcrossOpenRooms,
  closeStaleScoreboardRooms,
} from "../lifecycle";
import { STALE_ROOM_THRESHOLD_MS } from "../../constants";
import { isLegacySeedHostName } from "../helpers";

export const ensureSeedRooms = mutation({
  args: {},
  handler: async (ctx) => {
    const inactiveCleanup = await reapInactivePlayersAcrossOpenRooms(ctx);
    const staleClosed = await closeStaleScoreboardRooms(ctx);
    const openRooms = await ctx.db
      .query("rooms")
      .withIndex("status_lastActiveAt", (q) => q.eq("status", "open"))
      .collect();

    for (const room of openRooms) {
      const activePlayers = await ctx.db
        .query("players")
        .withIndex("roomId_status", (q) => q.eq("roomId", room._id).eq("status", "active"))
        .collect();

      if (activePlayers.length !== 1) continue;
      const onlyPlayer = activePlayers[0];
      if (onlyPlayer.isHost && onlyPlayer.seatIndex === 0 && isLegacySeedHostName(onlyPlayer.name)) {
        const roomPlayers = await ctx.db.query("players").withIndex("roomId", (q) => q.eq("roomId", room._id)).collect();
        for (const player of roomPlayers) {
          await ctx.db.delete(player._id);
        }

        const roomMessages = await ctx.db.query("messages").withIndex("roomId_createdAt", (q) => q.eq("roomId", room._id)).collect();
        for (const message of roomMessages) {
          await ctx.db.delete(message._id);
        }

        await ctx.db.delete(room._id);
      }
    }

    const rooms = (await ctx.db.query("rooms").withIndex("status_lastActiveAt", (q) => q.eq("status", "open")).collect()).filter((room) => !isTutorialRoom(room));

    const targetCount = 4;
    const roomsToCreate = Math.max(0, targetCount - rooms.length);
    for (let i = 0; i < roomsToCreate; i++) {
      await createOpenRoom(ctx);
    }

    return {
      created: roomsToCreate,
      staleClosed,
      inactiveRoomsClosed: inactiveCleanup.roomsClosed,
      inactivePlayersRemoved: inactiveCleanup.stalePlayersRemoved,
    };
  },
});

export const refreshOpenRooms = mutation({
  args: { count: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const inactiveCleanup = await reapInactivePlayersAcrossOpenRooms(ctx);
    const staleClosed = await closeStaleScoreboardRooms(ctx);
    const now = Date.now();
    const openRooms = (await ctx.db.query("rooms").withIndex("status_lastActiveAt", (q) => q.eq("status", "open")).collect()).filter((room) => !isTutorialRoom(room));

    let closed = 0;
    for (const room of openRooms) {
      const activePlayers = await ctx.db.query("players").withIndex("roomId_status", (q) => q.eq("roomId", room._id).eq("status", "active")).collect();
      if (activePlayers.length > 0) continue;

      await ctx.db.patch(room._id, { status: "closed", hostPlayerId: undefined, lastActiveAt: now });
      closed += 1;
    }

    const requestedCount = Math.max(1, Math.floor(args.count ?? 1));
    const roomsToCreate = requestedCount;
    for (let i = 0; i < roomsToCreate; i++) {
      await createOpenRoom(ctx);
    }

    const remainingOpenRooms = (await ctx.db.query("rooms").withIndex("status_lastActiveAt", (q) => q.eq("status", "open")).collect()).filter((room) => !isTutorialRoom(room));

    return {
      closed: closed + staleClosed + inactiveCleanup.roomsClosed,
      created: roomsToCreate,
      openRooms: remainingOpenRooms.length,
      inactivePlayersRemoved: inactiveCleanup.stalePlayersRemoved,
    };
  },
});

export const runCronCleanup = mutation({
  args: {},
  handler: async (ctx) => {
    const inactiveCleanup = await reapInactivePlayersAcrossOpenRooms(ctx);
    await closeStaleScoreboardRooms(ctx);

    const now = Date.now();
    const staleBefore = now - STALE_ROOM_THRESHOLD_MS;
    const openRooms = await ctx.db.query("rooms").withIndex("status_lastActiveAt", (q) => q.eq("status", "open")).collect();

    let closed = 0;
    for (const room of openRooms) {
      if (isTutorialRoom(room)) continue;

      const activePlayers = (await getActivePlayersInRoom(ctx, room._id)).filter((player) => !isPlayerInactive(player, now));

      if (activePlayers.length === 0 && room.lastActiveAt < staleBefore) {
        for (const player of activePlayers) {
          await ctx.db.patch(player._id, { status: "left", isHost: false, lastSeenAt: now });
        }

        await ctx.db.patch(room._id, { status: "closed", hostPlayerId: undefined, lastActiveAt: now });
        await createOpenRoom(ctx);
        closed += 1;
      }
    }

    const remainingOpenRooms = (await ctx.db.query("rooms").withIndex("status_lastActiveAt", (q) => q.eq("status", "open")).collect()).filter((room) => !isTutorialRoom(room));

    const targetCount = 4;
    const roomsToCreate = Math.max(0, targetCount - remainingOpenRooms.length);
    for (let i = 0; i < roomsToCreate; i++) {
      await createOpenRoom(ctx);
    }

    return {
      inactivePlayersRemoved: inactiveCleanup.stalePlayersRemoved,
      roomsClosed: inactiveCleanup.roomsClosed + closed,
      freshRoomsCreated: roomsToCreate,
    };
  },
});
