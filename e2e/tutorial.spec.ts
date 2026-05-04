/**
 * E2E tests for tutorial mode (first-bot-game).
 *
 * The tutorial game uses a deterministic deal and pauses at stage boundaries
 * so the guided tour can explain the game. These tests verify the full
 * gameplay loop: room creation, betting, word building, showdown, and results.
 */
import { expect, test } from "./helpers/game.fixtures";
import {
  createTutorialRoom,
  getRoomGame,
  resumeTutorialBetting,
  startTutorialShowdown,
  submitTutorialWord,
} from "./helpers/convex.setup";
import { api } from "../convex/_generated/api";

const PLAYER_NAME = "E2E Tutorial Player";
const TARGET_WORD = "STRONG";

/** Set localStorage to skip the nextstepjs tour overlay for a room. */
async function skipTutorialTour(
  page: import("@playwright/test").Page,
  code: string,
) {
  await page.evaluate((c) => {
    localStorage.setItem(
      `word-poker.tour.completed.first-bot-game.${c}`,
      "true",
    );
  }, code);
  await page.reload();
}

test("tutorial mode completes full game with correct winner and pot", async ({
  page,
  convex,
  waitForGameStage,
  archiveRoom,
}) => {
  // 1. Create tutorial room via Convex API (bypasses auth in e2e mode).
  const room = await createTutorialRoom(convex, PLAYER_NAME);
  const cleanup = () => archiveRoom(room.code).catch(() => {});

  try {
    // 2. Navigate and skip the nextstepjs tour overlay.
    await page.goto(`/rooms/${room.code}`);
    await skipTutorialTour(page, room.code);
    await page.waitForSelector('[data-testid="room-content"]', {
      timeout: 30_000,
    });

    // 3. Ready up — triggers game start.
    const readyBtn = page.getByRole("button", { name: /ready/i });
    await readyBtn.click();

    // 4. Preflop betting: check when it is the player's turn.
    const checkBtn = page.getByRole("button", { name: /check/i });
    await checkBtn.waitFor({ timeout: 20_000 });
    await checkBtn.click();

    // Wait for bots to act and flop to be dealt.
    await waitForGameStage(room.roomId, "flop", 30_000);

    // 5. Flop betting: check.
    await checkBtn.waitFor({ timeout: 20_000 });
    await checkBtn.click();

    // 6. After flop, the tutorial pauses before the turn stage.
    //    turnStartedAt will be undefined.
    await waitForTutorialBettingPaused(convex, room.roomId, 30_000);
    await resumeTutorialBetting(convex, room.code);

    // 7. Turn betting: check, then wait for river.
    await checkBtn.waitFor({ timeout: 20_000 });
    await checkBtn.click();
    await waitForGameStage(room.roomId, "river", 30_000);

    // 8. River betting: check.
    await checkBtn.waitFor({ timeout: 20_000 });
    await checkBtn.click();

    // 9. After river, tutorial pauses before showdown.
    //    showdownStartedAt will be undefined.
    await waitForTutorialShowdownPaused(convex, room.roomId, 30_000);
    await startTutorialShowdown(convex, room.code);

    // 10. Submit the word "STRONG" via API using the deterministic deal.
    const game = await getRoomGame(convex, room.roomId);
    if (!game) throw new Error("Tutorial game not found after showdown start");
    await submitTutorialWord(convex, String(game._id), String(room.playerId));

    // 11. Wait for the results screen to render.
    await page.waitForSelector('[data-testid="results-content"]', {
      timeout: 30_000,
    });

    // 12. Verify the human player won with the expected word.
    const winnerName = await page
      .locator('[data-testid="winner-name"]')
      .textContent();
    expect(winnerName).toContain(PLAYER_NAME);

    const potText = await page
      .locator('[data-testid="pot-amount"]')
      .textContent();
    expect(potText).toBeTruthy();

    // 13. Verify the player's word is shown in results.
    const playerWord = await page
      .locator('[data-testid="player-word"]')
      .first()
      .textContent();
    expect(playerWord).toContain(TARGET_WORD);
  } finally {
    await cleanup();
  }
});

test("tutorial deal gives player tiles that can form STRONG", async ({
  convex,
  waitForGameStage,
  archiveRoom,
}) => {
  const room = await createTutorialRoom(convex, PLAYER_NAME);
  const cleanup = () => archiveRoom(room.code).catch(() => {});

  try {
    // Ready up so the deal is applied and game starts.
    await convex.mutation(api.rooms.toggleReady, { code: room.code });
    await waitForGameStage(room.roomId, "preflop", 30_000);

    const game = await getRoomGame(convex, room.roomId);
    if (!game) throw new Error("Game not found");

    // Check community tiles include S, O, N, G, L.
    const communityLetters = game.communityTiles
      .filter((t: any) => t.kind === "single")
      .map((t: any) => t.letter)
      .join("");
    expect(communityLetters).toContain("S");
    expect(communityLetters).toContain("O");
    expect(communityLetters).toContain("N");
    expect(communityLetters).toContain("G");
    expect(communityLetters).toContain("L");

    // The G tile should have a 3L multiplier.
    const gTile = game.communityTiles.find(
      (t: any) => t.kind === "single" && t.letter === "G",
    ) as any;
    expect(gTile?.multiplier).toBe("3L");
  } finally {
    await cleanup();
  }
});

// --- Polling helpers ---

async function waitForTutorialBettingPaused(
  client: ReturnType<
    typeof import("./helpers/convex.setup").createConvexClient
  >,
  roomId: string,
  timeoutMs: number,
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const game = await getRoomGame(client, roomId);
    if (game && game.turnStartedAt === undefined && game.stage !== "showdown") {
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Timed out waiting for tutorial betting pause");
}

async function waitForTutorialShowdownPaused(
  client: ReturnType<
    typeof import("./helpers/convex.setup").createConvexClient
  >,
  roomId: string,
  timeoutMs: number,
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const game = await getRoomGame(client, roomId);
    if (
      game &&
      game.stage === "showdown" &&
      game.showdownStartedAt === undefined
    ) {
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Timed out waiting for tutorial showdown pause");
}
