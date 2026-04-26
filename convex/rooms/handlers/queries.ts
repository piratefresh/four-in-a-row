import { query } from "../../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import {
  normalizeRoomCode,
  isTutorialRoom,
  isPlayerInactive,
  getActivePlayersInRoom,
  getAuthenticatedUserId,
  getAuthUserByPlayerAuthUserId,
} from "../helpers";
import { ROOM_CODE_LENGTH } from "../helpers";
import { STALE_ROOM_THRESHOLD_MS } from "../../constants";

export const listRooms = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const staleBefore = now - STALE_ROOM_THRESHOLD_MS;
    const rooms = (await ctx.db
      .query("rooms")
      .withIndex("status_lastActiveAt", (q) => q.eq("status", "open"))
      .order("desc")
      .take(100)).filter((room) => !isTutorialRoom(room) && !room.isBotGame);

    const result = [];
    for (const room of rooms) {
      const activePlayers = (await getActivePlayersInRoom(ctx, room._id)).filter(
        (player) => !isPlayerInactive(player, now),
      );

      if (activePlayers.length === 0 && room.lastActiveAt < staleBefore) {
        continue;
      }

      const currentGame = await ctx.db
        .query("games")
        .withIndex("by_room_status", (q) => q.eq("roomId", String(room._id)).eq("status", "active"))
        .first();

      if (currentGame && currentGame.stage !== "preflop") {
        continue;
      }

      const completedGame = await ctx.db
        .query("games")
        .withIndex("by_room_status", (q) => q.eq("roomId", String(room._id)).eq("status", "completed"))
        .first();

      if (completedGame) {
        continue;
      }

      result.push({
        _id: room._id,
        code: room.code,
        status: room.status,
        maxPlayers: room.maxPlayers,
        lastActiveAt: room.lastActiveAt,
        createdAt: room.createdAt,
        activePlayers: activePlayers.length,
      });
    }
    return result.slice(0, 50);
  },
});

export const getRoomMembers = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const code = normalizeRoomCode(args.code);
    if (!/^[A-Z0-9]+$/.test(code) || code.length !== ROOM_CODE_LENGTH) {
      throw new ConvexError({
        code: "INVALID_CODE",
        message: `Room code must be ${ROOM_CODE_LENGTH} alphanumeric characters.`,
      });
    }

    const room = await ctx.db.query("rooms").withIndex("code", (q) => q.eq("code", code)).unique();
    if (!room) {
      return null;
    }

    const activePlayers = (await getActivePlayersInRoom(ctx, room._id)).filter(
      (player) => !isPlayerInactive(player, now),
    );

    activePlayers.sort((a, b) => a.seatIndex - b.seatIndex);

    let viewerPlayerId: string | null = null;
    let viewerSeatPreview: { seatIndex: number; name: string } | null = null;
    const authUserId = await getAuthenticatedUserId(ctx);
    if (authUserId) {
      const viewerPlayer = activePlayers.find((player) => player.authUserId === authUserId) ?? null;
      viewerPlayerId = viewerPlayer?._id ?? null;

      if (!viewerPlayerId) {
        const historicalViewerPlayers = await ctx.db
          .query("players")
          .withIndex("roomId", (q) => q.eq("roomId", room._id))
          .filter((q) => q.eq(q.field("authUserId"), authUserId))
          .collect();

        const occupiedSeats = new Set(activePlayers.map((player) => player.seatIndex));
        const latestViewerPlayer = [...historicalViewerPlayers].sort((a, b) => b.lastSeenAt - a.lastSeenAt)[0] ?? null;

        if (latestViewerPlayer && !occupiedSeats.has(latestViewerPlayer.seatIndex)) {
          viewerSeatPreview = {
            seatIndex: latestViewerPlayer.seatIndex,
            name: latestViewerPlayer.name,
          };
        }
      }
    }

    const members = await Promise.all(
      activePlayers.map(async (player) => {
        const authUser = await getAuthUserByPlayerAuthUserId(ctx, player.authUserId);
        return {
          _id: player._id,
          name: player.name,
          seatIndex: player.seatIndex,
          isHost: player.isHost,
          authUserId: player.authUserId,
          image: authUser?.image ?? null,
          readyStatus: player.readyStatus ?? false,
        };
      }),
    );

    return {
      room: {
        _id: room._id,
        code: room.code,
        status: room.status,
        maxPlayers: room.maxPlayers,
        lastActiveAt: room.lastActiveAt,
        tutorialId: room.tutorialId ?? null,
      },
      members,
      viewerPlayerId,
      viewerSeatPreview,
    };
  },
});

export const getMyActiveRoom = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      return null;
    }

    const activePlayer = await ctx.db
      .query("players")
      .withIndex("authUserId_status", (q) => q.eq("authUserId", authUserId).eq("status", "active"))
      .first();

    if (!activePlayer) {
      return null;
    }

    if (isPlayerInactive(activePlayer, now)) {
      return null;
    }

    const room = await ctx.db.get(activePlayer.roomId);
    if (!room || room.status !== "open") {
      return null;
    }

    return {
      roomId: room._id,
      code: room.code,
      playerId: activePlayer._id,
      seatIndex: activePlayer.seatIndex,
      tutorialId: room.tutorialId ?? null,
    };
  },
});
