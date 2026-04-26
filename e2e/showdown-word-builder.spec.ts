import { test, expect } from "./helpers/game.fixtures";

test.describe("Showdown word builder", () => {
  test("word builder appears at showdown", async ({
    createTestRoom,
    roomPage,
    convex,
  }) => {
    const { code, roomPage: room } = await createTestRoom({
      botCount: 2,
      ready: false,
    });

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

    // Word builder should be visible
    await roomPage.waitForWordBuilder();
    await expect(roomPage.wordBuilder).toBeVisible();
  });

  test("tiles are displayed in word builder", async ({
    createTestRoom,
    roomPage,
    convex,
  }) => {
    const { code, roomPage: room } = await createTestRoom({
      botCount: 2,
      ready: false,
    });

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

    await roomPage.waitForWordBuilder();

    // Should have tiles available (private + community = 7 tiles)
    const tiles = roomPage.page.locator('[data-testid="rack-tile"]');
    await expect(tiles).toHaveCount({ min: 2, max: 7 });
  });

  test("submit word button is enabled during showdown", async ({
    createTestRoom,
    roomPage,
    convex,
  }) => {
    const { code, roomPage: room } = await createTestRoom({
      botCount: 2,
      ready: false,
    });

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

    await roomPage.waitForWordBuilder();
    await expect(roomPage.submitWordButton).toBeEnabled();
  });

  test("shuffle tiles button changes tile order", async ({
    createTestRoom,
    roomPage,
    convex,
  }) => {
    const { code, roomPage: room } = await createTestRoom({
      botCount: 2,
      ready: false,
    });

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

    await roomPage.waitForWordBuilder();

    // Get initial tile order
    const tiles = roomPage.page.locator('[data-testid="rack-tile"]');
    const initialOrder = await tiles.allTextContents();

    // Shuffle tiles
    await roomPage.shuffleTiles();

    // Wait a moment for shuffle animation
    await roomPage.page.waitForTimeout(500);

    // Get new tile order
    const newOrder = await tiles.allTextContents();

    // Order should be different (very unlikely to be the same after shuffle)
    // Note: This could theoretically fail if shuffle produces same order
    expect(newOrder).not.toEqual(initialOrder);
  });

  test("showdown timer counts down", async ({
    createTestRoom,
    roomPage,
    convex,
  }) => {
    const { code, roomPage: room } = await createTestRoom({
      botCount: 2,
      ready: false,
    });

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

    await roomPage.waitForWordBuilder();

    // Get initial timer value
    const timer = roomPage.page.locator('[data-testid="showdown-timer"]');
    await expect(timer).toBeVisible();

    const initialText = await timer.textContent();
    const initialSeconds = parseInt(initialText?.replace(/\D/g, "") ?? "0", 10);

    // Wait 5 seconds
    await roomPage.page.waitForTimeout(5_000);

    // Get new timer value
    const newText = await timer.textContent();
    const newSeconds = parseInt(newText?.replace(/\D/g, "") ?? "0", 10);

    // Timer should have decreased
    expect(newSeconds).toBeLessThan(initialSeconds);
  });

  test("choice tile selection works", async ({
    createTestRoom,
    roomPage,
    convex,
  }) => {
    const { code, roomPage: room } = await createTestRoom({
      botCount: 2,
      ready: false,
    });

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

    await roomPage.waitForWordBuilder();

    // Look for choice tiles (they have two letters displayed)
    const choiceTiles = roomPage.page.locator('[data-testid="choice-tile"]');
    const choiceCount = await choiceTiles.count();

    if (choiceCount > 0) {
      // Click first choice tile to select a letter
      await choiceTiles.first().click();

      // A letter selection UI should appear
      // This depends on the exact implementation
      const letterButtons = roomPage.page.getByRole("button", {
        name: /^[A-Z]$/,
      });
      await expect(letterButtons.first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
