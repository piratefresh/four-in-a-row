import { test as base } from "@playwright/test";
import {
  createConvexClient,
  createTestRoom,
  waitForGameStage,
  waitForGameStatus,
  archiveRoom,
  leaveCurrentRoom,
} from "./convex.setup";
import { createAuthenticatedClient } from "./auth.setup";
import { HomePage } from "../page-objects/home-page";
import { RoomPage } from "../page-objects/room-page";
import { ResultsPage } from "../page-objects/results-page";

type TestFixtures = {
  /** Navigate to home page and get page object */
  homePage: HomePage;
  /** Get room page object for a given room code */
  roomPage: (code: string) => RoomPage;
  /** Get results page object for a given room code */
  resultsPage: (code: string) => ResultsPage;
  /** Authenticated Convex HTTP client for direct API calls */
  convex: ReturnType<typeof createConvexClient>;
  /**
   * Create a test room with bots and return its info.
   * Automatically navigates to the room.
   */
  createTestRoom: (options?: {
    botCount?: number;
    ready?: boolean;
  }) => Promise<{
    code: string;
    roomPage: RoomPage;
  }>;
  /**
   * Wait for game to reach a specific stage via Convex polling.
   */
  waitForGameStage: (
    roomId: string,
    stage: string,
    timeoutMs?: number,
  ) => Promise<void>;
  /**
   * Wait for game status to change via Convex polling.
   */
  waitForGameStatus: (
    roomId: string,
    status: string,
    timeoutMs?: number,
  ) => Promise<void>;
  /**
   * Cleanup: archive room after test.
   */
  archiveRoom: (code: string) => Promise<void>;
};

export const test = base.extend<TestFixtures>({
  convex: async ({}, use) => {
    const client = createAuthenticatedClient();
    await use(client);
  },

  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await use(homePage);
  },

  roomPage: async ({ page }, use) => {
    const roomPageFactory = (code: string) => new RoomPage(page, code);
    await use(roomPageFactory);
  },

  resultsPage: async ({ page }, use) => {
    const resultsPageFactory = (code: string) => new ResultsPage(page, code);
    await use(resultsPageFactory);
  },

  createTestRoom: async ({ page, convex }, use) => {
    const createdRooms: string[] = [];

    const createTestRoomFn = async (options?: {
      botCount?: number;
      ready?: boolean;
    }) => {
      const room = await createTestRoom(convex, {
        botCount: options?.botCount ?? 2,
        ready: options?.ready,
      });
      createdRooms.push(room.code);

      const roomPage = new RoomPage(page, room.code);
      await roomPage.goto();
      await roomPage.waitForLoaded();

      return { code: room.code, roomPage };
    };

    await use(createTestRoomFn);

    for (const code of createdRooms) {
      await archiveRoom(convex, code);
    }
  },

  waitForGameStage: async ({ convex }, use) => {
    await use(async (roomId, stage, timeoutMs) => {
      await waitForGameStage(convex, roomId, stage, timeoutMs);
    });
  },

  waitForGameStatus: async ({ convex }, use) => {
    await use(async (roomId, status, timeoutMs) => {
      await waitForGameStatus(convex, roomId, status, timeoutMs);
    });
  },

  archiveRoom: async ({ convex }, use) => {
    await use(async (code) => {
      await archiveRoom(convex, code);
    });
  },
});

export { expect } from "@playwright/test";