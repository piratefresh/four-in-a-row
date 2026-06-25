/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { STARTER_GRANT_AMOUNT } from "../schema";
import { createInitialGameDocument } from "../gameState";
import {
  applyLedgerEntry,
  buildOperationKey,
  creditWallet,
  debitWallet,
  findTransactionByOperationKey,
  getOrCreateWallet,
  getWallet,
  getWalletBalance,
  OPERATION_NAMESPACES,
  starterGrantOperationKey,
} from "./ledger";

describe("wallet ledger", () => {
  test("initializes wallet with one-time 1000 starter grant on first access", async () => {
    const t = convexTest(schema);

    const wallet = await t.mutation(async (ctx) => {
      return await getOrCreateWallet(ctx, "user-a");
    });

    expect(wallet.balance).toBe(STARTER_GRANT_AMOUNT);
    expect(wallet.authUserId).toBe("user-a");

    const grant = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        starterGrantOperationKey("user-a"),
      );
    });
    expect(grant).not.toBeNull();
    expect(grant!.amount).toBe(STARTER_GRANT_AMOUNT);
    expect(grant!.source).toBe("starter_grant");
    expect(grant!.balanceBefore).toBe(0);
    expect(grant!.balanceAfter).toBe(STARTER_GRANT_AMOUNT);
    expect(grant!.gameId).toBeUndefined();
    expect(grant!.operationKey).toBe(starterGrantOperationKey("user-a"));
    expect(typeof grant!.createdAt).toBe("number");
  });

  test("does not grant starter grant twice on repeated access", async () => {
    const t = convexTest(schema);

    const first = await t.mutation(async (ctx) => {
      return await getOrCreateWallet(ctx, "user-a");
    });
    const second = await t.mutation(async (ctx) => {
      return await getOrCreateWallet(ctx, "user-a");
    });

    expect(first._id).toBe(second._id);
    expect(second.balance).toBe(STARTER_GRANT_AMOUNT);

    const grantCount = await t.query(async (ctx) => {
      const grant = await findTransactionByOperationKey(
        ctx,
        starterGrantOperationKey("user-a"),
      );
      return grant ? 1 : 0;
    });
    expect(grantCount).toBe(1);
  });

  test("duplicate operation key does not alter balance twice", async () => {
    const t = convexTest(schema);
    const key = "playtest_deposit:user-a:txn-1";

    const first = await t.mutation(async (ctx) => {
      return await applyLedgerEntry(ctx, {
        authUserId: "user-a",
        amount: 250,
        source: "playtest_deposit",
        operationKey: key,
      });
    });
    const second = await t.mutation(async (ctx) => {
      return await applyLedgerEntry(ctx, {
        authUserId: "user-a",
        amount: 250,
        source: "playtest_deposit",
        operationKey: key,
      });
    });

    expect(first.status).toBe("applied");
    expect(second.status).toBe("already_processed");
    expect(first.transaction._id).toBe(second.transaction._id);

    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, "user-a");
    });
    expect(balance).toBe(STARTER_GRANT_AMOUNT + 250);
  });

  test("concurrent calls with the same operation key apply exactly once", async () => {
    const t = convexTest(schema);
    const key = "playtest_deposit:user-a:concurrent-1";

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, "user-a");
    });

    const [r1, r2] = await Promise.all([
      t.mutation(async (ctx) => {
        return await applyLedgerEntry(ctx, {
          authUserId: "user-a",
          amount: 100,
          source: "playtest_deposit",
          operationKey: key,
        });
      }),
      t.mutation(async (ctx) => {
        return await applyLedgerEntry(ctx, {
          authUserId: "user-a",
          amount: 100,
          source: "playtest_deposit",
          operationKey: key,
        });
      }),
    ]);

    const applied = [r1, r2].filter((r) => r.status === "applied");
    const already = [r1, r2].filter((r) => r.status === "already_processed");
    expect(applied.length).toBe(1);
    expect(already.length).toBe(1);

    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, "user-a");
    });
    expect(balance).toBe(STARTER_GRANT_AMOUNT + 100);
  });

  test("rejects debit exceeding balance with INSUFFICIENT_FUNDS and writes no transaction", async () => {
    const t = convexTest(schema);

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, "user-a");
    });

    await expect(
      t.mutation(async (ctx) => {
        return await debitWallet(ctx, {
          authUserId: "user-a",
          amount: STARTER_GRANT_AMOUNT + 500,
          source: "buy_in",
          operationKey: "buy_in:user-a:1",
        });
      }),
    ).rejects.toMatchObject({ data: { code: "INSUFFICIENT_FUNDS" } });

    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, "user-a");
    });
    expect(balance).toBe(STARTER_GRANT_AMOUNT);

    const tx = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(ctx, "buy_in:user-a:1");
    });
    expect(tx).toBeNull();
  });

  test("allows debiting exact balance down to zero", async () => {
    const t = convexTest(schema);

    const result = await t.mutation(async (ctx) => {
      return await debitWallet(ctx, {
        authUserId: "user-a",
        amount: STARTER_GRANT_AMOUNT,
        source: "buy_in",
        operationKey: "buy_in:user-a:exact",
      });
    });

    expect(result.status).toBe("applied");
    expect(result.balanceAfter).toBe(0);

    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, "user-a");
    });
    expect(balance).toBe(0);
  });

  test("rejects non-integer and zero amounts", async () => {
    const t = convexTest(schema);

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, "user-a");
    });

    await expect(
      t.mutation(async (ctx) => {
        return await applyLedgerEntry(ctx, {
          authUserId: "user-a",
          amount: 0,
          source: "playtest_deposit",
          operationKey: "zero:1",
        });
      }),
    ).rejects.toMatchObject({ data: { code: "INVALID_AMOUNT" } });

    await expect(
      t.mutation(async (ctx) => {
        return await applyLedgerEntry(ctx, {
          authUserId: "user-a",
          amount: 10.5,
          source: "playtest_deposit",
          operationKey: "frac:1",
        });
      }),
    ).rejects.toMatchObject({ data: { code: "INVALID_AMOUNT" } });
  });

  test("creditWallet and debitWallet require positive amounts", async () => {
    const t = convexTest(schema);

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, "user-a");
    });

    await expect(
      t.mutation(async (ctx) => {
        return await creditWallet(ctx, {
          authUserId: "user-a",
          amount: 0,
          source: "playtest_deposit",
          operationKey: "c0:1",
        });
      }),
    ).rejects.toMatchObject({ data: { code: "INVALID_AMOUNT" } });

    await expect(
      t.mutation(async (ctx) => {
        return await debitWallet(ctx, {
          authUserId: "user-a",
          amount: -50,
          source: "buy_in",
          operationKey: "d-neg:1",
        });
      }),
    ).rejects.toMatchObject({ data: { code: "INVALID_AMOUNT" } });
  });

  test("transactions are append-only and chain consistently", async () => {
    const t = convexTest(schema);

    await t.mutation(async (ctx) => {
      await applyLedgerEntry(ctx, {
        authUserId: "user-a",
        amount: 500,
        source: "playtest_deposit",
        operationKey: "chain:deposit:1",
      });
    });
    await t.mutation(async (ctx) => {
      await debitWallet(ctx, {
        authUserId: "user-a",
        amount: 300,
        source: "buy_in",
        operationKey: "chain:buyin:1",
      });
    });
    await t.mutation(async (ctx) => {
      await creditWallet(ctx, {
        authUserId: "user-a",
        amount: 150,
        source: "reward",
        operationKey: "chain:reward:1",
      });
    });

    const page = await t.query(async (ctx) => {
      return await ctx.db
        .query("transactions")
        .withIndex("by_authUserId_createdAt", (q) =>
          q.eq("authUserId", "user-a"),
        )
        .order("asc")
        .take(10);
    });

    expect(page.length).toBe(4);
    const expectedBalances = [
      STARTER_GRANT_AMOUNT,
      STARTER_GRANT_AMOUNT + 500,
      STARTER_GRANT_AMOUNT + 500 - 300,
      STARTER_GRANT_AMOUNT + 500 - 300 + 150,
    ];
    page.forEach((tx, i) => {
      expect(tx.balanceAfter).toBe(expectedBalances[i]);
      expect(tx.balanceAfter).toBe(tx.balanceBefore + tx.amount);
      if (i > 0) {
        expect(tx.balanceBefore).toBe(page[i - 1].balanceAfter);
      }
    });

    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, "user-a");
    });
    expect(balance).toBe(expectedBalances[3]);
  });

  test("wallets are independent per user", async () => {
    const t = convexTest(schema);

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, "user-a");
    });
    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, "user-b");
    });
    await t.mutation(async (ctx) => {
      await debitWallet(ctx, {
        authUserId: "user-a",
        amount: 400,
        source: "buy_in",
        operationKey: "buyin:user-a:1",
      });
    });

    const balA = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, "user-a");
    });
    const balB = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, "user-b");
    });
    expect(balA).toBe(STARTER_GRANT_AMOUNT - 400);
    expect(balB).toBe(STARTER_GRANT_AMOUNT);

    const walletA = await t.query(async (ctx) => {
      return await getWallet(ctx, "user-a");
    });
    const walletB = await t.query(async (ctx) => {
      return await getWallet(ctx, "user-b");
    });
    expect(walletA!._id).not.toBe(walletB!._id);
  });

  test("stores optional gameId when provided", async () => {
    const t = convexTest(schema);

    const gameId = await t.mutation(async (ctx) => {
      return await ctx.db.insert("games", createInitialGameDocument("room-1"));
    });

    const result = await t.mutation(async (ctx) => {
      return await debitWallet(ctx, {
        authUserId: "user-a",
        amount: 100,
        source: "buy_in",
        operationKey: "buyin:game:1",
        gameId,
      });
    });

    expect(result.status).toBe("applied");
    expect(result.transaction.gameId).toBe(gameId);
  });

  test("leaves gameId unset when not provided", async () => {
    const t = convexTest(schema);

    const result = await t.mutation(async (ctx) => {
      return await creditWallet(ctx, {
        authUserId: "user-a",
        amount: 75,
        source: "login_streak",
        operationKey: "streak:1",
      });
    });

    expect(result.transaction.gameId).toBeUndefined();
  });

  test("getWalletBalance returns null before wallet is accessed", async () => {
    const t = convexTest(schema);

    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, "user-a");
    });
    expect(balance).toBeNull();
  });

  test("ledger entry auto-creates wallet with starter grant on first use", async () => {
    const t = convexTest(schema);

    const result = await t.mutation(async (ctx) => {
      return await creditWallet(ctx, {
        authUserId: "user-a",
        amount: 100,
        source: "playtest_deposit",
        operationKey: "auto:deposit:1",
      });
    });

    expect(result.balanceBefore).toBe(STARTER_GRANT_AMOUNT);
    expect(result.balanceAfter).toBe(STARTER_GRANT_AMOUNT + 100);

    const grant = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        starterGrantOperationKey("user-a"),
      );
    });
    expect(grant).not.toBeNull();
    expect(grant!.amount).toBe(STARTER_GRANT_AMOUNT);
  });

  // --------------------------------------------------------------------------
  // STO-230: operation-key collision and concurrency guarantees
  // --------------------------------------------------------------------------

  test("buildOperationKey namespaces by source and user", () => {
    expect(
      buildOperationKey(OPERATION_NAMESPACES.playtest_deposit, "user-a", "req-1"),
    ).toBe("playtest_deposit:user-a:req-1");
    expect(
      buildOperationKey(OPERATION_NAMESPACES.buy_in, "user-a", "game-1"),
    ).toBe("buy_in:user-a:game-1");
    expect(
      buildOperationKey(OPERATION_NAMESPACES.payout, "user-b", "game-1"),
    ).toBe("payout:user-b:game-1");
    // Same requestId, different users -> different keys
    expect(
      buildOperationKey(OPERATION_NAMESPACES.playtest_deposit, "user-a", "shared"),
    ).not.toBe(
      buildOperationKey(OPERATION_NAMESPACES.playtest_deposit, "user-b", "shared"),
    );
    // Same user, same requestId, different namespaces -> different keys
    expect(
      buildOperationKey(OPERATION_NAMESPACES.playtest_deposit, "user-a", "shared"),
    ).not.toBe(
      buildOperationKey(OPERATION_NAMESPACES.buy_in, "user-a", "shared"),
    );
  });

  test("collision with starter-grant key is rejected, not silently replayed", async () => {
    const t = convexTest(schema);

    // First access creates the wallet + starter grant with the starter_grant key.
    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, "user-a");
    });

    // A malicious or buggy caller tries to apply a playtest_deposit using the
    // exact starter-grant key. The existing transaction has a different source
    // and amount, so this must be rejected as a collision.
    await expect(
      t.mutation(async (ctx) => {
        return await applyLedgerEntry(ctx, {
          authUserId: "user-a",
          amount: 5_000,
          source: "playtest_deposit",
          operationKey: starterGrantOperationKey("user-a"),
        });
      }),
    ).rejects.toMatchObject({ data: { code: "OPERATION_KEY_COLLISION" } });

    // Balance is unchanged.
    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, "user-a");
    });
    expect(balance).toBe(STARTER_GRANT_AMOUNT);
  });

  test("same request id from different users applies independently", async () => {
    const t = convexTest(schema);
    const requestId = "shared-request-id";

    // Both users deposit 250 using the same opaque requestId. Because the
    // server-side key includes authUserId, the keys differ and both deposits
    // apply independently.
    const keyA = buildOperationKey(
      OPERATION_NAMESPACES.playtest_deposit,
      "user-a",
      requestId,
    );
    const keyB = buildOperationKey(
      OPERATION_NAMESPACES.playtest_deposit,
      "user-b",
      requestId,
    );
    expect(keyA).not.toBe(keyB);

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, "user-a");
      await getOrCreateWallet(ctx, "user-b");
    });

    const r1 = await t.mutation(async (ctx) => {
      return await applyLedgerEntry(ctx, {
        authUserId: "user-a",
        amount: 250,
        source: "playtest_deposit",
        operationKey: keyA,
      });
    });
    const r2 = await t.mutation(async (ctx) => {
      return await applyLedgerEntry(ctx, {
        authUserId: "user-b",
        amount: 250,
        source: "playtest_deposit",
        operationKey: keyB,
      });
    });

    expect(r1.status).toBe("applied");
    expect(r2.status).toBe("applied");

    const balA = await t.query(async (ctx) => getWalletBalance(ctx, "user-a"));
    const balB = await t.query(async (ctx) => getWalletBalance(ctx, "user-b"));
    expect(balA).toBe(STARTER_GRANT_AMOUNT + 250);
    expect(balB).toBe(STARTER_GRANT_AMOUNT + 250);
  });

  test("reusing a key with a different amount or source is rejected", async () => {
    const t = convexTest(schema);
    const key = buildOperationKey(
      OPERATION_NAMESPACES.playtest_deposit,
      "user-a",
      "req-reuse",
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, "user-a");
    });

    const first = await t.mutation(async (ctx) => {
      return await applyLedgerEntry(ctx, {
        authUserId: "user-a",
        amount: 100,
        source: "playtest_deposit",
        operationKey: key,
      });
    });
    expect(first.status).toBe("applied");

    // Same key + same user, different amount -> collision.
    await expect(
      t.mutation(async (ctx) => {
        return await applyLedgerEntry(ctx, {
          authUserId: "user-a",
          amount: 200,
          source: "playtest_deposit",
          operationKey: key,
        });
      }),
    ).rejects.toMatchObject({ data: { code: "OPERATION_KEY_COLLISION" } });

    // Same key + same user, different source -> collision.
    await expect(
      t.mutation(async (ctx) => {
        return await applyLedgerEntry(ctx, {
          authUserId: "user-a",
          amount: 100,
          source: "reward",
          operationKey: key,
        });
      }),
    ).rejects.toMatchObject({ data: { code: "OPERATION_KEY_COLLISION" } });

    // Balance reflects only the first successful deposit.
    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, "user-a");
    });
    expect(balance).toBe(STARTER_GRANT_AMOUNT + 100);
  });

  test("reusing a key with a matching request is duplicate-safe (already_processed)", async () => {
    const t = convexTest(schema);
    const key = buildOperationKey(
      OPERATION_NAMESPACES.playtest_deposit,
      "user-a",
      "req-idem",
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, "user-a");
    });

    const first = await t.mutation(async (ctx) => {
      return await applyLedgerEntry(ctx, {
        authUserId: "user-a",
        amount: 300,
        source: "playtest_deposit",
        operationKey: key,
      });
    });
    const second = await t.mutation(async (ctx) => {
      return await applyLedgerEntry(ctx, {
        authUserId: "user-a",
        amount: 300,
        source: "playtest_deposit",
        operationKey: key,
      });
    });

    expect(first.status).toBe("applied");
    expect(second.status).toBe("already_processed");
    expect(second.transaction._id).toBe(first.transaction._id);

    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, "user-a");
    });
    expect(balance).toBe(STARTER_GRANT_AMOUNT + 300);
  });

  test("concurrent wallet initialization creates exactly one wallet and one grant", async () => {
    const t = convexTest(schema);

    // Two concurrent getOrCreateWallet calls for the same fresh user. Convex
    // mutations are serializable, so exactly one should perform the insert;
    // the other should observe the resulting wallet. Either way, the end
    // state must be a single wallet with a single starter grant.
    const [w1, w2] = await Promise.all([
      t.mutation(async (ctx) => {
        return await getOrCreateWallet(ctx, "user-concurrent");
      }),
      t.mutation(async (ctx) => {
        return await getOrCreateWallet(ctx, "user-concurrent");
      }),
    ]);

    expect(w1._id).toBe(w2._id);
    expect(w1.balance).toBe(STARTER_GRANT_AMOUNT);
    expect(w2.balance).toBe(STARTER_GRANT_AMOUNT);

    // Exactly one wallet document.
    const wallets = await t.query(async (ctx) => {
      return await ctx.db
        .query("wallets")
        .withIndex("by_authUserId", (q) =>
          q.eq("authUserId", "user-concurrent"),
        )
        .collect();
    });
    expect(wallets.length).toBe(1);

    // Exactly one starter-grant transaction.
    const grants = await t.query(async (ctx) => {
      return await ctx.db
        .query("transactions")
        .withIndex("by_authUserId_operationKey", (q) =>
          q
            .eq("authUserId", "user-concurrent")
            .eq("operationKey", starterGrantOperationKey("user-concurrent")),
        )
        .collect();
    });
    expect(grants.length).toBe(1);
  });

  test("findTransactionByOperationKey scopes by user when authUserId is provided", async () => {
    const t = convexTest(schema);

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, "user-a");
      await getOrCreateWallet(ctx, "user-b");
    });

    // Look up user-a's grant scoped by user-a -> found.
    const grantA = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        starterGrantOperationKey("user-a"),
        "user-a",
      );
    });
    expect(grantA).not.toBeNull();
    expect(grantA!.authUserId).toBe("user-a");

    // Look up user-a's grant key but scoped to user-b -> not found, because
    // the composite index requires both authUserId and key to match.
    const crossUser = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        starterGrantOperationKey("user-a"),
        "user-b",
      );
    });
    expect(crossUser).toBeNull();
  });

  test("collision on gameId mismatch is rejected", async () => {
    const t = convexTest(schema);

    const gameId1 = await t.mutation(async (ctx) => {
      return await ctx.db.insert("games", createInitialGameDocument("room-1"));
    });
    const gameId2 = await t.mutation(async (ctx) => {
      return await ctx.db.insert("games", createInitialGameDocument("room-2"));
    });

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, "user-a");
    });

    // First buy_in for game-1 with key K (gameId = game-1).
    const key = buildOperationKey(
      OPERATION_NAMESPACES.buy_in,
      "user-a",
      String(gameId1),
    );
    const first = await t.mutation(async (ctx) => {
      return await debitWallet(ctx, {
        authUserId: "user-a",
        amount: 100,
        source: "buy_in",
        operationKey: key,
        gameId: gameId1,
      });
    });
    expect(first.status).toBe("applied");

    // Reuse the same key but with a different gameId -> collision.
    await expect(
      t.mutation(async (ctx) => {
        return await debitWallet(ctx, {
          authUserId: "user-a",
          amount: 100,
          source: "buy_in",
          operationKey: key,
          gameId: gameId2,
        });
      }),
    ).rejects.toMatchObject({ data: { code: "OPERATION_KEY_COLLISION" } });
  });
});
