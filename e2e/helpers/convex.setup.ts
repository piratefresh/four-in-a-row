import { ConvexHttpClient } from "convex/browser";
import { loadEnv } from "vite";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const env = loadEnv("test", process.cwd(), "");
for (const [key, value] of Object.entries(env)) {
  process.env[key] ??= value;
}
if (process.env.CONVEX_TEST_URL) {
  process.env.VITE_CONVEX_URL = process.env.CONVEX_TEST_URL;
}

/**
 * Convex API helpers for seeding test rooms/games and cleanup.
 *
 * Tests run against a real Convex deployment. CONVEX_TEST_URL (preview)
 * is preferred, then VITE_CONVEX_URL (dev), otherwise local Convex dev.
 */

export const CONVEX_URL =
  process.env.CONVEX_TEST_URL ??
  process.env.VITE_CONVEX_URL ??
  "http://127.0.0.1:3210";

export const CONVEX_SITE_URL =
  process.env.CONVEX_TEST_SITE_URL ??
  process.env.VITE_CONVEX_SITE_URL ??
  "";

if (!process.env.CONVEX_TEST_URL && !process.env.VITE_CONVEX_URL) {
  console.warn(
    `[e2e] No CONVEX_TEST_URL / VITE_CONVEX_URL set — falling back to local Convex at ${CONVEX_URL}. ` +
    `Run "bun run deploy:preview" to create a preview deployment, then set CONVEX_TEST_URL.`,
  );
}

export function createConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(CONVEX_URL);
}

export type TestRoomResult = {
  roomId: string;
  code: string;
  playerId: Id<"players">;
  seatIndex: number;
  maxPlayers: number;
  authUserId: string;
};

/**
 * Create a test room with bots, no auth required.
 * Uses the e2eCreateTestRoom internal mutation which bypasses auth.
 */
export async function createTestRoom(
  client: ConvexHttpClient,
  options: {
    playerName?: string;
    botCount?: number;
    ready?: boolean;
  } = {},
): Promise<TestRoomResult> {
  const playerName = options.playerName ?? `TestPlayer-${Date.now()}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const room = await (client as any).mutation(
    "rooms:e2eCreateTestRoom",
    {
      playerName,
      botCount: options.botCount ?? 2,
    },
  );

  // Create a game for the room
  await client.mutation(api.games.createGameForRoom, {
    roomId: room.roomId,
  });

  // If ready, toggle ready to start the game
  if (options.ready) {
    await client.mutation(api.rooms.toggleReady, {
      code: room.code,
    });
  }

  return {
    roomId: room.roomId,
    code: room.code,
    playerId: room.playerId,
    seatIndex: room.seatIndex,
    maxPlayers: room.maxPlayers,
    authUserId: room.authUserId,
  };
}

/**
 * Get the current game state for a room.
 */
export async function getRoomGame(client: ConvexHttpClient, roomId: string) {
  return client.query(api.games.getGameByRoom, { roomId });
}

/**
 * Wait until the game reaches a specific stage.
 */
export async function waitForGameStage(
  client: ConvexHttpClient,
  roomId: string,
  targetStage: string,
  timeoutMs = 30_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const game = await getRoomGame(client, roomId);
    if (game && game.stage === targetStage) {
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Timed out waiting for game stage "${targetStage}" after ${timeoutMs}ms`,
  );
}

/**
 * Wait until the game status changes.
 */
export async function waitForGameStatus(
  client: ConvexHttpClient,
  roomId: string,
  targetStatus: string,
  timeoutMs = 30_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const game = await getRoomGame(client, roomId);
    if (game && game.status === targetStatus) {
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Timed out waiting for game status "${targetStatus}" after ${timeoutMs}ms`,
  );
}

/**
 * Archive (close) a room by code for cleanup.
 */
export async function archiveRoom(
  client: ConvexHttpClient,
  code: string,
): Promise<void> {
  try {
    await client.mutation(api.rooms.archiveRoomByCode, { code });
  } catch {
    // Room may already be closed or player may have left — ignore
  }
}

/**
 * Leave the current room for cleanup.
 */
export async function leaveCurrentRoom(
  client: ConvexHttpClient,
): Promise<void> {
  try {
    await client.mutation(api.rooms.leaveCurrentRoom);
  } catch {
    // Already left or not in a room — ignore
  }
}
