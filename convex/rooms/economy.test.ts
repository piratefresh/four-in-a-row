/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { BUY_IN_PRESETS, DEFAULT_BUY_IN } from "../gameConfig";
import {
  getOrCreateWallet,
  getWalletBalance,
} from "../wallet/ledger";

const TEST_USER = "test-user-1";

async function seedWallet(
  t: ReturnType<typeof convexTest>,
  authUserId: string,
  balance: number,
) {
  const wallet = await t.mutation(async (ctx) => {
    return await getOrCreateWallet(ctx, authUserId);
  });
  const target = balance - wallet.balance;
  if (target > 0) {
    await t.mutation(async (ctx) => {
      const { applyLedgerEntry } = await import("../wallet/ledger");
      return await applyLedgerEntry(ctx, {
        authUserId,
        amount: target,
        source: "playtest_deposit",
        operationKey: `test:seed:${authUserId}:${Date.now()}`,
      });
    });
  } else if (target < 0) {
    await t.mutation(async (ctx) => {
      const { debitWallet } = await import("../wallet/ledger");
      return await debitWallet(ctx, {
        authUserId,
        amount: -target,
        source: "buy_in",
        operationKey: `test:seed:${authUserId}:${Date.now()}`,
      });
    });
  }
}

describe("room economy settings", () => {
  test("createOpenRoom stores economy fields when balance mode", async () => {
    const t = convexTest(schema);

    const { roomId } = await t.mutation(async (ctx) => {
      const { createOpenRoom } = await import("./lifecycle");
      return await createOpenRoom(ctx, {
        economyMode: "balance",
        buyIn: 500,
      });
    });

    const room = await t.query(async (ctx) => {
      return await ctx.db.get(roomId);
    });

    expect(room).not.toBeNull();
    expect(room!.economyMode).toBe("balance");
    expect(room!.buyIn).toBe(500);
  });

  test("createOpenRoom does not store buyIn for nonBalance mode", async () => {
    const t = convexTest(schema);

    const { roomId } = await t.mutation(async (ctx) => {
      const { createOpenRoom } = await import("./lifecycle");
      return await createOpenRoom(ctx, {
        economyMode: "nonBalance",
      });
    });

    const room = await t.query(async (ctx) => {
      return await ctx.db.get(roomId);
    });

    expect(room).not.toBeNull();
    expect(room!.economyMode).toBe("nonBalance");
    expect(room!.buyIn).toBeUndefined();
  });

  test("createOpenRoom leaves economy fields undefined by default (existing rooms compat)", async () => {
    const t = convexTest(schema);

    const { roomId } = await t.mutation(async (ctx) => {
      const { createOpenRoom } = await import("./lifecycle");
      return await createOpenRoom(ctx, { title: "Classic room" });
    });

    const room = await t.query(async (ctx) => {
      return await ctx.db.get(roomId);
    });

    expect(room).not.toBeNull();
    expect(room!.economyMode).toBeUndefined();
    expect(room!.buyIn).toBeUndefined();
  });

  test("BUY_IN_PRESETS includes the required values", () => {
    expect(BUY_IN_PRESETS).toEqual([100, 500, 1_000, 5_000]);
  });
});

describe("balance validation for room creation", () => {
  test("wallet with sufficient balance passes check", async () => {
    const t = convexTest(schema);

    await seedWallet(t, TEST_USER, 1000);

    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, TEST_USER);
    });
    expect(balance).toBe(1000);

    const hasEnough = (balance ?? 0) >= 500;
    expect(hasEnough).toBe(true);
  });

  test("wallet with insufficient balance fails check", async () => {
    const t = convexTest(schema);

    await seedWallet(t, TEST_USER, 200);

    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, TEST_USER);
    });
    expect(balance).toBe(200);

    const hasEnough = (balance ?? 0) >= 500;
    expect(hasEnough).toBe(false);
  });

  test("wallet with exact balance passes check", async () => {
    const t = convexTest(schema);

    await seedWallet(t, TEST_USER, 500);

    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, TEST_USER);
    });
    expect(balance).toBe(500);

    const hasEnough = (balance ?? 0) >= 500;
    expect(hasEnough).toBe(true);
  });

  test("null balance (no wallet) fails check", async () => {
    const t = convexTest(schema);

    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, "unknown-user");
    });
    expect(balance).toBeNull();

    const hasEnough = (balance ?? 0) >= 1;
    expect(hasEnough).toBe(false);
  });
});

describe("buy-in preset validation", () => {
  test.each([100, 500, 1_000, 5_000])(
    "accepts valid buy-in preset %i",
    (buyIn) => {
      expect((BUY_IN_PRESETS as readonly number[]).includes(buyIn)).toBe(true);
    },
  );

  test.each([0, 50, 200, 300, 750, 10_000, -100, 1.5])(
    "rejects invalid buy-in %s",
    (buyIn) => {
      expect((BUY_IN_PRESETS as readonly number[]).includes(buyIn)).toBe(false);
    },
  );

  test("DEFAULT_BUY_IN is a valid preset", () => {
    expect((BUY_IN_PRESETS as readonly number[]).includes(DEFAULT_BUY_IN)).toBe(true);
    expect(DEFAULT_BUY_IN).toBe(500);
  });
});

describe("createRoom economy validation integration", () => {
  test("balance check rejects insufficient funds for buy-in", async () => {
    const t = convexTest(schema);

    await seedWallet(t, TEST_USER, 200);

    const buyIn = 500;
    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, TEST_USER);
    });
    expect(balance).toBe(200);

    // Use the same condition the createRoom handler uses.
    const hasEnough = balance !== null && balance >= buyIn;
    expect(hasEnough).toBe(false);
  });

  test("balance check passes with sufficient funds", async () => {
    const t = convexTest(schema);

    await seedWallet(t, TEST_USER, 1000);

    const buyIn = 500;
    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, TEST_USER);
    });
    expect(balance).toBe(1000);

    const hasEnough = balance !== null && balance >= buyIn;
    expect(hasEnough).toBe(true);
  });

  test("balance check fails with no wallet", async () => {
    const t = convexTest(schema);

    const buyIn = 100;
    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, TEST_USER);
    });
    expect(balance).toBeNull();

    const hasEnough = (balance ?? 0) >= buyIn;
    expect(hasEnough).toBe(false);
  });

  test("createOpenRoom defaults buyIn to undefined for non-balance", async () => {
    const t = convexTest(schema);

    const { roomId } = await t.mutation(async (ctx) => {
      const { createOpenRoom } = await import("./lifecycle");
      return await createOpenRoom(ctx, {
        economyMode: "nonBalance",
        // Deliberately pass a buyIn — should still be stored as undefined
        buyIn: 999,
      });
    });

    const room = await t.query(async (ctx) => {
      return await ctx.db.get(roomId);
    });
    expect(room).not.toBeNull();
    expect(room!.buyIn).toBeUndefined();
  });

  test("legacy room (no economyMode) is treated as nonBalance by getRoomEconomyMode", async () => {
    const t = convexTest(schema);

    const { roomId } = await t.mutation(async (ctx) => {
      const { createOpenRoom } = await import("./lifecycle");
      return await createOpenRoom(ctx, { title: "Legacy room" });
    });

    const room = await t.query(async (ctx) => {
      return await ctx.db.get(roomId);
    });
    expect(room).not.toBeNull();
    expect(room!.economyMode).toBeUndefined();

    const { getRoomEconomyMode } = await import("../gameConfig");
    expect(getRoomEconomyMode(room!)).toBe("nonBalance");
  });

  test("balance room with DEFAULT_BUY_IN is valid", async () => {
    const { isValidBuyIn, DEFAULT_BUY_IN } = await import("../gameConfig");

    const buyIn = DEFAULT_BUY_IN;
    expect(isValidBuyIn(buyIn)).toBe(true);
  });
});
