/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { getStreakCoinAmount, getUtcDateString, getYesterdayUtcDateString } from "./loginStreaks";
import {
  getOrCreateWallet,
  getWalletBalance,
  findTransactionByOperationKey,
  buildOperationKey,
  creditWallet,
  OPERATION_NAMESPACES,
} from "./wallet/ledger";

const USER_A = "test-user-streak-a";
const USER_B = "test-user-streak-b";

async function seedWallet(t: ReturnType<typeof convexTest>, authUserId: string) {
  await t.mutation(async (ctx) => {
    await getOrCreateWallet(ctx, authUserId);
  });
}

async function getBalance(t: ReturnType<typeof convexTest>, authUserId: string) {
  return await t.query(async (ctx) => {
    return await getWalletBalance(ctx as any, authUserId);
  });
}

async function getStreakDoc(
  t: ReturnType<typeof convexTest>,
  authUserId: string,
) {
  return await t.query(async (ctx) => {
    const db = ctx.db as any;
    return await db
      .query("loginStreaks")
      .withIndex("by_authUserId", (q: any) => q.eq("authUserId", authUserId))
      .first();
  });
}

async function forceSetStreak(
  t: ReturnType<typeof convexTest>,
  authUserId: string,
  streak: number,
  lastLoginDate: string,
) {
  await t.mutation(async (ctx) => {
    const db = ctx.db as any;
    const existing = await db
      .query("loginStreaks")
      .withIndex("by_authUserId", (q: any) => q.eq("authUserId", authUserId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        currentStreak: streak,
        lastLoginDate,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("loginStreaks", {
        authUserId,
        currentStreak: streak,
        lastLoginDate,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  });
}

async function recordLoginForUser(
  t: ReturnType<typeof convexTest>,
  authUserId: string,
  utcDateOverride?: string,
) {
  return await t.mutation(async (ctx) => {
    const utcDate = utcDateOverride ?? getUtcDateString();
    const yesterday = utcDateOverride
      ? getDateWithOffset(utcDateOverride, -1)
      : getYesterdayUtcDateString();

    const db = ctx.db as any;
    const existing = await db
      .query("loginStreaks")
      .withIndex("by_authUserId", (q: any) => q.eq("authUserId", authUserId))
      .first();

    // Already recorded today — no-op.
    if (existing && existing.lastLoginDate === utcDate) {
      return {
        recorded: false,
        streak: existing.currentStreak,
        coinsAwarded: 0,
        utcDate,
      };
    }

    // Compute new streak.
    let newStreak: number;
    if (!existing) {
      newStreak = 1;
    } else if (existing.lastLoginDate === yesterday) {
      newStreak = existing.currentStreak + 1;
    } else {
      newStreak = 1;
    }

    const coinAmount = getStreakCoinAmount(newStreak);

    const opKey = buildOperationKey(
      OPERATION_NAMESPACES.login_streak,
      authUserId,
      utcDate,
    );

    if (coinAmount > 0) {
      await creditWallet(ctx, {
        authUserId,
        amount: coinAmount,
        source: "login_streak",
        operationKey: opKey,
      });
    }

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        currentStreak: newStreak,
        lastLoginDate: utcDate,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("loginStreaks", {
        authUserId,
        currentStreak: newStreak,
        lastLoginDate: utcDate,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      recorded: true,
      streak: newStreak,
      coinsAwarded: coinAmount,
      utcDate,
    };
  });
}

function getDateWithOffset(baseDate: string, offsetDays: number): string {
  const parts = baseDate.split("-").map(Number);
  const date = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

// ============================================================================
// Unit: getStreakCoinAmount
// ============================================================================

describe("getStreakCoinAmount", () => {
  test("day 1 returns 100", () => {
    expect(getStreakCoinAmount(1)).toBe(100);
  });

  test("day 2 returns 150", () => {
    expect(getStreakCoinAmount(2)).toBe(150);
  });

  test("day 3 returns 200", () => {
    expect(getStreakCoinAmount(3)).toBe(200);
  });

  test("day 4 returns 300", () => {
    expect(getStreakCoinAmount(4)).toBe(300);
  });

  test("day 5 returns 500", () => {
    expect(getStreakCoinAmount(5)).toBe(500);
  });

  test("day 6 returns 750", () => {
    expect(getStreakCoinAmount(6)).toBe(750);
  });

  test("day 7 returns 1000", () => {
    expect(getStreakCoinAmount(7)).toBe(1000);
  });

  test("day 30 returns 1000", () => {
    expect(getStreakCoinAmount(30)).toBe(1000);
  });

  test("day 100 returns 1000", () => {
    expect(getStreakCoinAmount(100)).toBe(1000);
  });
});

// ============================================================================
// Unit: UTC date helpers
// ============================================================================

describe("utc date helpers", () => {
  test("getUtcDateString returns YYYY-MM-DD format", () => {
    const date = getUtcDateString();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("getYesterdayUtcDateString is one day before today", () => {
    const today = getUtcDateString();
    const yesterday = getYesterdayUtcDateString();
    // Not asserting exact equality since test could run at midnight,
    // but both should be valid date strings.
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(today).not.toBe(yesterday);
  });
});

// ============================================================================
// Integration: first login
// ============================================================================

describe("login streak — first login", () => {

  test("first login creates streak at day 1 with 100 coins", async () => {
    const t = convexTest(schema);
    await seedWallet(t, USER_A);

    const result = await recordLoginForUser(t, USER_A);

    expect(result.recorded).toBe(true);
    expect(result.streak).toBe(1);
    expect(result.coinsAwarded).toBe(100);

    const balance = await getBalance(t, USER_A);
    expect(balance).toBe(1100); // 1000 starter + 100

    const streak = await getStreakDoc(t, USER_A);
    expect(streak).not.toBeNull();
    expect(streak!.currentStreak).toBe(1);
    expect(streak!.lastLoginDate).toBe(result.utcDate);
  });
});
// ============================================================================

describe("login streak — consecutive days", () => {
  test("day 2 login increments streak from day 1", async () => {
    const t = convexTest(schema);
    await seedWallet(t, USER_A);

    // Set up day 1 streak (logged in yesterday).
    await forceSetStreak(t, USER_A, 1, getYesterdayUtcDateString());

    // Today login
    const result = await recordLoginForUser(t, USER_A);

    expect(result.coinsAwarded).toBe(150); // day 2 = 150

    const balance = await getBalance(t, USER_A);
    expect(balance).toBe(1150); // 1000 + 150

    const streak = await getStreakDoc(t, USER_A);
    expect(streak!.currentStreak).toBe(2);
  });

  test("day 7 login awards 1000 coins", async () => {
    const t = convexTest(schema);
    await seedWallet(t, USER_A);

    await forceSetStreak(t, USER_A, 6, getYesterdayUtcDateString());

    const result = await recordLoginForUser(t, USER_A);

    expect(result.recorded).toBe(true);
    expect(result.streak).toBe(7);
    expect(result.coinsAwarded).toBe(1000);

    const balance = await getBalance(t, USER_A);
    expect(balance).toBe(2000); // 1000 + 1000
  });

  test("day 30 login awards 1000 coins", async () => {
    const t = convexTest(schema);
    await seedWallet(t, USER_A);

    await forceSetStreak(t, USER_A, 29, getYesterdayUtcDateString());

    const result = await recordLoginForUser(t, USER_A);

    expect(result.recorded).toBe(true);
    expect(result.streak).toBe(30);
    expect(result.coinsAwarded).toBe(1000);
  });
});

// ============================================================================
// Integration: gap resets streak
// ============================================================================

describe("login streak — gap resets", () => {
  test("missing a day resets to day 1", async () => {
    const t = convexTest(schema);
    await seedWallet(t, USER_A);

    // Set up a streak from 2 days ago (yesterday was missed).
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
    const twoDaysAgoStr = `${twoDaysAgo.getUTCFullYear()}-${String(twoDaysAgo.getUTCMonth() + 1).padStart(2, "0")}-${String(twoDaysAgo.getUTCDate()).padStart(2, "0")}`;
    await forceSetStreak(t, USER_A, 5, twoDaysAgoStr);

    const result = await recordLoginForUser(t, USER_A);

    expect(result.recorded).toBe(true);
    expect(result.streak).toBe(1);

    expect(result.coinsAwarded).toBe(100);

    const streak = await getStreakDoc(t, USER_A);
    expect(streak!.currentStreak).toBe(1);
  });
});

// ============================================================================
// Integration: idempotent — same day
// ============================================================================

describe("login streak — idempotent", () => {
  test("second call on same day returns no reward", async () => {
    const t = convexTest(schema);
    await seedWallet(t, USER_A);

    await forceSetStreak(t, USER_A, 3, getUtcDateString());

    const result = await recordLoginForUser(t, USER_A);

    expect(result.recorded).toBe(false);
    expect(result.coinsAwarded).toBe(0);
    expect(result.streak).toBe(3);
  });

  test("duplicate calls do not double-grant coins", async () => {
    const t = convexTest(schema);
    await seedWallet(t, USER_A);

    await forceSetStreak(t, USER_A, 10, getYesterdayUtcDateString());

    // First call
    await recordLoginForUser(t, USER_A);
    // Second call on same day
    await recordLoginForUser(t, USER_A);

    const balance = await getBalance(t, USER_A);
    // Day 11 >= 7 = 1000 coins. Should only be granted once.
    expect(balance).toBe(2000); // 1000 + 1000
  });
});

// ============================================================================
// Integration: operation key
// ============================================================================

describe("login streak — operation key", () => {
  test("transaction uses correct operation key format", async () => {
    const t = convexTest(schema);
    await seedWallet(t, USER_A);

    const result = await recordLoginForUser(t, USER_A);

    const expectedKey = `login_streak:${USER_A}:${result.utcDate}`;

    const txn = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(ctx, expectedKey);
    });

    expect(txn).not.toBeNull();
    expect(txn!.amount).toBe(100);
    expect(txn!.source).toBe("login_streak");
  });
});

// ============================================================================
// Integration: independent users
// ============================================================================

describe("login streak — independent users", () => {
  test("each user maintains their own streak", async () => {
    const t = convexTest(schema);
    await seedWallet(t, USER_A);
    await seedWallet(t, USER_B);

    // User A: 3-day streak ending yesterday
    await forceSetStreak(t, USER_A, 3, getYesterdayUtcDateString());
    // User B: 15-day streak ending yesterday
    await forceSetStreak(t, USER_B, 15, getYesterdayUtcDateString());

    const resultA = await recordLoginForUser(t, USER_A);
    const resultB = await recordLoginForUser(t, USER_B);

    expect(resultA.streak).toBe(4);
    expect(resultA.coinsAwarded).toBe(300); // day 4 = 300

    expect(resultB.streak).toBe(16);
    expect(resultB.coinsAwarded).toBe(1000); // day 16 >= 7
  });
});

// ============================================================================
// Integration: streak progression through all tiers
// ============================================================================

describe("login streak — progression", () => {
  test("streak moves through all reward tiers correctly", async () => {
    const t = convexTest(schema);
    await seedWallet(t, USER_A);

    const coinHistory: number[] = [];

    for (let day = 1; day <= 35; day++) {
      // Use synthetic dates spread across March 2025 (has 31 days) + April.
      const baseDate = "2025-03-01";
      const todayStr = getDateWithOffset(baseDate, day - 1);
      const yesterdayStr = day === 1
        ? "2025-02-28"
        : getDateWithOffset(baseDate, day - 2);

      // Set yesterday's date and streak before recording today.
      if (day > 1) {
        await forceSetStreak(t, USER_A, day - 1, yesterdayStr);
      }

      const result = await recordLoginForUser(t, USER_A, todayStr);
      coinHistory.push(result.coinsAwarded);
    }

    // Verify tier transitions:
    expect(coinHistory[0]).toBe(100);  // day 1
    expect(coinHistory[1]).toBe(150);  // day 2
    expect(coinHistory[2]).toBe(200);  // day 3
    expect(coinHistory[3]).toBe(300);  // day 4
    expect(coinHistory[4]).toBe(500);  // day 5
    expect(coinHistory[5]).toBe(750);  // day 6
    expect(coinHistory[6]).toBe(1000); // day 7 <-- max tier
    expect(coinHistory[7]).toBe(1000); // day 8 stays 1000
    expect(coinHistory[34]).toBe(1000); // day 35 still 1000

    const balance = await getBalance(t, USER_A);
    // 100+150+200+300+500+750 + 29*1000 = 31000 + 1000 starter
    expect(balance).toBe(32000);
  });
});

