import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import {
  PLAYER_NAME_MAX_LENGTH,
  PLAYER_TOKEN_ALPHABET,
  PLAYER_TOKEN_LENGTH,
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

function generatePlayerToken() {
  return randomString(PLAYER_TOKEN_LENGTH, PLAYER_TOKEN_ALPHABET);
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

async function createRoomWithHost(ctx: MutationCtx, rawName: string) {
  const name = normalizeName(rawName);
  if (name.length === 0 || name.length > PLAYER_NAME_MAX_LENGTH) {
    throw new ConvexError({
      code: "INVALID_NAME",
      message: `Name must be between 1 and ${PLAYER_NAME_MAX_LENGTH} characters.`,
    });
  }

  const { roomId, code, now } = await createOpenRoom(ctx);

  const playerToken = generatePlayerToken();
  const playerId = await ctx.db.insert("players", {
    roomId,
    name,
    seatIndex: 0,
    playerToken,
    isHost: true,
    status: "active",
    lastSeenAt: now,
  });

  await ctx.db.patch(roomId, { hostPlayerId: playerId });

  return {
    roomId,
    code,
    playerId,
    playerToken,
    seatIndex: 0,
    maxPlayers: ROOM_MAX_PLAYERS,
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
    playerToken: v.optional(v.string()),
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

    if (args.playerToken) {
      const existingPlayer = await ctx.db
        .query("players")
        .withIndex("playerToken", (q) => q.eq("playerToken", args.playerToken!))
        .unique();

      if (existingPlayer && existingPlayer.status === "active") {
        const existingRoom = await ctx.db.get(existingPlayer.roomId);
        if (existingRoom?.code === code) {
          return {
            roomId: existingRoom._id,
            code: existingRoom.code,
            playerId: existingPlayer._id,
            playerToken: existingPlayer.playerToken,
            seatIndex: existingPlayer.seatIndex,
            maxPlayers: existingRoom.maxPlayers,
          };
        }

        throw new ConvexError({
          code: "ALREADY_IN_ROOM",
          message: `Player is already in room ${existingRoom?.code ?? "unknown"}.`,
        });
      }
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

    const occupiedSeats = new Set(activePlayers.map((player) => player.seatIndex));
    const seatIndex = findFirstAvailableSeat(occupiedSeats, room.maxPlayers);
    if (seatIndex === null) {
      throw new ConvexError({
        code: "ROOM_FULL",
        message: "No available seats in room.",
      });
    }

    const isHost = activePlayers.length === 0;
    const now = Date.now();
    const playerToken = generatePlayerToken();
    const playerId = await ctx.db.insert("players", {
      roomId: room._id,
      name,
      seatIndex,
      playerToken,
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
      playerToken,
      seatIndex,
      maxPlayers: room.maxPlayers,
    };
  },
});

export const leaveRoom = mutation({
  args: {
    playerToken: v.string(),
  },
  handler: async (ctx, args) => {
    const playerToken = args.playerToken.trim();
    if (!playerToken) {
      throw new ConvexError({
        code: "INVALID_PLAYER_TOKEN",
        message: "Player token is required.",
      });
    }

    const player = await ctx.db
      .query("players")
      .withIndex("playerToken", (q) => q.eq("playerToken", playerToken))
      .unique();

    if (!player) {
      throw new ConvexError({
        code: "INVALID_PLAYER_TOKEN",
        message: "Player token is invalid.",
      });
    }

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
  },
});

export const heartbeat = mutation({
  args: {
    playerToken: v.string(),
  },
  handler: async (ctx, args) => {
    const playerToken = args.playerToken.trim();
    if (!playerToken) {
      throw new ConvexError({
        code: "INVALID_PLAYER_TOKEN",
        message: "Player token is required.",
      });
    }

    const player = await ctx.db
      .query("players")
      .withIndex("playerToken", (q) => q.eq("playerToken", playerToken))
      .unique();

    if (!player) {
      throw new ConvexError({
        code: "INVALID_PLAYER_TOKEN",
        message: "Player token is invalid.",
      });
    }

    if (player.status === "left") {
      throw new ConvexError({
        code: "PLAYER_LEFT",
        message: "Player already left the room.",
      });
    }

    const room = await ctx.db.get(player.roomId);
    if (!room) {
      throw new ConvexError({
        code: "ROOM_NOT_FOUND",
        message: "Room no longer exists.",
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
        playerToken: player.playerToken,
      })),
    };
  },
});
