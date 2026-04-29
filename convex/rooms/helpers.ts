import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_CODE_MAX_ATTEMPTS,
} from "../constants";
export { ROOM_CODE_LENGTH };
import { ConvexError } from "convex/values";
import { authComponent, createAuth } from "../auth";
import type { AIDifficulty } from "../aiBettingConstants";
import type { RoomConfig } from "../gameConfig";

// ==================== Constants ====================

export const STALE_SCOREBOARD_ROOM_MS = 30 * 60 * 1000;
export const INACTIVE_PLAYER_TIMEOUT_MS = 4 * 60 * 1000;
export const FIRST_BOT_GAME_TUTORIAL_ID = "first-bot-game" as const;

// ==================== Types ====================

export type OfflineBotSourcePlayer = {
  authUserId?: string;
  seatIndex: number;
  lastSeenAt: number;
};

export type CreateOpenRoomOptions = {
  sourceRoomId?: Id<"rooms">;
  title?: string;
  tutorialId?: typeof FIRST_BOT_GAME_TUTORIAL_ID;
  isBotGame?: boolean;
  difficulty?: AIDifficulty;
  config?: RoomConfig;
};

// ==================== String Utilities ====================

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeRoomCode(code: string) {
  return code.trim().toUpperCase();
}

export function isLegacySeedHostName(name: string) {
  return /^Host \d+$/.test(name);
}

// ==================== Room Code Generation ====================

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

export async function generateUniqueRoomCode(ctx: MutationCtx) {
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

// ==================== Seat Management ====================

export function findFirstAvailableSeat(
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

// ==================== Bot Utilities ====================

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

// ==================== Room State Utilities ====================

export function isTutorialRoom(room: Pick<Doc<"rooms">, "tutorialId">) {
  return room.tutorialId !== undefined;
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

export function isPlayerInactive(
  player: Pick<Doc<"players">, "lastSeenAt" | "authUserId">,
  now: number,
) {
  if (player.authUserId?.startsWith("dev-bot:")) {
    return false;
  }

  return now - player.lastSeenAt > INACTIVE_PLAYER_TIMEOUT_MS;
}

// ==================== Player Queries ====================

export async function getActivePlayersInRoom(
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

export async function getActiveAuthedPlayerInRoom(
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

export async function getHistoricalAuthedPlayersInRoom(
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

export async function getAnyActiveAuthedPlayer(
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

// ==================== Room Lookup ====================

export async function getRoomByCode(ctx: MutationCtx | QueryCtx, rawCode: string) {
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

// ==================== Auth Utilities ====================

export async function getAuthenticatedUserId(
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

export async function getAuthUserByPlayerAuthUserId(
  ctx: MutationCtx | QueryCtx,
  authUserId: string | undefined,
) {
  if (!authUserId || authUserId.startsWith("dev-bot:")) {
    return null;
  }

  return await authComponent.getAnyUserById(ctx, authUserId);
}
