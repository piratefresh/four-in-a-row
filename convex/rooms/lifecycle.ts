import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  STALE_SCOREBOARD_ROOM_MS,
  isPlayerInactive,
  getActivePlayersInRoom,
  generateUniqueRoomCode,
  type CreateOpenRoomOptions,
} from "./helpers";
import { ROOM_MAX_PLAYERS } from "../constants";

// ==================== Room Creation ====================

export async function createOpenRoom(
  ctx: MutationCtx,
  options?: CreateOpenRoomOptions,
) {
  const code = await generateUniqueRoomCode(ctx);
  const now = Date.now();
  const roomId = await ctx.db.insert("rooms", {
    code,
    title: options?.title,
    status: "open",
    maxPlayers: ROOM_MAX_PLAYERS,
    tutorialId: options?.tutorialId,
    isBotGame: options?.isBotGame,
    difficulty: options?.difficulty,
    config: options?.config,
    nextRoomId: undefined,
    sourceRoomId: options?.sourceRoomId,
    createdAt: now,
    lastActiveAt: now,
  });
  return { roomId, code, now };
}

// ==================== Game Completion ====================

async function completeLiveGamesForRoom(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  now: number,
) {
  const games = await ctx.db
    .query("games")
    .withIndex("by_room", (q) => q.eq("roomId", String(roomId)))
    .collect();

  for (const game of games) {
    if (game.status === "completed") continue;
    await ctx.db.patch(game._id, {
      status: "completed",
      updatedAt: now,
    });
  }
}

// ==================== Player Reaping ====================

export async function reapInactivePlayersForRoom(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  now: number,
) {
  const activePlayers = await getActivePlayersInRoom(ctx, room._id);
  const stalePlayers = activePlayers.filter((player) =>
    isPlayerInactive(player, now),
  );

  if (stalePlayers.length === 0) {
    return {
      stalePlayersRemoved: 0,
      roomClosed: false,
      freshActivePlayers: activePlayers,
    };
  }

  for (const player of stalePlayers) {
    await ctx.db.patch(player._id, {
      status: "left",
      isHost: false,
      lastSeenAt: now,
    });
  }

  const freshActivePlayers = activePlayers.filter(
    (player) => !isPlayerInactive(player, now),
  );

  if (freshActivePlayers.length === 0) {
    await completeLiveGamesForRoom(ctx, room._id, now);
    await ctx.db.patch(room._id, {
      status: "closed",
      hostPlayerId: undefined,
      lastActiveAt: now,
    });

    return {
      stalePlayersRemoved: stalePlayers.length,
      roomClosed: true,
      freshActivePlayers,
    };
  }

  const currentHostStillActive =
    room.hostPlayerId !== undefined &&
    freshActivePlayers.some((player) => player._id === room.hostPlayerId);

  let nextHostPlayerId = room.hostPlayerId;
  if (!currentHostStillActive) {
    const nextHost = [...freshActivePlayers].sort(
      (a, b) => a.seatIndex - b.seatIndex,
    )[0]!;
    await ctx.db.patch(nextHost._id, { isHost: true });
    nextHostPlayerId = nextHost._id;
  }

  await ctx.db.patch(room._id, {
    status: "open",
    hostPlayerId: nextHostPlayerId,
    lastActiveAt: now,
  });

  return {
    stalePlayersRemoved: stalePlayers.length,
    roomClosed: false,
    freshActivePlayers,
  };
}

export async function reapInactivePlayersAcrossOpenRooms(ctx: MutationCtx) {
  const now = Date.now();
  const openRooms = await ctx.db
    .query("rooms")
    .withIndex("status_lastActiveAt", (q) => q.eq("status", "open"))
    .collect();

  let stalePlayersRemoved = 0;
  let roomsClosed = 0;
  for (const room of openRooms) {
    const result = await reapInactivePlayersForRoom(ctx, room, now);
    stalePlayersRemoved += result.stalePlayersRemoved;
    roomsClosed += result.roomClosed ? 1 : 0;
  }

  return { stalePlayersRemoved, roomsClosed };
}

// ==================== Stale Room Cleanup ====================

export async function closeStaleScoreboardRooms(ctx: MutationCtx) {
  const now = Date.now();
  const staleBefore = now - STALE_SCOREBOARD_ROOM_MS;
  const openRooms = await ctx.db
    .query("rooms")
    .withIndex("status_lastActiveAt", (q) => q.eq("status", "open"))
    .collect();

  let closed = 0;
  for (const room of openRooms) {
    const latestCompletedGame = await ctx.db
      .query("games")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", String(room._id)).eq("status", "completed"),
      )
      .order("desc")
      .first();

    if (!latestCompletedGame) continue;
    if (latestCompletedGame.updatedAt > staleBefore) continue;

    const activePlayers = await ctx.db
      .query("players")
      .withIndex("roomId_status", (q) =>
        q.eq("roomId", room._id).eq("status", "active"),
      )
      .collect();

    for (const player of activePlayers) {
      await ctx.db.patch(player._id, {
        status: "left",
        isHost: false,
        lastSeenAt: now,
      });
    }

    await ctx.db.patch(room._id, {
      status: "closed",
      hostPlayerId: undefined,
      lastActiveAt: now,
    });
    closed += 1;
  }

  return closed;
}

// ==================== Continuation Room ====================

export async function findContinuationRoom(
  ctx: MutationCtx,
  sourceRoom: Doc<"rooms">,
) {
  const linkedRoom =
    sourceRoom.nextRoomId !== undefined
      ? await ctx.db.get(sourceRoom.nextRoomId)
      : null;
  if (linkedRoom?.status === "open") {
    return linkedRoom;
  }

  const candidateRooms = await ctx.db
    .query("rooms")
    .withIndex("sourceRoomId", (q) => q.eq("sourceRoomId", sourceRoom._id))
    .collect();

  const openCandidates = candidateRooms.filter((room) => room.status === "open");
  if (openCandidates.length === 0) {
    return null;
  }

  const candidatesWithCounts = await Promise.all(
    openCandidates.map(async (room) => ({
      room,
      activePlayers: (await getActivePlayersInRoom(ctx, room._id)).length,
    })),
  );

  candidatesWithCounts.sort((left, right) => {
    if (right.activePlayers !== left.activePlayers) {
      return right.activePlayers - left.activePlayers;
    }
    return right.room.createdAt - left.room.createdAt;
  });

  return candidatesWithCounts[0]?.room ?? null;
}
