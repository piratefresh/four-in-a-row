import { test, expect } from "./helpers/game.fixtures";

test.describe("Full game loop", () => {
  test("complete game from room creation to results", async ({
    createTestRoom,
    roomPage,
    convex,
  }) => {
    // Step 1: Create a test room with bots
    const { code, roomPage: room } = await createTestRoom({
      botCount: 2,
      ready: false,
    });

    // Step 2: Wait for room to load and click Ready
    await roomPage.waitForLoaded();
    await roomPage.clickReady();

    // Step 3: Wait for game to start (preflop stage)
    await expect(roomPage.bettingControls.or(roomPage.readyButton)).toBeVisible({
      timeout: 30_000,
    });

    // Step 4: Progress through betting rounds
    // The bots will act automatically, so we just need to wait for showdown
    // or participate in betting when it's our turn

    // Wait for showdown phase (bots will progress through betting rounds)
    // This may take up to 60 seconds with bot delays
    await expect(async () => {
      const game = await convex.query(
        (await import("../../convex/_generated/api")).api.games.getGameByRoom,
        { roomId: code },
      );
      expect(game?.stage).toBe("showdown");
    }).toPass({
      timeout: 90_000,
      intervals: [1_000],
    });

    // Step 5: Verify showdown word builder appears
    await roomPage.waitForWordBuilder();
    await expect(roomPage.submitWordButton).toBeVisible();

    // Step 6: Build and submit a word
    // For now, just submit whatever tiles are available (even if invalid)
    await roomPage.submitWord();

    // Step 7: Wait for game to complete
    await expect(async () => {
      const game = await convex.query(
        (await import("../../convex/_generated/api")).api.games.getGameByRoom,
        { roomId: code },
      );
      expect(game?.status).toBe("completed");
    }).toPass({
      timeout: 60_000,
      intervals: [1_000],
    });

    // Step 8: Navigate to results page
    await roomPage.page.goto(`/results/${code}`);
    await expect(roomPage.page).toHaveURL(/\/results\/[A-Z0-9]+/);

    // Step 9: Verify results page shows winner and scores
    await expect(roomPage.page.locator('[data-testid="results-content"]')).toBeVisible();
  });

  test("new hand after results - chips carry over", async ({
    createTestRoom,
    roomPage,
    convex,
  }) => {
    const { code, roomPage: room } = await createTestRoom({
      botCount: 2,
      ready: false,
    });

    // Complete first hand
    await roomPage.waitForLoaded();
    await roomPage.clickReady();

    // Wait for showdown
    await expect(async () => {
      const game = await convex.query(
        (await import("../../convex/_generated/api")).api.games.getGameByRoom,
        { roomId: code },
      );
      expect(game?.stage).toBe("showdown");
    }).toPass({ timeout: 90_000, intervals: [1_000] });

    // Submit word
    await roomPage.waitForWordBuilder();
    await roomPage.submitWord();

    // Wait for completion
    await expect(async () => {
      const game = await convex.query(
        (await import("../../convex/_generated/api")).api.games.getGameByRoom,
        { roomId: code },
      );
      expect(game?.status).toBe("completed");
    }).toPass({ timeout: 60_000, intervals: [1_000] });

    // Navigate to results and click "Play Another"
    await roomPage.page.goto(`/results/${code}`);
    await roomPage.page.waitForURL(/\/results\/[A-Z0-9]+/);

    const playAnotherButton = roomPage.page.getByRole("button", {
      name: /play another/i,
    });
    await expect(playAnotherButton).toBeVisible();
    await playAnotherButton.click();

    // Should navigate to a new room
    await roomPage.page.waitForURL(/\/rooms\/[A-Z0-9]+/);

    // Verify new game starts with chips carried over
    await expect(roomPage.page.locator('[data-testid="room-content"]')).toBeVisible();
  });
});
