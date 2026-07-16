import { expect, test } from "@playwright/test";
import { convexMutation, convexQuery, ensureMinBalance } from "./helpers";

test.describe("settlement — wallet unchanged", () => {
  test("wallet is unchanged after game completion in balance game", async ({
    request,
  }) => {
    // In the new economy, chips stay on the table between hands.
    // Wallet is only debited on join and credited on leave/timeout.
    await ensureMinBalance(request, 500);

    const balBeforeJoin = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;

    // Join a balance table — buy-in is deducted
    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "SettleTest",
      botCount: 1,
      economyMode: "balance",
      buyIn: 500,
    });

    // Create and start a game
    const gameId = await convexMutation(request, "games:createGameForRoom", {
      roomId: roomRes.roomId,
    });
    const startRes = await convexMutation(request, "games:startGame", {
      gameId,
    });
    expect(startRes.ok).toBe(true);

    const balAfterStart = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;
    // Wallet should NOT change at game start (buy-in was already debited on join)
    expect(balAfterStart).toBe(balBeforeJoin - 500);

    // Fold to end the game
    const foldRes = await convexMutation(request, "games:fold", {
      gameId,
      playerId: roomRes.playerId,
    });
    expect(foldRes.ok).toBe(true);

    await new Promise((r) => setTimeout(r, 2000));

    // Wallet should be UNCHANGED after game completion
    // (no payout — chips stay on the table)
    const balAfterGame = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;
    expect(balAfterGame).toBe(balAfterStart);

    // No payout transaction should exist
    const txnRes = await convexQuery(request, "wallet:getMyTransactions", {
      paginationOpts: { numItems: 50, cursor: null },
    });
    const payouts = (txnRes.page ?? []).filter(
      (t: { source: string }) => t.source === "payout" && t.amount > 0,
    );
    // The payout from this game should NOT exist since payout only happens on leave
    const gamePayouts = payouts.filter(
      (t: { gameId?: string }) => t.gameId === String(gameId),
    );
    expect(gamePayouts.length).toBe(0);
  });
});

test.describe("settlement — leave triggers cash-out", () => {
  test("leaving a balance game returns remaining stack to wallet", async ({
    request,
  }) => {
    await ensureMinBalance(request, 500);

    // Join a balance table
    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "CashOutTest",
      botCount: 1,
      economyMode: "balance",
      buyIn: 500,
    });

    // Create and start a game
    const gameId = await convexMutation(request, "games:createGameForRoom", {
      roomId: roomRes.roomId,
    });
    const startRes = await convexMutation(request, "games:startGame", {
      gameId,
    });
    expect(startRes.ok).toBe(true);

    // Fold to end the game
    await convexMutation(request, "games:fold", {
      gameId,
      playerId: roomRes.playerId,
    });
    await new Promise((r) => setTimeout(r, 2000));

    const balBeforeLeave = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;

    // Leave the room — remaining stack should be cashed out to wallet
    await convexMutation(request, "rooms:leaveRoom", {});

    const balAfterLeave = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;
    // Wallet should increase by the remaining stack amount
    expect(balAfterLeave).toBeGreaterThan(balBeforeLeave);

    // A payout transaction should now exist
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
  test("leaving twice does not create extra payouts", async ({
    request,
  }) => {
    await ensureMinBalance(request, 500);

    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "DupLeave",
      botCount: 1,
      economyMode: "balance",
      buyIn: 500,
    });

    // Leave once
    const firstLeave = await convexMutation(request, "rooms:leaveRoom", {});
    const balAfterFirst = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;

    // Try to leave again — should be a no-op (already left)
    const secondLeave = await convexMutation(request, "rooms:leaveRoom", {});

    const balAfterSecond = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;
    // Balance should not change on second leave
    expect(balAfterSecond).toBe(balAfterFirst);
  });
});

test.describe("settlement — non-balance game", () => {
  test("non-balance game completes without wallet changes", async ({
    request,
  }) => {
    await ensureMinBalance(request, 500);

    const balBefore = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;

    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "NonBalSettle",
      botCount: 1,
      economyMode: "nonBalance",
    });

    const gameId = await convexMutation(request, "games:createGameForRoom", {
      roomId: roomRes.roomId,
    });
    const startRes = await convexMutation(request, "games:startGame", {
      gameId,
    });
    expect(startRes.ok).toBe(true);

    // Fold
    await convexMutation(request, "games:fold", {
      gameId,
      playerId: roomRes.playerId,
    });
    await new Promise((r) => setTimeout(r, 2000));

    const balAfter = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;
    expect(balAfter).toBe(balBefore);
  });
});
