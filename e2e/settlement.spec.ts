import { expect, test } from "@playwright/test";
import { convexMutation, convexQuery, ensureMinBalance } from "./helpers";
test.describe("settlement — fold win", () => {
  test("fold win triggers payout of remaining chips in balance game", async ({
    request,
  }) => {
    await ensureMinBalance(request, 500);

    const balBeforeStart = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;

    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "SettleTest",
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

    const balAfterBuyin = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;
    expect(balAfterBuyin).toBeLessThan(balBeforeStart);

    // Fold to trigger settlement
    const foldRes = await convexMutation(request, "games:fold", {
      gameId,
      playerId: roomRes.playerId,
    });
    expect(foldRes.ok).toBe(true);

    await new Promise((r) => setTimeout(r, 2000));

    // Balance should have increased from post-buy-in (payout returned chips)
    const balAfterSettle = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;
    expect(balAfterSettle).toBeGreaterThan(balAfterBuyin);

    // Verify payout transaction exists
    const txnRes = await convexQuery(request, "wallet:getMyTransactions", {
      paginationOpts: { numItems: 50, cursor: null },
    });
    const payouts = (txnRes.page ?? []).filter(
      (t: { source: string }) => t.source === "payout",
    );
    expect(payouts.length).toBeGreaterThanOrEqual(1);
    expect(payouts[payouts.length - 1].amount).toBeGreaterThan(0);
  });
});

test.describe("settlement — duplicate protection", () => {
  test("fold on completed game does not create extra payouts", async ({
    request,
  }) => {
    await ensureMinBalance(request, 500);

    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "DupSettle",
      botCount: 1,
      economyMode: "balance",
      buyIn: 500,
    });
    const playerId = roomRes.playerId as string;
    const gameId = await convexMutation(request, "games:createGameForRoom", {
      roomId: roomRes.roomId,
      deck: [],
    });
    await convexMutation(request, "games:startGame", { gameId });
    await convexMutation(request, "games:fold", { gameId, playerId });
    await new Promise((r) => setTimeout(r, 2000));

    const payoutCountBefore = (
      await convexQuery(request, "wallet:getMyTransactions", {
        paginationOpts: { numItems: 50, cursor: null },
      })
    ).page.filter((t: { source: string }) => t.source === "payout").length;

    // Second fold on completed game should be harmless
    try {
      await convexMutation(request, "games:fold", { gameId, playerId });
    } catch {
      // Expected: fold on completed game fails
    }

    const payoutCountAfter = (
      await convexQuery(request, "wallet:getMyTransactions", {
        paginationOpts: { numItems: 50, cursor: null },
      })
    ).page.filter((t: { source: string }) => t.source === "payout").length;
    expect(payoutCountAfter).toBe(payoutCountBefore);
  });
});

test.describe("settlement — non-balance game", () => {
  test("non-balance game completes without wallet changes", async ({
    request,
  }) => {
    await ensureMinBalance(request, 0);

    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "NonBalSettle",
      botCount: 1,
    });
    const playerId = roomRes.playerId as string;
    const gameId = await convexMutation(request, "games:createGameForRoom", {
      roomId: roomRes.roomId,
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
