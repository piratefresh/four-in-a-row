import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Convex API helpers for seeding test rooms/games and cleanup.
 *
 * Tests run against a real Convex deployment. The CONVEX_URL env var
 * should point to the deployment (e.g. http://127.0.0.1:3210 for local dev).
 */

const CONVEX_URL = process.env.CONVEX_URL ?? "http://127.0.0.1:3210";

export function createConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(CONVEX_URL);
}

export type TestRoomResult = {
  roomId: Id<"rooms">;
  code: string;
  playerId: Id<"players">;
  seatIndex: number;
  maxPlayers: number;
};

/**
 * Create a test room with a given number of bots, all marked ready.
 * Returns the room info so tests can navigate to it.
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

  // Create room (auth required — we rely on cookie/session from Playwright login)
  const room = await client.mutation(api.rooms.createRoom, {
    name: playerName,
  });

  // Fill with bots
  const botCount = options.botCount ?? 2;
  if (botCount > 0) {
    await client.mutation(api.rooms.debugFillRoomWithBots, {
      code: room.code,
      count: botCount,
    });
  }

  // Create a game for the room
  await client.mutation(api.games.createGameForRoom, {
    roomId: String(room.roomId),
  });

  // If ready, toggle ready to start the game
  if (options.ready) {
    await client.mutation(api.rooms.toggleReady, {
      code: room.code,
    });

    // Bots are already ready=true from debugFillRoomWithBots,
    // but we need all players ready to auto-start.
    // The human player just toggled ready above.
  }

  return room;
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
