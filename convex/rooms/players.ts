import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import {
  normalizeName,
  findFirstAvailableSeat,
  getOfflineBotSourcePlayers,
  isTutorialRoom,
  getActivePlayersInRoom,
  getAnyActiveAuthedPlayer,
  getActiveAuthedPlayerInRoom,
  getHistoricalAuthedPlayersInRoom,
  getRoomByCode,
  getAuthenticatedUserId,
} from "./helpers";
import { createOpenRoom } from "./lifecycle";
import { PLAYER_NAME_MAX_LENGTH, ROOM_MAX_PLAYERS } from "../constants";
import { buildDevBotAuthUserId, getBotCharacterForSeatIndex } from "../aiStrategy";
import { AI_DIFFICULTY, type AIDifficulty } from "../aiBettingConstants";
import { getRoomEconomyMode, type RoomConfig } from "../gameConfig";
import { recordRoomCreated } from "../activityFeed";
import { openTableSession, cashOutTableSession } from "../games/tableSession";
import { forfeitHandOnLeave } from "../games/gamesProgression";
import { DEV_BOT_AUTH_PREFIX } from "../games/gamesShared";
import { getWalletBalance } from "../wallet/ledger";

/**
 * Seat-session fields to seed on a brand-new bot seat. Bots have no wallet, so
 * a balance table seeds their stack directly with no debit; non-balance tables
 * leave the fields unset (chips are minted per hand). Table-stakes epic M1.
 */
function botSeatSessionFields(room: Doc<"rooms">) {
  if (getRoomEconomyMode(room) === "balance" && room.buyIn) {
    return { tableStack: room.buyIn, tableSessionVersion: 1, rebuyCount: 0 };
  }
  return {};
}

/**
 * Charge a freshly-seated human their fixed buy-in and seed the seat's table
 * stack. No-op for non-balance tables. Throws `INSUFFICIENT_FUNDS` (with a
 * seat-aware message) before any debit when the wallet cannot cover the buy-in.
 * Table-stakes epic M1.
 */
async function chargeBuyInForNewSeat(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  playerId: Id<"players">,
  authUserId: string,
  previousSessionVersion?: number,
) {
  if (getRoomEconomyMode(room) !== "balance" || !room.buyIn) return;

  const balance = await getWalletBalance(ctx, authUserId);
  if (balance === null || balance < room.buyIn) {
    throw new ConvexError({
      code: "INSUFFICIENT_FUNDS",
      message: `You need ${room.buyIn} coins to buy in to this table.`,
    });
  }

  await openTableSession(ctx, {
    playerId,
    authUserId,
    buyIn: room.buyIn,
    previousSessionVersion,
  });
}

// ==================== Leave Room ====================

export async function leavePlayer(ctx: MutationCtx, player: Doc<"players">) {
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

  // Table-stakes cash-out (M1.5). Forfeit any live hand (committed bets stay in
  // the pot), then credit the uncommitted table stack back to the wallet. The
  // seat is charged again only if it rejoins as a new session. Non-balance
  // seats have no table stack, so both calls are safe no-ops there.
  let cashedOut = 0;
  if (getRoomEconomyMode(room) === "balance") {
    await forfeitHandOnLeave(ctx, room._id, String(player._id));
    const fresh = await ctx.db.get(player._id);
    if (fresh) {
      const isBot = fresh.authUserId?.startsWith(DEV_BOT_AUTH_PREFIX) ?? false;
      const { creditedAmount } = await cashOutTableSession(ctx, {
        player: fresh,
        isBot,
      });
      cashedOut = creditedAmount;
    }
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

    return {
      ok: true,
      roomId: room._id,
      wasAlreadyLeft: false,
      roomStatus: "closed",
      cashedOut,
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
    cashedOut,
  };
}

// ==================== Join Room ====================

export async function joinAuthenticatedUserToRoom(
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

  // Fixed buy-in charged once, on confirmed join (table-stakes epic M1). A
  // brand-new seat has no prior session version, so this opens session v1.
  await chargeBuyInForNewSeat(ctx, room, playerId, authUserId);

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

// ==================== Bot Management ====================

export async function syncOfflineBotsToRoom(
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
      ...botSeatSessionFields(targetRoom),
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

export async function addDevBotsToRoom(
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
      ...botSeatSessionFields(room),
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

// ==================== Room Creation with Host ====================

export async function createRoomWithHostOptions(
  ctx: MutationCtx,
  rawName: string,
  options: {
    title?: string;
    tutorialId?: "first-bot-game";
    isBotGame?: boolean;
    difficulty?: AIDifficulty;
    config?: RoomConfig;
    economyMode?: "balance" | "nonBalance";
    buyIn?: number;
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
    title: options.title,
    tutorialId: options.tutorialId,
    isBotGame: options.isBotGame,
    difficulty: options.difficulty,
    config: options.config,
    economyMode: options.economyMode,
    buyIn: options.buyIn,
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

  // Creating a balance table performs the same confirmed buy-in for its host
  // (table-stakes epic M1).
  const createdRoom = await ctx.db.get(roomId);
  if (createdRoom) {
    await chargeBuyInForNewSeat(ctx, createdRoom, playerId, authUserId);
  }

  await ctx.db.patch(roomId, { hostPlayerId: playerId });

  if (!options.tutorialId) {
    await recordRoomCreated(ctx, {
      roomId,
      roomCode: code,
      playerName: name,
      roomTitle: options.title,
    });
  }

  return {
    roomId,
    code,
    playerId,
    seatIndex: 0,
    maxPlayers: ROOM_MAX_PLAYERS,
    tutorialId: options.tutorialId,
  };
}

export async function createRoomWithHost(
  ctx: MutationCtx,
  rawName: string,
  difficulty: AIDifficulty = AI_DIFFICULTY.MEDIUM,
  config?: RoomConfig,
  title?: string,
) {
  return createRoomWithHostOptions(ctx, rawName, { title, isBotGame: true, difficulty, config });
}

// ==================== Rejoin Room ====================

export async function rejoinRoomMember(
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
    // Reactivating a previously-left seat is a NEW table session → charge the
    // buy-in again, incrementing the session version (table-stakes epic M1).
    await chargeBuyInForNewSeat(
      ctx,
      room,
      reusablePlayer._id,
      authUserId,
      reusablePlayer.tableSessionVersion,
    );
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

  // Fresh seat via rejoin → confirmed buy-in (table-stakes epic M1).
  await chargeBuyInForNewSeat(ctx, room, createdPlayerId, authUserId);

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
