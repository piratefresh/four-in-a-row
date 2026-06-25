// ============================================================================
// Login streak rewards — STO-238
// ----------------------------------------------------------------------------
// Automatically grants a coin reward on the first authenticated session
// observed each UTC day. Consecutive UTC dates extend the streak; a gap
// resets to day one.
//
// Streak reward schedule (7-day cycle):
//   Day 1 → 100 coins
//   Day 2 → 150 coins
//   Day 3 → 200 coins
//   Day 4 → 300 coins
//   Day 5 → 500 coins
//   Day 6 → 750 coins
//   Day 7+ → 1,000 coins
//
// Idempotent via operation key: login_streak:{authUserId}:{utcDate}
// ============================================================================

import { mutation, query } from "./_generated/server";
import {
  buildOperationKey,
  creditWallet,
  OPERATION_NAMESPACES,
} from "./wallet/ledger";
import { requireVerifiedUser } from "./identity";
import { getVerifiedUserId } from "./identity";

export type LoginStreakResult = {
  recorded: boolean;
  streak: number;
  coinsAwarded: number;
  utcDate: string;
};

export function getUtcDateString(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export function getYesterdayUtcDateString(): string {
  const now = new Date(Date.now() - 86400000);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export function getStreakCoinAmount(streakDay: number): number {
  if (streakDay >= 7) return 1000;
  if (streakDay >= 6) return 750;
  if (streakDay >= 5) return 500;
  if (streakDay >= 4) return 300;
  if (streakDay >= 3) return 200;
  if (streakDay >= 2) return 150;
  return 100;
}

/**
 * Public mutation called from the frontend when an authenticated user
 * loads the app. Safe to call on every page load — idempotent per UTC day.
 */
export const recordLogin = mutation({
  args: {},
  handler: async (ctx) => {
    const { authUserId } = await requireVerifiedUser(ctx);
    const utcDate = getUtcDateString();
    const yesterday = getYesterdayUtcDateString();

    // Look up existing streak.
    const existing = await ctx.db
      .query("loginStreaks")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
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

    // Credit wallet with idempotent key.
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

    // Upsert streak record.
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
  },
});

/**
 * Public query for the wallet page to display current streak info.
 * Read-only — does not modify any state.
 */
export const getMyStreak = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getVerifiedUserId(ctx);
    if (!authUserId) {
      return { currentStreak: 0, lastLoginDate: null };
    }

    const streak = await ctx.db
      .query("loginStreaks")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .first();

    if (!streak) {
      return { currentStreak: 0, lastLoginDate: null };
    }

    const utcDate = getUtcDateString();
    const yesterday = getYesterdayUtcDateString();
    const isActiveToday = streak.lastLoginDate === utcDate;
    const isActiveYesterday = streak.lastLoginDate === yesterday;

    return {
      currentStreak: isActiveToday || isActiveYesterday ? streak.currentStreak : 0,
      lastLoginDate: streak.lastLoginDate,
    };
  },
});
