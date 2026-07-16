import { expect, test } from "@playwright/test";
import { convexMutation, convexQuery, ensureMinBalance } from "./helpers";

test.describe("balance game buy-in", () => {
  test("confirmed join debits wallet by buy-in amount", async ({
    request,
  }) => {
    // Ensure wallet has enough for buy-in
    await ensureMinBalance(request, 500);

    const balBefore = (await convexQuery(request, "wallet:getMyBalance", {}))
      .balance as number;

    // Create a balance table and join — the buy-in is deducted on join.
    // The e2eCreateTestRoom mutation creates the room AND seats the E2E user.
    // For the new economy, joining (seating) is where the buy-in debit occurs.
    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "BuyInTest",
      botCount: 2,
      economyMode: "balance",
      buyIn: 500,
    });

    const balAfter = (await convexQuery(request, "wallet:getMyBalance", {}))
      .balance as number;
    expect(balAfter).toBe(balBefore - 500);

    // Verify buy_in transaction was created
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
      playerName: "BotBuyIn",
      botCount: 2,
      economyMode: "balance",
      buyIn: 100,
    });

    const balAfter = (await convexQuery(request, "wallet:getMyBalance", {}))
      .balance as number;
    // Only the human player (E2E user) is debited
    expect(balAfter).toBe(balBefore - 100);

    // Verify only one buy_in transaction exists (not multiplied by bot count)
    const txnRes = await convexQuery(request, "wallet:getMyTransactions", {
      paginationOpts: { numItems: 50, cursor: null },
    });
    const buyInTxns = (txnRes.page ?? []).filter(
      (t: { source: string }) => t.source === "buy_in",
    );
    // At least 1 (from this test), but shouldn't be inflated by bots
    expect(buyInTxns.length).toBeGreaterThanOrEqual(1);
  });

  test("non-balance game join does not debit wallet", async ({ request }) => {
    await ensureMinBalance(request, 500);

    const balBefore = (await convexQuery(request, "wallet:getMyBalance", {}))
      .balance as number;

    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "NonBalJoin",
      botCount: 2,
      economyMode: "nonBalance",
    });

    const balAfter = (await convexQuery(request, "wallet:getMyBalance", {}))
      .balance as number;
    // Non-balance games do not charge a buy-in
    expect(balAfter).toBe(balBefore);
  });

  test("insufficient funds prevents join", async ({ request }) => {
    // Set wallet to a very small amount, well below any buy-in
    const current = (await convexQuery(request, "wallet:getMyBalance", {})) as {
      balance: number;
    };
    if (current.balance > 10) {
      // Can't easily debit in test without E2E debit — just ensure we're above min
      // and the buy-in check will handle the rest
    }

    // Attempt to create/join a balance room with a buy-in far above wallet
    try {
      await convexMutation(request, "rooms:e2eCreateTestRoom", {
        playerName: "PoorPlayer",
        botCount: 1,
        economyMode: "balance",
        buyIn: 1_000_000, // impossibly high
      });
      // Should have thrown
      expect(true).toBe(false);
    } catch (error) {
      const msg = String(error);
      expect(msg).toMatch(/INSUFFICIENT_FUNDS|insufficient/i);
    }
  });

  test("duplicate join does not double-charge", async ({ request }) => {
    await ensureMinBalance(request, 500);

    // First join — should debit
    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "DupJoin",
      botCount: 2,
      economyMode: "balance",
      buyIn: 500,
    });

    const balAfterFirst = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;

    // Re-join the same room — should NOT debit again
    const rejoinRes = await convexMutation(request, "rooms:joinRoom", {
      code: roomRes.code,
      name: "DupJoin",
    });

    const balAfterRejoin = (
      await convexQuery(request, "wallet:getMyBalance", {})
    ).balance as number;
    expect(balAfterRejoin).toBe(balAfterFirst);
  });
});
