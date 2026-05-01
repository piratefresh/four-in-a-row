import { test, expect } from "./helpers/game.fixtures";

test.describe("Rejoin resilience", () => {
  test("rejoin after page refresh during betting", async ({
    createTestRoom,
    roomPage,
    convex,
  }) => {
    const { code, roomPage: room } = await createTestRoom({
      botCount: 2,
      ready: false,
    });

    await room.waitForLoaded();
    await room.clickReady();

    // Wait for betting controls to appear
    await room.waitForBettingControls();

    // Get current game state
    const gameBefore = await convex.query(
      (await import("../../convex/_generated/api")).api.games.getGameByRoom,
      { roomId: code },
    );
    expect(gameBefore?.status).toBe("active");

    // Refresh page
    await room.page.reload();

    // Wait for room to reload
    await room.waitForLoaded();

    // Game state should be preserved
    await expect(room.page.locator('[data-testid="room-content"]')).toBeVisible();

    // Betting controls or word builder should still be visible
    // depending on what stage we're at
    const hasBettingControls = await room.checkButton
      .isVisible()
      .catch(() => false);
    const hasWordBuilder = await room.wordBuilder
      .isVisible()
      .catch(() => false);

    expect(hasBettingControls || hasWordBuilder).toBe(true);
  });

  test("rejoin after page refresh during showdown", async ({
    createTestRoom,
    roomPage,
    convex,
  }) => {
    const { code, roomPage: room } = await createTestRoom({
      botCount: 2,
      ready: false,
    });

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

    await room.waitForWordBuilder();

    // Refresh page
    await room.page.reload();

    // Wait for room to reload
    await room.waitForLoaded();

    // Word builder should reappear
    await room.waitForWordBuilder();
    await expect(room.wordBuilder).toBeVisible();

    // Submit word button should be enabled
    await expect(room.submitWordButton).toBeEnabled();
  });

  test("rejoin after page refresh post-fold", async ({
    createTestRoom,
    roomPage,
    convex,
  }) => {
    const { code, roomPage: room } = await createTestRoom({
      botCount: 2,
      ready: false,
    });

    await room.waitForLoaded();
    await room.clickReady();

    // Wait for betting controls
    await room.waitForBettingControls();

    // Fold
    await room.clickFold();

    // Verify betting controls disappear
    await expect(room.bettingControls).not.toBeVisible({ timeout: 10_000 });

    // Refresh page
    await room.page.reload();

    // Wait for room to reload
    await room.waitForLoaded();

    // Should show that player is folded
    // Betting controls should not be visible
    await expect(room.bettingControls.or(room.wordBuilder)).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test("rejoin after game completed shows results", async ({
    createTestRoom,
    roomPage,
    convex,
  }) => {
    const { code, roomPage: room } = await createTestRoom({
      botCount: 2,
      ready: false,
    });

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

    await room.waitForWordBuilder();

    // Submit word
    await room.submitWord();

    // Wait for game to complete
    await expect(async () => {
      const game = await convex.query(
        (await import("../../convex/_generated/api")).api.games.getGameByRoom,
        { roomId: code },
      );
      expect(game?.status).toBe("completed");
    }).toPass({ timeout: 60_000, intervals: [1_000] });

    // Refresh page
    await room.page.reload();

    // Should redirect to results page
    await room.page.waitForURL(/\/results\/[A-Z0-9]+/);

    // Results content should be visible
    await expect(
      room.page.locator('[data-testid="results-content"]'),
    ).toBeVisible();
  });
});
