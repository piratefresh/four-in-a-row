import { expect, test } from "@playwright/test";
import { convexMutation, convexQuery, ensureMinBalance } from "./helpers";
test.describe("balance game buy-in", () => {
  test("balance game start debits wallet by buy-in amount", async ({
    request,
  }) => {
    // Ensure wallet has enough for buy-in
    await ensureMinBalance(request, 500);

    const balBefore = (await convexQuery(request, "wallet:getMyBalance", {}))
      .balance as number;

    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "BuyinTest",
      botCount: 1,
      economyMode: "balance",
      buyIn: 500,
    });
    const gameId = await convexMutation(request, "games:createGameForRoom", {
      roomId: roomRes.roomId,
      deck: [],
    });
    const startRes = await convexMutation(request, "games:startGame", {
      gameId,
    });
    expect(startRes.ok).toBe(true);

    const balAfter = (await convexQuery(request, "wallet:getMyBalance", {}))
      .balance as number;
    expect(balAfter).toBe(balBefore - 500);

    // Verify buy_in transaction
    const txnRes = await convexQuery(request, "wallet:getMyTransactions", {
      paginationOpts: { numItems: 50, cursor: null },
    });
    const buyInTxns = (txnRes.page ?? []).filter(
      (t: { source: string }) => t.source === "buy_in",
    );
    expect(buyInTxns.length).toBeGreaterThanOrEqual(1);
    const latest = buyInTxns[buyInTxns.length - 1];
    expect(latest.amount).toBe(-500);
  });

  test("bot players are not debited", async ({ request }) => {
    await ensureMinBalance(request, 100);

    const balBefore = (await convexQuery(request, "wallet:getMyBalance", {}))
      .balance as number;

    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "BotTest",
      botCount: 2,
      economyMode: "balance",
      buyIn: 100,
    });
    const gameId = await convexMutation(request, "games:createGameForRoom", {
      roomId: roomRes.roomId,
      deck: [],
    });
    const startRes = await convexMutation(request, "games:startGame", {
      gameId,
    });
    expect(startRes.ok).toBe(true);

    const balAfter = (await convexQuery(request, "wallet:getMyBalance", {}))
      .balance as number;
    // Only human debited (100), not bots
    expect(balAfter).toBe(balBefore - 100);
  });

  test("non-balance game starts without errors", async ({ request }) => {
    await ensureMinBalance(request, 0);

    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "NonBalanceTest",
      botCount: 1,
    });
    const gameId = await convexMutation(request, "games:createGameForRoom", {
      roomId: roomRes.roomId,
      deck: [],
    });
    const startRes = await convexMutation(request, "games:startGame", {
      gameId,
    });
    expect(startRes.ok).toBe(true);
  });

  test("insufficient funds prevents game start", async ({ request }) => {
    // Get current balance
    const balBefore = (await convexQuery(request, "wallet:getMyBalance", {}))
      .balance as number;

    // Try to create a game with buy-in much higher than any possible balance
    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "PoorHuman",
      botCount: 0,
      economyMode: "balance",
      buyIn: 1_000_000,
    });
    const gameId = await convexMutation(request, "games:createGameForRoom", {
      roomId: roomRes.roomId,
      deck: [],
    });

    let startFailed = false;
    try {
      await convexMutation(request, "games:startGame", { gameId });
    } catch {
      startFailed = true;
    }
    expect(startFailed).toBe(true);

    // Wallet unchanged
    const balAfter = (await convexQuery(request, "wallet:getMyBalance", {}))
      .balance as number;
    expect(balAfter).toBe(balBefore);
  });

  test("duplicate start does not double-charge", async ({ request }) => {
    await ensureMinBalance(request, 500);

    const balBefore = (await convexQuery(request, "wallet:getMyBalance", {}))
      .balance as number;

    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "DupTest",
      botCount: 1,
      economyMode: "balance",
      buyIn: 500,
    });
    const gameId = await convexMutation(request, "games:createGameForRoom", {
      roomId: roomRes.roomId,
      deck: [],
    });
    await convexMutation(request, "games:startGame", { gameId });

    const balAfterFirst = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;

    // Second start should fail
    let secondFailed = false;
    try {
      await convexMutation(request, "games:startGame", { gameId });
    } catch {
      secondFailed = true;
    }
    expect(secondFailed).toBe(true);

    const balAfterSecond = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;
    expect(balAfterSecond).toBe(balAfterFirst);
  });
});
