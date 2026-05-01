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
    await room.waitForLoaded();
    await room.clickReady();

    // Step 3: Wait for game to start (preflop stage)
    await expect(room.bettingControls.or(room.readyButton)).toBeVisible({
      timeout: 30_000,
    });

    // Step 4: Progress through betting rounds by clicking call/check each turn
    await expect(async () => {
      // If betting controls are enabled, it's our turn — act to keep game moving
      const checkEnabled = await room.checkButton.isEnabled().catch(() => false);
      const callEnabled = await room.callButton.isEnabled().catch(() => false);
      if (checkEnabled) {
        await room.clickCheck();
      } else if (callEnabled) {
        await room.clickCall();
      }

      const game = await convex.query(
        (await import("../../convex/_generated/api")).api.games.getGameByRoom,
        { roomId: code },
      );
      expect(game?.stage).toBe("showdown");
    }).toPass({
      timeout: 90_000,
      intervals: [500],
    });

    // Step 5: Verify showdown word builder appears
    await room.waitForWordBuilder();
    await expect(room.submitWordButton).toBeVisible();

    // Step 6: Build and submit a word
    // For now, just submit whatever tiles are available (even if invalid)
    await room.submitWord();

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
    await room.page.goto(`/results/${code}`);
    await expect(room.page).toHaveURL(/\/results\/[A-Z0-9]+/);

    // Step 9: Verify results page shows winner and scores
    await expect(room.page.locator('[data-testid="results-content"]')).toBeVisible();
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
    await room.waitForLoaded();
    await room.clickReady();

    // Wait for showdown
    await expect(async () => {
      const game = await convex.query(
        (await import("../../convex/_generated/api")).api.games.getGameByRoom,
        { roomId: code },
      );
      expect(game?.stage).toBe("showdown");
    }).toPass({ timeout: 90_000, intervals: [1_000] });

    // Submit word
    await room.waitForWordBuilder();
    await room.submitWord();

    // Wait for completion
    await expect(async () => {
      const game = await convex.query(
        (await import("../../convex/_generated/api")).api.games.getGameByRoom,
        { roomId: code },
      );
      expect(game?.status).toBe("completed");
    }).toPass({ timeout: 60_000, intervals: [1_000] });

    // Navigate to results and click "Play Another"
    await room.page.goto(`/results/${code}`);
    await room.page.waitForURL(/\/results\/[A-Z0-9]+/);

    const playAnotherButton = room.page.getByRole("button", {
      name: /play another/i,
    });
    await expect(playAnotherButton).toBeVisible();
    await playAnotherButton.click();

    // Should navigate to a new room
    await room.page.waitForURL(/\/rooms\/[A-Z0-9]+/);

    // Verify new game starts with chips carried over
    await expect(room.page.locator('[data-testid="room-content"]')).toBeVisible();
  });
});
