import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  ACHIEVEMENTS,
  getActiveAchievements,
  RARITY_CONFIG,
  type Achievement,
  type AchievementCondition,
  type Rarity,
} from "./achievements/definitions";
import { evaluateCondition } from "./achievements/engine";

export type AchievementWithProgress = Achievement & {
  progress: number;
  completedTiers: number[];
  isCompleted: boolean;
  totalCoinsEarned: number;
};

export type GetMyAchievementsResult = {
  achievements: AchievementWithProgress[];
  totalCoinsEarned: number;
  totalRarityPoints: number;
  unlockedCount: number;
  totalCount: number;
};

/**
 * Public query: returns all active achievement definitions merged with the
 * authenticated user's progress from the achievementProgress table.
 * Hidden achievements are omitted unless at least one tier is completed.
 */
export const getMyAchievements = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const authUserId = identity?.tokenIdentifier ?? identity?.subject;
    if (!authUserId) {
      return {
        achievements: [],
        totalCoinsEarned: 0,
        totalRarityPoints: 0,
        unlockedCount: 0,
        totalCount: 0,
      };
    }

    const active = getActiveAchievements();
    const progressDocs = await ctx.db
      .query("achievementProgress")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .collect();

    const progressByAchievementId = new Map(
      progressDocs.map((p) => [p.achievementId, p]),
    );

    let totalCoinsEarned = 0;
    const merged: AchievementWithProgress[] = [];

    for (const achievement of active) {
      const progressDoc = progressByAchievementId.get(achievement.id);

      // Hidden achievements: excluded unless the user has some progress.
      if (achievement.hidden && !progressDoc) continue;

      const progress = progressDoc?.progress ?? 0;
      const completedTiers = progressDoc?.completedTiers ?? [];

      const isCompleted =
        achievement.type === "instant"
          ? completedTiers.length > 0
          : evaluateCondition(
              progress,
              achievement.condition.op,
              achievement.condition.value,
            );

      const coinsEarned = computeCoinsEarned(achievement, completedTiers);
      totalCoinsEarned += coinsEarned;

      merged.push({
        ...achievement,
        progress,
        completedTiers,
        isCompleted,
        totalCoinsEarned: coinsEarned,
      });
    }

    // Sort by category, then by name.
    const categoryOrder = ["wordcraft", "poker", "progression", "hidden"];
    merged.sort((a, b) => {
      const catA = categoryOrder.indexOf(a.category);
      const catB = categoryOrder.indexOf(b.category);
      if (catA !== catB) return catA - catB;
      return a.name.localeCompare(b.name);
    });

    const unlockedCount = merged.filter((a) => a.isCompleted).length;
    const totalRarityPoints = merged
      .filter((a) => a.isCompleted)
      .reduce((sum, a) => sum + (RARITY_CONFIG[a.rarity]?.points ?? 0), 0);

    return {
      achievements: merged,
      totalCoinsEarned,
      totalRarityPoints,
      unlockedCount,
      totalCount: active.length,
    };
  },
});

function computeCoinsEarned(
  achievement: Achievement,
  completedTiers: number[],
): number {
  let total = 0;

  // For instant achievements: the base coins are awarded on first unlock.
  if (
    achievement.type === "instant" &&
    completedTiers.length > 0 &&
    achievement.coins > 0
  ) {
    total += achievement.coins;
  }

  // For progress achievements: sum tier rewards for completed tiers.
  if (achievement.tiers) {
    for (const tierIndex of completedTiers) {
      const tier = achievement.tiers[tierIndex];
      if (tier) total += tier.coins;
    }
  }

  // For progress achievements without tiers but with completion reward.
  if (
    achievement.type === "progress" &&
    (!achievement.tiers || achievement.tiers.length === 0) &&
    completedTiers.length > 0 &&
    achievement.coins > 0
  ) {
    total += achievement.coins;
  }

  return total;
}

// ============================================================================
// Game rewards summary (for best-effort toasts after game completion)
// ============================================================================

export type GameRewardEntry = {
  amount: number;
  source: string;
};

export type GameAchievementEntry = {
  amount: number;
  name: string;
};

export type GameRewardsResult = {
  rewards: GameRewardEntry[];
  achievements: GameAchievementEntry[];
  totalCoins: number;
};

export const getMyGameRewards = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const authUserId = identity?.tokenIdentifier ?? identity?.subject;
    if (!authUserId) {
      return { rewards: [], achievements: [], totalCoins: 0 };
    }

    // Query transactions for this user, filtered by gameId.
    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_authUserId_createdAt", (q) =>
        q.eq("authUserId", authUserId),
      )
      .filter((q) => q.eq(q.field("gameId"), args.gameId))
      .collect();

    const rewards: GameRewardEntry[] = [];
    const achievements: GameAchievementEntry[] = [];

    for (const tx of txs) {
      if (tx.source === "reward" || tx.source === "tutorial") {
        rewards.push({ amount: tx.amount, source: tx.source });
      } else if (tx.source === "achievement") {
        // Extract achievement name from operation key: achievement:{userId}:{id}:unlocked:{gameId}
        const parts = tx.operationKey.split(":");
        const achievementId = parts[2];
        const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
        achievements.push({
          amount: tx.amount,
          name: def?.name ?? achievementId ?? "Unknown",
        });
      }
    }

    const totalCoins = [...rewards, ...achievements].reduce(
      (sum, e) => sum + e.amount,
      0,
    );

    return { rewards, achievements, totalCoins };
  },
});
