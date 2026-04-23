import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { buildDevBotAuthUserId, getBotCharacterForSeatIndex } from "./aiStrategy";
import { authComponent, createAuth } from "./auth";
import {
  createGameForRoomHandler,
  resetTutorialGameForRoomHandler,
  internalStartGameHandler,
} from "./games/gamesSetup";
import { scheduleBotTurnIfNeeded } from "./games/gamesProgression";
import {
  PLAYER_NAME_MAX_LENGTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_CODE_MAX_ATTEMPTS,
  ROOM_MAX_PLAYERS,
} from "./constants";

const STALE_SCOREBOARD_ROOM_MS = 30 * 60 * 1000;
const INACTIVE_PLAYER_TIMEOUT_MS = 4 * 60 * 1000;
const FIRST_BOT_GAME_TUTORIAL_ID = "first-bot-game" as const;

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

type OfflineBotSourcePlayer = {
  authUserId?: string;
  seatIndex: number;
  lastSeenAt: number;
};

export function getOfflineBotSourcePlayers<T extends OfflineBotSourcePlayer>(
  players: T[],
) {
  const botsBySeat = new Map<number, T>();

  for (const player of players) {
    if (!player.authUserId?.startsWith("dev-bot:")) {
      continue;
    }

    const existingBotForSeat = botsBySeat.get(player.seatIndex);
    if (!existingBotForSeat || player.lastSeenAt > existingBotForSeat.lastSeenAt) {
      botsBySeat.set(player.seatIndex, player);
    }
  }

  return [...botsBySeat.values()].sort((a, b) => a.seatIndex - b.seatIndex);
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

type CreateOpenRoomOptions = {
  sourceRoomId?: Id<"rooms">;
  tutorialId?: typeof FIRST_BOT_GAME_TUTORIAL_ID;
};

async function createOpenRoom(
  ctx: MutationCtx,
  options?: CreateOpenRoomOptions,
) {
  const code = await generateUniqueRoomCode(ctx);
  const now = Date.now();
  const roomId = await ctx.db.insert("rooms", {
    code,
    status: "open",
    maxPlayers: ROOM_MAX_PLAYERS,
    tutorialId: options?.tutorialId,
    nextRoomId: undefined,
    sourceRoomId: options?.sourceRoomId,
    createdAt: now,
    lastActiveAt: now,
  });
  return { roomId, code, now };
}

function isTutorialRoom(room: Pick<Doc<"rooms">, "tutorialId">) {
  return room.tutorialId !== undefined;
}

function shouldCreateReplacementOpenRoom(room: Pick<Doc<"rooms">, "tutorialId">) {
  return !isTutorialRoom(room);
}

export function canReuseLinkedNextRoom({
  roomStatus,
  activePlayerCount,
  existingGameCount,
}: {
  roomStatus: "open" | "closed";
  activePlayerCount: number;
  existingGameCount: number;
}) {
  return (
    roomStatus === "open" &&
    activePlayerCount === 0 &&
    existingGameCount === 0
  );
}

function isPlayerInactive(
  player: Pick<Doc<"players">, "lastSeenAt" | "authUserId">,
  now: number,
) {
  if (player.authUserId?.startsWith("dev-bot:")) {
    return false;
  }

  return now - player.lastSeenAt > INACTIVE_PLAYER_TIMEOUT_MS;
}

async function getActivePlayersInRoom(
  ctx: MutationCtx | QueryCtx,
  roomId: Id<"rooms">,
) {
  return await ctx.db
    .query("players")
    .withIndex("roomId_status", (q) =>
      q.eq("roomId", roomId).eq("status", "active"),
    )
    .collect();
}

async function findContinuationRoom(
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

async function reapInactivePlayersForRoom(
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
    if (shouldCreateReplacementOpenRoom(room)) {
      await createOpenRoom(ctx);
    }

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

async function reapInactivePlayersAcrossOpenRooms(ctx: MutationCtx) {
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

async function closeStaleScoreboardRooms(ctx: MutationCtx) {
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
    if (shouldCreateReplacementOpenRoom(room)) {
      await createOpenRoom(ctx);
    }
    closed += 1;
  }

  return closed;
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
  return createRoomWithHostOptions(ctx, rawName, {});
}

async function createRoomWithHostOptions(
  ctx: MutationCtx,
  rawName: string,
  options: {
    tutorialId?: typeof FIRST_BOT_GAME_TUTORIAL_ID;
  },
) {
  const name = normalizeName(rawName);
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

  const existingAuthedPlayer = await getAnyActiveAuthedPlayer(ctx, authUserId);
  if (existingAuthedPlayer) {
    await leavePlayer(ctx, existingAuthedPlayer);
  }

  const { roomId, code, now } = await createOpenRoom(ctx, {
    tutorialId: options.tutorialId,
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

  return {
    roomId,
    code,
    playerId,
    seatIndex: 0,
    maxPlayers: ROOM_MAX_PLAYERS,
    tutorialId: options.tutorialId,
  };
}

async function joinAuthenticatedUserToRoom(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  authUserId: string,
  name: string,
  preferredSeatIndex?: number | null,
) {
  const existingAuthedPlayer = await getAnyActiveAuthedPlayer(ctx, authUserId);
  if (existingAuthedPlayer) {
    if (existingAuthedPlayer.roomId !== room._id) {
      await leavePlayer(ctx, existingAuthedPlayer);
    } else {
      return {
        roomId: room._id,
        code: room.code,
        playerId: existingAuthedPlayer._id,
        seatIndex: existingAuthedPlayer.seatIndex,
        maxPlayers: room.maxPlayers,
      };
    }
  }

  const activePlayers = await getActivePlayersInRoom(ctx, room._id);

  if (activePlayers.length >= room.maxPlayers) {
    throw new ConvexError({
      code: "ROOM_FULL",
      message: "Room is full.",
    });
  }

  const occupiedSeats = new Set(activePlayers.map((player) => player.seatIndex));
  const preferredSeatAvailable =
    preferredSeatIndex !== null &&
    preferredSeatIndex !== undefined &&
    !occupiedSeats.has(preferredSeatIndex);
  const seatIndex = preferredSeatAvailable
    ? preferredSeatIndex
    : findFirstAvailableSeat(occupiedSeats, room.maxPlayers);

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
    readyStatus: false,
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
}

async function syncOfflineBotsToRoom(
  ctx: MutationCtx,
  sourceRoomId: Id<"rooms">,
  targetRoom: Doc<"rooms">,
  now: number,
) {
  const sourceRoomPlayers = await ctx.db
    .query("players")
    .withIndex("roomId", (q) => q.eq("roomId", sourceRoomId))
    .collect();
  const sourceBots = getOfflineBotSourcePlayers(sourceRoomPlayers);

  if (sourceBots.length === 0) {
    return 0;
  }

  const targetActivePlayers = await getActivePlayersInRoom(ctx, targetRoom._id);
  const occupiedTargetSeats = new Set(
    targetActivePlayers.map((player) => player.seatIndex),
  );

  let botsAdded = 0;
  for (const sourceBot of sourceBots) {
    if (occupiedTargetSeats.has(sourceBot.seatIndex)) {
      continue;
    }

    occupiedTargetSeats.add(sourceBot.seatIndex);
    const character = getBotCharacterForSeatIndex(sourceBot.seatIndex);
    await ctx.db.insert("players", {
      roomId: targetRoom._id,
      authUserId: buildDevBotAuthUserId(
        String(targetRoom._id),
        sourceBot.seatIndex,
      ),
      name: character.name,
      seatIndex: sourceBot.seatIndex,
      isHost: false,
      status: "active",
      readyStatus: true,
      lastSeenAt: now,
    });
    botsAdded += 1;
  }

  if (botsAdded > 0) {
    await ctx.db.patch(targetRoom._id, {
      lastActiveAt: now,
    });
  }

  return botsAdded;
}

async function addDevBotsToRoom(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  requestedCount: number,
) {
  const activePlayers = await ctx.db
    .query("players")
    .withIndex("roomId_status", (q) =>
      q.eq("roomId", room._id).eq("status", "active"),
    )
    .collect();

  const remainingSeats = room.maxPlayers - activePlayers.length;
  const botsToCreate = Math.min(
    Math.max(0, Math.floor(requestedCount)),
    remainingSeats,
  );

  if (botsToCreate === 0) {
    return { added: 0, totalActivePlayers: activePlayers.length };
  }

  const occupiedSeats = new Set(activePlayers.map((player) => player.seatIndex));
  const now = Date.now();
  let created = 0;

  for (let i = 0; i < botsToCreate; i++) {
    const seatIndex = findFirstAvailableSeat(occupiedSeats, room.maxPlayers);
    if (seatIndex === null) break;

    occupiedSeats.add(seatIndex);
    const character = getBotCharacterForSeatIndex(seatIndex);
    await ctx.db.insert("players", {
      roomId: room._id,
      authUserId: buildDevBotAuthUserId(String(room._id), seatIndex),
      name: character.name,
      seatIndex,
      isHost: false,
      status: "active",
      readyStatus: true,
      lastSeenAt: now,
    });
    created += 1;
  }

  await ctx.db.patch(room._id, {
    status: "open",
    lastActiveAt: now,
  });

  return {
    added: created,
    totalActivePlayers: activePlayers.length + created,
  };
}

async function getActiveAuthedPlayerInRoom(
  ctx: MutationCtx | QueryCtx,
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

async function getHistoricalAuthedPlayersInRoom(
  ctx: MutationCtx | QueryCtx,
  roomId: Id<"rooms">,
  authUserId: string,
) {
  return await ctx.db
    .query("players")
    .withIndex("roomId", (q) => q.eq("roomId", roomId))
    .filter((q) => q.eq(q.field("authUserId"), authUserId))
    .collect();
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

async function getRoomByCode(ctx: MutationCtx | QueryCtx, rawCode: string) {
  const code = normalizeRoomCode(rawCode);
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
    throw new ConvexError({
      code: "ROOM_NOT_FOUND",
      message: "Room does not exist.",
    });
  }

  return room;
}

async function getAuthUserByPlayerAuthUserId(
  ctx: MutationCtx | QueryCtx,
  authUserId: string | undefined,
) {
  if (!authUserId || authUserId.startsWith("dev-bot:")) {
    return null;
  }

  return await authComponent.getAnyUserById(ctx, authUserId);
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

    if (shouldCreateReplacementOpenRoom(room)) {
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
    status: room.status === "open" ? "open" : room.status,
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

export const createTutorialBotRoom = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await createRoomWithHostOptions(ctx, args.name, {
      tutorialId: FIRST_BOT_GAME_TUTORIAL_ID,
    });
    const roomDoc = await ctx.db.get(room.roomId);
    if (!roomDoc) {
      throw new ConvexError({
        code: "ROOM_NOT_FOUND",
        message: "Tutorial room could not be created.",
      });
    }

    await addDevBotsToRoom(ctx, roomDoc, 3);
    await createGameForRoomHandler(ctx, { roomId: String(room.roomId) });

    return room;
  },
});

export const restartTutorialRoom = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const room = await getRoomByCode(ctx, args.code);
    if (room.tutorialId !== FIRST_BOT_GAME_TUTORIAL_ID) {
      throw new ConvexError({
        code: "NOT_TUTORIAL_ROOM",
        message: "This room is not a tutorial table.",
      });
    }

    const activePlayer = await getActiveAuthedPlayerInRoom(ctx, room._id, authUserId);
    if (!activePlayer) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You must be seated in this tutorial room to restart it.",
      });
    }

    const reset = await resetTutorialGameForRoomHandler(ctx, {
      roomId: room._id,
    });

    await ctx.db.patch(room._id, {
      status: "open",
      lastActiveAt: Date.now(),
      hostPlayerId: room.hostPlayerId ?? activePlayer._id,
    });

    return {
      ok: reset.ok,
      code: room.code,
      roomId: room._id,
      gameId: reset.gameId,
      status: reset.status,
    };
  },
});

export const startTutorialShowdown = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const room = await getRoomByCode(ctx, args.code);
    if (room.tutorialId !== FIRST_BOT_GAME_TUTORIAL_ID) {
      throw new ConvexError({
        code: "NOT_TUTORIAL_ROOM",
        message: "This room is not a tutorial table.",
      });
    }

    const activePlayer = await getActiveAuthedPlayerInRoom(
      ctx,
      room._id,
      authUserId,
    );
    if (!activePlayer) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You must be seated in this tutorial room to start showdown.",
      });
    }

    const game = await ctx.db
      .query("games")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", String(room._id)).eq("status", "active"),
      )
      .unique();

    if (!game) {
      throw new ConvexError({
        code: "GAME_NOT_FOUND",
        message: "No active tutorial game was found.",
      });
    }

    if (game.stage !== "showdown") {
      throw new ConvexError({
        code: "INVALID_GAME_STAGE",
        message: "Tutorial showdown can only be started during showdown.",
      });
    }

    if (game.showdownStartedAt !== undefined) {
      return {
        ok: true,
        gameId: game._id,
        showdownStartedAt: game.showdownStartedAt,
        alreadyStarted: true,
      };
    }

    const now = Date.now();
    await ctx.db.patch(game._id, {
      showdownStartedAt: now,
      updatedAt: now,
    });
    await scheduleBotTurnIfNeeded(ctx, game._id);

    return {
      ok: true,
      gameId: game._id,
      showdownStartedAt: now,
      alreadyStarted: false,
    };
  },
});

export const resumeTutorialBetting = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const room = await getRoomByCode(ctx, args.code);
    if (room.tutorialId !== FIRST_BOT_GAME_TUTORIAL_ID) {
      throw new ConvexError({
        code: "NOT_TUTORIAL_ROOM",
        message: "This room is not a tutorial table.",
      });
    }

    const activePlayer = await getActiveAuthedPlayerInRoom(
      ctx,
      room._id,
      authUserId,
    );
    if (!activePlayer) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You must be seated in this tutorial room to continue playing.",
      });
    }

    const game = await ctx.db
      .query("games")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", String(room._id)).eq("status", "active"),
      )
      .unique();

    if (!game) {
      throw new ConvexError({
        code: "GAME_NOT_FOUND",
        message: "No active tutorial game was found.",
      });
    }

    if (game.stage === "showdown" || game.stage === "final") {
      throw new ConvexError({
        code: "INVALID_GAME_STAGE",
        message: "Tutorial betting can only be resumed during betting rounds.",
      });
    }

    if (game.turnStartedAt !== undefined) {
      return {
        ok: true,
        gameId: game._id,
        turnStartedAt: game.turnStartedAt,
        alreadyStarted: true,
      };
    }

    const now = Date.now();
    await ctx.db.patch(game._id, {
      turnStartedAt: now,
      updatedAt: now,
      turnClockCalledAt: undefined,
      turnClockExpiresAt: undefined,
      turnClockCallerPlayerId: undefined,
      turnClockTargetPlayerId: undefined,
    });
    await scheduleBotTurnIfNeeded(ctx, game._id);

    return {
      ok: true,
      gameId: game._id,
      turnStartedAt: now,
      alreadyStarted: false,
    };
  },
});

export const joinRoom = mutation({
  args: {
    code: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
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

    let room = await getRoomByCode(ctx, args.code);
    await reapInactivePlayersForRoom(ctx, room, Date.now());
    const refreshedRoom = await ctx.db.get(room._id);
    if (!refreshedRoom) {
      throw new ConvexError({
        code: "ROOM_NOT_FOUND",
        message: "Room does not exist.",
      });
    }
    room = refreshedRoom;

    if (room.status !== "open") {
      throw new ConvexError({
        code: "ROOM_CLOSED",
        message: "Room is closed.",
      });
    }

    if (isTutorialRoom(room)) {
      const historicalPlayers = await getHistoricalAuthedPlayersInRoom(
        ctx,
        room._id,
        authUserId,
      );
      if (historicalPlayers.length === 0) {
        throw new ConvexError({
          code: "TUTORIAL_ROOM_PRIVATE",
          message: "This tutorial table is reserved for its original player.",
        });
      }
    }

    const existingAuthedPlayer = await getAnyActiveAuthedPlayer(
      ctx,
      authUserId,
    );
    if (existingAuthedPlayer) {
      if (existingAuthedPlayer.roomId !== room._id) {
        await leavePlayer(ctx, existingAuthedPlayer);
      } else {
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
    }
    return await joinAuthenticatedUserToRoom(ctx, room, authUserId, name);
  },
});

async function rejoinRoomMember(
  ctx: MutationCtx,
  args: {
    code: string;
    name?: string;
    defaultName?: string;
  },
) {
  const authUserId = await getAuthenticatedUserId(ctx);
  if (!authUserId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }

  const room = await getRoomByCode(ctx, args.code);
  const now = Date.now();
  const activePlayer = await getActiveAuthedPlayerInRoom(ctx, room._id, authUserId);
  if (activePlayer) {
    await ctx.db.patch(activePlayer._id, { lastSeenAt: now });
    await ctx.db.patch(room._id, {
      status: "open",
      lastActiveAt: now,
      hostPlayerId: room.hostPlayerId ?? activePlayer._id,
    });
    return {
      roomId: room._id,
      code: room.code,
      playerId: activePlayer._id,
      seatIndex: activePlayer.seatIndex,
      maxPlayers: room.maxPlayers,
      rejoined: true,
    };
  }

  const historicalPlayers = await getHistoricalAuthedPlayersInRoom(
    ctx,
    room._id,
    authUserId,
  );

  if (isTutorialRoom(room) && historicalPlayers.length === 0) {
    throw new ConvexError({
      code: "TUTORIAL_ROOM_PRIVATE",
      message: "This tutorial table is reserved for its original player.",
    });
  }

  const activePlayers = await ctx.db
    .query("players")
    .withIndex("roomId_status", (q) =>
      q.eq("roomId", room._id).eq("status", "active"),
    )
    .collect();

  const occupiedSeats = new Set(activePlayers.map((player) => player.seatIndex));
  const reusablePlayer =
    [...historicalPlayers].sort((a, b) => b.lastSeenAt - a.lastSeenAt)[0] ?? null;

  const seatIndex =
    reusablePlayer && !occupiedSeats.has(reusablePlayer.seatIndex)
      ? reusablePlayer.seatIndex
      : findFirstAvailableSeat(occupiedSeats, room.maxPlayers);

  if (seatIndex === null) {
    throw new ConvexError({
      code: "ROOM_FULL",
      message: "No available seats in room.",
    });
  }

  const fallbackName = normalizeName(args.name ?? "");
  const nextName =
    reusablePlayer?.name ??
    (fallbackName.length > 0
      ? fallbackName
      : args.defaultName ?? "Player");

  if (reusablePlayer) {
    await ctx.db.patch(reusablePlayer._id, {
      name: nextName,
      seatIndex,
      status: "active",
      readyStatus: false,
      isHost: activePlayers.length === 0 || room.hostPlayerId === reusablePlayer._id,
      lastSeenAt: now,
    });
    await ctx.db.patch(room._id, {
      status: "open",
      lastActiveAt: now,
      hostPlayerId:
        activePlayers.length === 0 || !room.hostPlayerId
          ? reusablePlayer._id
          : room.hostPlayerId,
    });
    return {
      roomId: room._id,
      code: room.code,
      playerId: reusablePlayer._id,
      seatIndex,
      maxPlayers: room.maxPlayers,
      rejoined: true,
    };
  }

  const createdPlayerId = await ctx.db.insert("players", {
    roomId: room._id,
    authUserId,
    name: nextName,
    seatIndex,
    isHost: activePlayers.length === 0,
    status: "active",
    readyStatus: false,
    lastSeenAt: now,
  });

  await ctx.db.patch(room._id, {
    status: "open",
    lastActiveAt: now,
    hostPlayerId: activePlayers.length === 0 ? createdPlayerId : room.hostPlayerId,
  });

  return {
    roomId: room._id,
    code: room.code,
    playerId: createdPlayerId,
    seatIndex,
    maxPlayers: room.maxPlayers,
    rejoined: false,
  };
}

export const rejoinRoomByCode = mutation({
  args: {
    code: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await rejoinRoomMember(ctx, { ...args, defaultName: "Player" });
  },
});

export const debugRejoinRoom = mutation({
  args: {
    code: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await rejoinRoomMember(ctx, { ...args, defaultName: "Dev Player" });
  },
});

export const debugFillRoomWithBots = mutation({
  args: {
    code: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
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

export const archiveRoomByCode = mutation({
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

    const latestGame = await ctx.db
      .query("games")
      .withIndex("by_room", (q) => q.eq("roomId", String(room._id)))
      .order("desc")
      .first();

    if (latestGame && latestGame.status !== "completed") {
      throw new ConvexError({
        code: "GAME_NOT_COMPLETED",
        message: "Only completed rooms can be archived for a new hand.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(room._id, {
      status: "closed",
      lastActiveAt: now,
    });

    return {
      ok: true,
      roomId: room._id,
      code: room.code,
      status: "closed" as const,
    };
  },
});

export const continueToNextRoom = mutation({
  args: {
    code: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
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

    const room = await getRoomByCode(ctx, args.code);
    const latestGame = await ctx.db
      .query("games")
      .withIndex("by_room", (q) => q.eq("roomId", String(room._id)))
      .order("desc")
      .first();

    if (!latestGame || latestGame.status !== "completed") {
      throw new ConvexError({
        code: "GAME_NOT_COMPLETED",
        message: "The room must have a completed game before continuing.",
      });
    }

    const activePlayer = await getActiveAuthedPlayerInRoom(ctx, room._id, authUserId);
    if (!activePlayer) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You are not an active member of this room.",
      });
    }

    let nextRoom = await findContinuationRoom(ctx, room);

    if (!nextRoom || nextRoom.status !== "open") {
      const { roomId: nextRoomId } = await createOpenRoom(ctx, {
        sourceRoomId: room._id,
      });
      await ctx.db.patch(room._id, {
        status: "closed",
        nextRoomId,
        lastActiveAt: Date.now(),
      });
      nextRoom = await ctx.db.get(nextRoomId);
    } else if (room.nextRoomId !== nextRoom._id) {
      await ctx.db.patch(room._id, {
        status: "closed",
        nextRoomId: nextRoom._id,
        lastActiveAt: Date.now(),
      });
    }

    if (!nextRoom || nextRoom.status !== "open") {
      throw new ConvexError({
        code: "NEXT_ROOM_UNAVAILABLE",
        message: "The next room is not available.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(room._id, {
      status: "closed",
      nextRoomId: nextRoom._id,
      lastActiveAt: now,
    });
    await syncOfflineBotsToRoom(ctx, room._id, nextRoom, now);

    return await joinAuthenticatedUserToRoom(
      ctx,
      nextRoom,
      authUserId,
      name,
      activePlayer.seatIndex,
    );
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
    const inactiveCleanup = await reapInactivePlayersAcrossOpenRooms(ctx);
    const staleClosed = await closeStaleScoreboardRooms(ctx);
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

    const rooms = (await ctx.db
      .query("rooms")
      .withIndex("status_lastActiveAt", (q) => q.eq("status", "open"))
      .collect()).filter((room) => !isTutorialRoom(room));

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
  args: {
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const inactiveCleanup = await reapInactivePlayersAcrossOpenRooms(ctx);
    const staleClosed = await closeStaleScoreboardRooms(ctx);
    const now = Date.now();
    const openRooms = (await ctx.db
      .query("rooms")
      .withIndex("status_lastActiveAt", (q) => q.eq("status", "open"))
      .collect()).filter((room) => !isTutorialRoom(room));

    let closed = 0;
    for (const room of openRooms) {
      const activePlayers = await ctx.db
        .query("players")
        .withIndex("roomId_status", (q) =>
          q.eq("roomId", room._id).eq("status", "active"),
        )
        .collect();

      if (activePlayers.length > 0) continue;

      await ctx.db.patch(room._id, {
        status: "closed",
        hostPlayerId: undefined,
        lastActiveAt: now,
      });
      closed += 1;
    }

    const requestedCount = Math.max(1, Math.floor(args.count ?? 1));
    const roomsToCreate = requestedCount;
    for (let i = 0; i < roomsToCreate; i++) {
      await createOpenRoom(ctx);
    }

    const remainingOpenRooms = (await ctx.db
      .query("rooms")
      .withIndex("status_lastActiveAt", (q) => q.eq("status", "open"))
      .collect()).filter((room) => !isTutorialRoom(room));

    return {
      closed: closed + staleClosed + inactiveCleanup.roomsClosed,
      created: roomsToCreate,
      openRooms: remainingOpenRooms.length,
      inactivePlayersRemoved: inactiveCleanup.stalePlayersRemoved,
    };
  },
});

export const listRooms = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rooms = (await ctx.db
      .query("rooms")
      .withIndex("status_lastActiveAt", (q) => q.eq("status", "open"))
      .order("desc")
      .take(40)).filter((room) => !isTutorialRoom(room)).slice(0, 20);

    const result = [];
    for (const room of rooms) {
      const activePlayers = (await getActivePlayersInRoom(ctx, room._id)).filter(
        (player) => !isPlayerInactive(player, now),
      );
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
    const now = Date.now();
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

    const activePlayers = (await getActivePlayersInRoom(ctx, room._id)).filter(
      (player) => !isPlayerInactive(player, now),
    );

    activePlayers.sort((a, b) => a.seatIndex - b.seatIndex);

    let viewerPlayerId: Id<"players"> | null = null;
    let viewerSeatPreview:
      | {
          seatIndex: number;
          name: string;
        }
      | null = null;
    const authUserId = await getAuthenticatedUserId(ctx);
    if (authUserId) {
      const viewerPlayer =
        activePlayers.find((player) => player.authUserId === authUserId) ??
        null;
      viewerPlayerId = viewerPlayer?._id ?? null;

      if (!viewerPlayerId) {
        const historicalViewerPlayers = await ctx.db
          .query("players")
          .withIndex("roomId", (q) => q.eq("roomId", room._id))
          .filter((q) => q.eq(q.field("authUserId"), authUserId))
          .collect();

        const occupiedSeats = new Set(activePlayers.map((player) => player.seatIndex));
        const latestViewerPlayer =
          [...historicalViewerPlayers].sort((a, b) => b.lastSeenAt - a.lastSeenAt)[0] ??
          null;

        if (
          latestViewerPlayer &&
          !occupiedSeats.has(latestViewerPlayer.seatIndex)
        ) {
          viewerSeatPreview = {
            seatIndex: latestViewerPlayer.seatIndex,
            name: latestViewerPlayer.name,
          };
        }
      }
    }

    const members = await Promise.all(
      activePlayers.map(async (player) => {
        const authUser = await getAuthUserByPlayerAuthUserId(
          ctx,
          player.authUserId,
        );

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
      .withIndex("authUserId_status", (q) =>
        q.eq("authUserId", authUserId).eq("status", "active"),
      )
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

    const waitingGame = await ctx.db
      .query("games")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", String(room._id)).eq("status", "waiting")
      )
      .unique();

    if (!waitingGame) {
      const activeGame = await ctx.db
        .query("games")
        .withIndex("by_room_status", (q) =>
          q.eq("roomId", String(room._id)).eq("status", "active")
        )
        .unique();

      throw new ConvexError({
        code: activeGame ? "GAME_ALREADY_ACTIVE" : "NO_WAITING_GAME",
        message: activeGame
          ? "The next hand already started."
          : "There is no next hand waiting for ready checks.",
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

    const allReady =
      allPlayers.length >= 2 && allPlayers.every((p) => p.readyStatus);

    // If all players are ready, auto-start the game
    if (allReady && newReadyStatus) {
      const game = await ctx.db
        .query("games")
        .withIndex("by_room_status", (q) =>
          q.eq("roomId", String(room._id)).eq("status", "waiting")
        )
        .unique();

      if (game) {
        await internalStartGameHandler(ctx, {
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

    // Delete all word submissions
    const allWordSubmissions = await ctx.db.query("wordSubmissions").collect();
    for (const submission of allWordSubmissions) {
      await ctx.db.delete(submission._id);
    }

    // Delete all games
    const allGames = await ctx.db.query("games").collect();
    for (const game of allGames) {
      await ctx.db.delete(game._id);
    }

    // Delete all room messages
    const allMessages = await ctx.db.query("messages").collect();
    for (const message of allMessages) {
      await ctx.db.delete(message._id);
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
        wordSubmissions: allWordSubmissions.length,
        games: allGames.length,
        messages: allMessages.length,
        players: allPlayers.length,
        rooms: allRooms.length,
      },
    };
  },
});
