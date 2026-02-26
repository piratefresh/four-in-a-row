import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";
import {
  PLAYER_NAME_MAX_LENGTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_CODE_MAX_ATTEMPTS,
  ROOM_MAX_PLAYERS,
} from "./constants";

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeRoomCode(code: string) {
  return code.trim().toUpperCase();
}

function isLegacySeedHostName(name: string) {
  return /^Host \d+$/.test(name);
}

function randomString(length: number, alphabet: string) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let output = "";
  for (let i = 0; i < length; i++) {
    output += alphabet[bytes[i] % alphabet.length];
  }
  return output;
}

function generateRoomCode() {
  return randomString(ROOM_CODE_LENGTH, ROOM_CODE_ALPHABET);
}

function findFirstAvailableSeat(
  occupiedSeats: Set<number>,
  maxPlayers: number,
) {
  for (let seatIndex = 0; seatIndex < maxPlayers; seatIndex++) {
    if (!occupiedSeats.has(seatIndex)) {
      return seatIndex;
    }
  }
  return null;
}

async function generateUniqueRoomCode(ctx: MutationCtx) {
  let code: string | null = null;
  for (let attempt = 0; attempt < ROOM_CODE_MAX_ATTEMPTS; attempt++) {
    const candidate = generateRoomCode();
    const existing = await ctx.db
      .query("rooms")
      .withIndex("code", (q) => q.eq("code", candidate))
      .unique();
    if (!existing) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    throw new ConvexError({
      code: "ROOM_CODE_UNAVAILABLE",
      message: "Failed to allocate a unique room code.",
    });
  }
  return code;
}

async function createOpenRoom(ctx: MutationCtx) {
  const code = await generateUniqueRoomCode(ctx);
  const now = Date.now();
  const roomId = await ctx.db.insert("rooms", {
    code,
    status: "open",
    maxPlayers: ROOM_MAX_PLAYERS,
    createdAt: now,
    lastActiveAt: now,
  });
  return { roomId, code, now };
}

async function getAuthenticatedUserId(
  ctx: MutationCtx | QueryCtx,
): Promise<string | undefined> {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });
  const rawUserId = session?.user?.id ?? session?.session?.userId;
  if (!rawUserId) {
    return undefined;
  }

  return rawUserId;
}

async function createRoomWithHost(ctx: MutationCtx, rawName: string) {
  const name = normalizeName(rawName);
  if (name.length === 0 || name.length > PLAYER_NAME_MAX_LENGTH) {
    throw new ConvexError({
      code: "INVALID_NAME",
      message: `Name must be between 1 and ${PLAYER_NAME_MAX_LENGTH} characters.`,
    });
  }

  const { roomId, code, now } = await createOpenRoom(ctx);

  const authUserId = await getAuthenticatedUserId(ctx);
  if (!authUserId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }
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

  return {
    roomId,
    code,
    playerId,
    seatIndex: 0,
    maxPlayers: ROOM_MAX_PLAYERS,
  };
}

async function getActiveAuthedPlayerInRoom(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  authUserId: string,
) {
  const activePlayersForUser = await ctx.db
    .query("players")
    .withIndex("authUserId_status", (q) =>
      q.eq("authUserId", authUserId).eq("status", "active"),
    )
    .collect();
  return (
    activePlayersForUser.find((player) => player.roomId === roomId) ?? null
  );
}

async function getAnyActiveAuthedPlayer(
  ctx: MutationCtx,
  authUserId: string,
) {
  return await ctx.db
    .query("players")
    .withIndex("authUserId_status", (q) =>
      q.eq("authUserId", authUserId).eq("status", "active"),
    )
    .first();
}

async function leavePlayer(ctx: MutationCtx, player: Doc<"players">) {
  const room = await ctx.db.get(player.roomId);
  if (!room) {
    throw new ConvexError({
      code: "ROOM_NOT_FOUND",
      message: "Room no longer exists.",
    });
  }

  if (player.status === "left") {
    return {
      ok: true,
      roomId: room._id,
      wasAlreadyLeft: true,
      roomStatus: room.status,
    };
  }

  const now = Date.now();
  await ctx.db.patch(player._id, {
    status: "left",
    lastSeenAt: now,
    isHost: false,
  });

  const activePlayers = await ctx.db
    .query("players")
    .withIndex("roomId_status", (q) =>
      q.eq("roomId", room._id).eq("status", "active"),
    )
    .collect();

  if (activePlayers.length === 0) {
    await ctx.db.patch(room._id, {
      status: "closed",
      hostPlayerId: undefined,
      lastActiveAt: now,
    });

    const remainingOpenRooms = await ctx.db
      .query("rooms")
      .withIndex("status_lastActiveAt", (q) => q.eq("status", "open"))
      .take(1);

    if (remainingOpenRooms.length === 0) {
      await createOpenRoom(ctx);
    }

    return {
      ok: true,
      roomId: room._id,
      wasAlreadyLeft: false,
      roomStatus: "closed",
    };
  }

  let nextHostPlayerId = room.hostPlayerId;
  if (player.isHost || !room.hostPlayerId) {
    const nextHost = [...activePlayers].sort(
      (a, b) => a.seatIndex - b.seatIndex,
    )[0];
    await ctx.db.patch(nextHost._id, { isHost: true });
    nextHostPlayerId = nextHost._id;
  }

  await ctx.db.patch(room._id, {
    hostPlayerId: nextHostPlayerId,
    lastActiveAt: now,
    status: "open",
  });

  return {
    ok: true,
    roomId: room._id,
    wasAlreadyLeft: false,
    roomStatus: "open",
  };
}

export const createRoom = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return createRoomWithHost(ctx, args.name);
  },
});

export const joinRoom = mutation({
  args: {
    code: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const code = normalizeRoomCode(args.code);
    if (!/^[A-Z0-9]+$/.test(code) || code.length !== ROOM_CODE_LENGTH) {
      throw new ConvexError({
        code: "INVALID_CODE",
        message: `Room code must be ${ROOM_CODE_LENGTH} alphanumeric characters.`,
      });
    }

    const name = normalizeName(args.name);
    if (name.length === 0 || name.length > PLAYER_NAME_MAX_LENGTH) {
      throw new ConvexError({
        code: "INVALID_NAME",
        message: `Name must be between 1 and ${PLAYER_NAME_MAX_LENGTH} characters.`,
      });
    }

    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const room = await ctx.db
      .query("rooms")
      .withIndex("code", (q) => q.eq("code", code))
      .unique();

    if (!room) {
      throw new ConvexError({
        code: "ROOM_NOT_FOUND",
        message: "Room does not exist.",
      });
    }

    if (room.status !== "open") {
      throw new ConvexError({
        code: "ROOM_CLOSED",
        message: "Room is closed.",
      });
    }

    const existingAuthedPlayer = await getAnyActiveAuthedPlayer(
      ctx,
      authUserId,
    );
    if (existingAuthedPlayer) {
      const existingRoom = await ctx.db.get(existingAuthedPlayer.roomId);
      if (existingRoom) {
        return {
          roomId: existingRoom._id,
          code: existingRoom.code,
          playerId: existingAuthedPlayer._id,
          seatIndex: existingAuthedPlayer.seatIndex,
          maxPlayers: existingRoom.maxPlayers,
        };
      }
    }

    const activePlayers = await ctx.db
      .query("players")
      .withIndex("roomId_status", (q) =>
        q.eq("roomId", room._id).eq("status", "active"),
      )
      .collect();

    if (activePlayers.length >= room.maxPlayers) {
      throw new ConvexError({
        code: "ROOM_FULL",
        message: "Room is full.",
      });
    }

    const occupiedSeats = new Set(
      activePlayers.map((player) => player.seatIndex),
    );
    const seatIndex = findFirstAvailableSeat(occupiedSeats, room.maxPlayers);
    if (seatIndex === null) {
      throw new ConvexError({
        code: "ROOM_FULL",
        message: "No available seats in room.",
      });
    }

    const isHost = activePlayers.length === 0;
    const now = Date.now();

    const playerId = await ctx.db.insert("players", {
      roomId: room._id,
      authUserId,
      name,
      seatIndex,
      isHost,
      status: "active",
      lastSeenAt: now,
    });

    await ctx.db.patch(room._id, {
      lastActiveAt: now,
      hostPlayerId: isHost ? playerId : room.hostPlayerId,
    });

    return {
      roomId: room._id,
      code: room.code,
      playerId,
      seatIndex,
      maxPlayers: room.maxPlayers,
    };
  },
});

export const leaveRoom = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const player = await getAnyActiveAuthedPlayer(ctx, authUserId);
    if (!player) {
      return { ok: true, roomId: null, wasAlreadyLeft: true, roomStatus: null };
    }

    return leavePlayer(ctx, player);
  },
});

export const leaveRoomByCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const code = normalizeRoomCode(args.code);
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const room = await ctx.db
      .query("rooms")
      .withIndex("code", (q) => q.eq("code", code))
      .unique();
    if (!room) {
      throw new ConvexError({
        code: "ROOM_NOT_FOUND",
        message: "Room does not exist.",
      });
    }

    const player = await getActiveAuthedPlayerInRoom(ctx, room._id, authUserId);
    if (!player) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You are not an active member of this room.",
      });
    }

    return leavePlayer(ctx, player);
  },
});

export const leaveCurrentRoom = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const player = await getAnyActiveAuthedPlayer(ctx, authUserId);
    if (!player) {
      return { ok: true, roomId: null, wasAlreadyLeft: true, roomStatus: null };
    }

    return leavePlayer(ctx, player);
  },
});

export const heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const player = await getAnyActiveAuthedPlayer(ctx, authUserId);
    if (!player) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You are not an active member of a room.",
      });
    }

    if (player.status === "left") {
      throw new ConvexError({
        code: "PLAYER_LEFT",
        message: "Player already left the room.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(player._id, { lastSeenAt: now });

    return {
      ok: true,
      roomId: player.roomId,
      playerId: player._id,
      lastSeenAt: now,
    };
  },
});

export const heartbeatByCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const code = normalizeRoomCode(args.code);
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const room = await ctx.db
      .query("rooms")
      .withIndex("code", (q) => q.eq("code", code))
      .unique();
    if (!room) {
      throw new ConvexError({
        code: "ROOM_NOT_FOUND",
        message: "Room does not exist.",
      });
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

    return {
      ok: true,
      roomId: room._id,
      playerId: player._id,
      lastSeenAt: now,
    };
  },
});

export const ensureSeedRooms = mutation({
  args: {},
  handler: async (ctx) => {
    const openRooms = await ctx.db
      .query("rooms")
      .withIndex("status_lastActiveAt", (q) => q.eq("status", "open"))
      .collect();

    // One-time cleanup for previously seeded placeholder-host rooms.
    // These rooms were seeded with a fake active player (Host N). Delete them
    // entirely so the UI can repopulate with clean empty rooms.
    for (const room of openRooms) {
      const activePlayers = await ctx.db
        .query("players")
        .withIndex("roomId_status", (q) =>
          q.eq("roomId", room._id).eq("status", "active"),
        )
        .collect();

      if (activePlayers.length !== 1) continue;
      const onlyPlayer = activePlayers[0];
      if (
        onlyPlayer.isHost &&
        onlyPlayer.seatIndex === 0 &&
        isLegacySeedHostName(onlyPlayer.name)
      ) {
        const roomPlayers = await ctx.db
          .query("players")
          .withIndex("roomId", (q) => q.eq("roomId", room._id))
          .collect();
        for (const player of roomPlayers) {
          await ctx.db.delete(player._id);
        }

        const roomMessages = await ctx.db
          .query("messages")
          .withIndex("roomId_createdAt", (q) => q.eq("roomId", room._id))
          .collect();
        for (const message of roomMessages) {
          await ctx.db.delete(message._id);
        }

        await ctx.db.delete(room._id);
      }
    }

    const rooms = await ctx.db
      .query("rooms")
      .withIndex("status_lastActiveAt", (q) => q.eq("status", "open"))
      .collect();

    const targetCount = 4;
    const roomsToCreate = Math.max(0, targetCount - rooms.length);
    for (let i = 0; i < roomsToCreate; i++) {
      await createOpenRoom(ctx);
    }

    return { created: roomsToCreate };
  },
});

export const listRooms = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("status_lastActiveAt", (q) => q.eq("status", "open"))
      .order("desc")
      .take(20);

    const result = [];
    for (const room of rooms) {
      const activePlayers = await ctx.db
        .query("players")
        .withIndex("roomId_status", (q) =>
          q.eq("roomId", room._id).eq("status", "active"),
        )
        .collect();
      result.push({
        _id: room._id,
        code: room.code,
        status: room.status,
        maxPlayers: room.maxPlayers,
        lastActiveAt: room.lastActiveAt,
        activePlayers: activePlayers.length,
      });
    }
    return result;
  },
});

export const getRoomMembers = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const code = normalizeRoomCode(args.code);
    if (!/^[A-Z0-9]+$/.test(code) || code.length !== ROOM_CODE_LENGTH) {
      throw new ConvexError({
        code: "INVALID_CODE",
        message: `Room code must be ${ROOM_CODE_LENGTH} alphanumeric characters.`,
      });
    }

    const room = await ctx.db
      .query("rooms")
      .withIndex("code", (q) => q.eq("code", code))
      .unique();

    if (!room) {
      return null;
    }

    const activePlayers = await ctx.db
      .query("players")
      .withIndex("roomId_status", (q) =>
        q.eq("roomId", room._id).eq("status", "active"),
      )
      .collect();

    activePlayers.sort((a, b) => a.seatIndex - b.seatIndex);

    let viewerPlayerId: Id<"players"> | null = null;
    const authUserId = await getAuthenticatedUserId(ctx);
    if (authUserId) {
      const viewerPlayer =
        activePlayers.find((player) => player.authUserId === authUserId) ??
        null;
      viewerPlayerId = viewerPlayer?._id ?? null;
    }

    return {
      room: {
        _id: room._id,
        code: room.code,
        status: room.status,
        maxPlayers: room.maxPlayers,
        lastActiveAt: room.lastActiveAt,
      },
      members: activePlayers.map((player) => ({
        _id: player._id,
        name: player.name,
        seatIndex: player.seatIndex,
        isHost: player.isHost,
        authUserId: player.authUserId,
        readyStatus: player.readyStatus ?? false,
      })),
      viewerPlayerId,
    };
  },
});

export const getMyActiveRoom = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      return null;
    }

    const activePlayer = await ctx.db
      .query("players")
      .withIndex("authUserId_status", (q) =>
        q.eq("authUserId", authUserId).eq("status", "active"),
      )
      .first();

    if (!activePlayer) {
      return null;
    }

    const room = await ctx.db.get(activePlayer.roomId);
    if (!room) {
      return null;
    }

    return {
      roomId: room._id,
      code: room.code,
      playerId: activePlayer._id,
      seatIndex: activePlayer.seatIndex,
    };
  },
});

// DEBUG: Clear all data
export const toggleReady = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const code = normalizeRoomCode(args.code);
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const room = await ctx.db
      .query("rooms")
      .withIndex("code", (q) => q.eq("code", code))
      .unique();

    if (!room) {
      throw new ConvexError({
        code: "ROOM_NOT_FOUND",
        message: "Room not found.",
      });
    }

    const player = await ctx.db
      .query("players")
      .withIndex("roomId_status", (q) =>
        q.eq("roomId", room._id).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("authUserId"), authUserId))
      .unique();

    if (!player) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You are not a member of this room.",
      });
    }

    const newReadyStatus = !player.readyStatus;
    await ctx.db.patch(player._id, { readyStatus: newReadyStatus });

    // Check if all players are now ready
    const allPlayers = await ctx.db
      .query("players")
      .withIndex("roomId_status", (q) =>
        q.eq("roomId", room._id).eq("status", "active")
      )
      .collect();

    const allReady = allPlayers.length > 0 && allPlayers.every((p) => p.readyStatus);

    // If all players are ready, auto-start the game
    if (allReady && newReadyStatus) {
      const game = await ctx.db
        .query("games")
        .withIndex("by_room_status", (q) =>
          q.eq("roomId", room._id).eq("status", "waiting")
        )
        .unique();

      if (game) {
        // Schedule the game start (use internal mutation to avoid auth checks)
        await ctx.scheduler.runAfter(0, internal.games.internalStartGame, {
          gameId: game._id,
        });
      }
    }

    return { readyStatus: newReadyStatus };
  },
});

export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all player hands
    const allHands = await ctx.db.query("playerHands").collect();
    for (const hand of allHands) {
      await ctx.db.delete(hand._id);
    }

    // Delete all games
    const allGames = await ctx.db.query("games").collect();
    for (const game of allGames) {
      await ctx.db.delete(game._id);
    }

    // Delete all players
    const allPlayers = await ctx.db.query("players").collect();
    for (const player of allPlayers) {
      await ctx.db.delete(player._id);
    }

    // Delete all rooms
    const allRooms = await ctx.db.query("rooms").collect();
    for (const room of allRooms) {
      await ctx.db.delete(room._id);
    }

    return {
      ok: true,
      deleted: {
        playerHands: allHands.length,
        games: allGames.length,
        players: allPlayers.length,
        rooms: allRooms.length,
      },
    };
  },
});
