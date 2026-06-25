import { expect, test } from "@playwright/test";
import { convexMutation, convexQuery, ensureMinBalance, signIn } from "./helpers";
test.describe("achievement definitions — integration", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("wallet page loads without errors", async ({ page, request }) => {
    await signIn(page);
    await convexMutation(request, "wallet:ensureMyWallet", {});

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/wallet", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Balance")).toBeVisible({ timeout: 15_000 });
    expect(errors).toHaveLength(0);
  });

  test("home page loads without errors", async ({ page }) => {
    await signIn(page);

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /choose how to play/i }),
    ).toBeVisible({ timeout: 30_000 });
    expect(errors).toHaveLength(0);
  });

  test("game completion invokes achievement engine without errors", async ({
    request,
  }) => {
    await ensureMinBalance(request, 500);

    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "AchieveTest",
      botCount: 1,
      economyMode: "balance",
      buyIn: 500,
    });
    const roomId = roomRes.roomId as string;
    const playerId = roomRes.playerId as string;

    const gameId = await convexMutation(request, "games:createGameForRoom", {
      roomId,
      deck: [],
    });
    const startRes = await convexMutation(request, "games:startGame", {
      gameId,
    });
    expect(startRes.ok).toBe(true);

    const foldRes = await convexMutation(request, "games:fold", {
      gameId,
      playerId,
    });
    expect(foldRes.ok).toBe(true);

    await new Promise((r) => setTimeout(r, 2000));

    const gameInfo = await convexQuery(request, "games:getGameById", {
      gameId,
    });
    expect(gameInfo.status).toBe("completed");
  });
});

test.describe("achievement definitions — regression", () => {
  test("balance game creates buy-in transaction (chip firewall superseded)", async ({
    request,
  }) => {
    await ensureMinBalance(request, 500);

    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "RegressTest",
      botCount: 1,
      economyMode: "balance",
      buyIn: 500,
    });
    const roomId = roomRes.roomId as string;

    const gameId = await convexMutation(request, "games:createGameForRoom", {
      roomId,
      deck: [],
    });
    const startRes = await convexMutation(request, "games:startGame", {
      gameId,
    });
    expect(startRes.ok).toBe(true);

    const txnRes = await convexQuery(request, "wallet:getMyTransactions", {
      paginationOpts: { numItems: 50, cursor: null },
    });
    const buyIns = (txnRes.page ?? []).filter(
      (t: { source: string }) => t.source === "buy_in",
    );
    expect(buyIns.length).toBeGreaterThanOrEqual(1);
    expect(buyIns[buyIns.length - 1].amount).toBe(-500);
  });

  test("non-balance game starts and completes without errors", async ({
    request,
  }) => {
    await ensureMinBalance(request, 0);

    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "NonBalRegress",
      botCount: 1,
    });
    const roomId = roomRes.roomId as string;
    const playerId = roomRes.playerId as string;

    const gameId = await convexMutation(request, "games:createGameForRoom", {
      roomId,
      deck: [],
    });
    const startRes = await convexMutation(request, "games:startGame", {
      gameId,
    });
    expect(startRes.ok).toBe(true);

    await convexMutation(request, "games:fold", { gameId, playerId });
    await new Promise((r) => setTimeout(r, 2000));

    // Game should be completed
    const gameInfo = await convexQuery(request, "games:getGameById", {
      gameId,
    });
    expect(gameInfo.status).toBe("completed");
  });
});
