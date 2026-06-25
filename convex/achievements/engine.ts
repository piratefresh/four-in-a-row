// ============================================================================
// Achievement progress & reward engine — STO-236
// ----------------------------------------------------------------------------
// Evaluates authoritative game facts during settlement, updates progress for
// progress achievements, and grants coin rewards for newly completed
// achievements / tiers using idempotent ledger transactions.
//
// Supported: all achievements except Tournament Regular and Sit & Go Slayer
// (both marked active: false in definitions).
// ============================================================================

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  buildOperationKey,
  creditWallet,
} from "../wallet/ledger";
import { DEV_BOT_AUTH_PREFIX } from "../games/gamesShared";
import {
  ACHIEVEMENTS,
  type Achievement,
  type AchievementTier,
} from "./definitions";

const REWARD_NAMESPACE = "reward" as const;
const ACHIEVEMENT_NAMESPACE = "achievement" as const;

// ============================================================================
// Types
// ============================================================================

export type AchievementGameFacts = {
  // Per-player facts keyed by playerId.
  playerFacts: Map<string, PlayerGameFacts>;
  // Global winners (includes tied winners).
  winnerIds: string[];
  // The primary winner's score (for single-winner achievements).
  winningScore: number | null;
  // The primary winner's word.
  winningWord: string | null;
};

export type PlayerGameFacts = {
  authUserId: string;
  // WORD_SUBMITTED / WON_HAND
  submittedWord: string | null;
  wordScore: number;
  wordLength: number;
  // USED_FULL_RACK — all 7 tiles from hand used in word.
  isFullRack: boolean;
  // USED_TWO_LETTER_TILE — word includes a 2L tile.
  usedTwoLetterTile: boolean;
  // DOUBLED_TILE_DECIDED_WIN — doubled tile pushed score above runner-up.
  decidedByDoubledTile: boolean;
  // ALL_IN_WIN — winner went all-in.
  wentAllIn: boolean;
  allInStage: string | null;
  // RIVER_RAISE_WIN — winner raised on the river.
  raisedOnRiver: boolean;
  // COMEBACK_WIN — stack ratio at hand start.
  stackRatioAtHandStart: number;
  // REACHED_SHOWDOWN
  reachedShowdown: boolean;
  // WON_HAND
  wonHand: boolean;
};

export type AchievementAward = {
  achievementId: string;
  achievementName: string;
  tierIndex?: number;
  playerId: string;
  authUserId: string;
  amount: number;
};

export type AchievementResult = {
  awards: AchievementAward[];
  progressUpdates: Array<{
    achievementId: string;
    authUserId: string;
    newProgress: number;
  }>;
};

// ============================================================================
// Helpers
// ============================================================================

function isBot(authUserId: string): boolean {
  return authUserId.startsWith(DEV_BOT_AUTH_PREFIX);
}

function isActive(achievement: Achievement): boolean {
  return achievement.active !== false;
}

function isTournamentAchievement(id: string): boolean {
  return id === "tournament_regular" || id === "sng_winner";
}

// ============================================================================
// Condition evaluation
// ============================================================================

export function evaluateCondition(
  value: number | string | boolean | null,
  op: string,
  expected: number | string | boolean,
): boolean {
  if (value === null || value === undefined) return false;

  if (op === "==") return String(value) === String(expected);
  if (op === ">=") return Number(value) >= Number(expected);
  if (op === "<") return Number(value) < Number(expected);
  if (op === "matches") {
    try {
      return new RegExp(String(expected), "i").test(String(value));
    } catch {
      return false;
    }
  }
  return false;
}

// ============================================================================
// Score helpers for Double Trouble
// ============================================================================

function computeScoreWithoutMultipliers(
  tiles: Array<{ baseValue: number; multiplier?: string }>,
): number {
  return tiles.reduce((sum, t) => sum + t.baseValue, 0);
}

// ============================================================================
// Game fact extraction
// ============================================================================

/**
 * Extract per-player and per-game facts from a completed game.
 * Called from settlement when all data is available.
 */
export async function extractGameFacts(
  ctx: MutationCtx,
  gameId: Id<"games">,
  hands: Array<{ _id: Id<"playerHands">; playerId: string; chips: number; totalBet: number; hasFolded: boolean }>,
  submissions: Array<{
    playerId: string;
    word: string;
    score: number;
    tiles: Array<{ baseValue: number; multiplier?: string }>;
    scoreBreakdown: { basePoints: number; multiplierBonus: number; fullRackBonus: number };
  }>,
  players: Array<{ _id: Id<"players">; authUserId: string }>,
  winnerIds: string[],
  winningScore: number | null,
  startingChips: number,
): Promise<AchievementGameFacts> {
  const playerFacts = new Map<string, PlayerGameFacts>();
  const playerById = new Map(players.map((p) => [String(p._id), p]));
  const submissionByPlayer = new Map(submissions.map((s) => [s.playerId, s]));

  // Compute runner-up score for double_trouble comparison.
  const eligibleSubmissions = submissions.filter((s) =>
    winnerIds.includes(s.playerId) || !hands.find((h) => h.playerId === s.playerId)?.hasFolded,
  );
  const sortedSubmissions = [...eligibleSubmissions].sort((a, b) => b.score - a.score);
  const runnerUpScore = sortedSubmissions.length >= 2 ? sortedSubmissions[1]!.score : -1;

  for (const hand of hands) {
    const player = playerById.get(hand.playerId);
    if (!player) continue;
    if (isBot(player.authUserId)) continue;

    const sub = submissionByPlayer.get(hand.playerId);
    const wonHand = winnerIds.includes(hand.playerId);
    const reachedShowdown = !hand.hasFolded;
    const stackRatio =
      startingChips > 0 ? (hand.chips + hand.totalBet) / startingChips : 1;

    let wentAllIn = false;
    let allInStage: string | null = null;
    let raisedOnRiver = false;
    let decidedByDoubledTile = false;

    // Only query traces for winners (expensive operation).
    if (wonHand) {
      // Detect all-in: look for any trace where winner's chips went to 0.
      const traces = await ctx.db
        .query("gameTraces")
        .withIndex("by_gameId_createdAt", (q) =>
          q.eq("gameId", gameId),
        )
        .collect();

      for (const trace of traces) {
        if (trace.playerId !== hand.playerId) continue;

        // All-in detection: chips went to 0 on a betting action.
        if (
          trace.chipsBefore != null &&
          trace.chipsBefore > 0 &&
          trace.chipsAfter != null &&
          trace.chipsAfter === 0 &&
          (trace.action === "raise" || trace.action === "call")
        ) {
          wentAllIn = true;
          allInStage = trace.stage ?? null;
        }

        // River raise detection.
        if (
          trace.action === "raise" &&
          trace.stage === "river"
        ) {
          raisedOnRiver = true;
        }
      }

      // Double Trouble: did a doubled tile decide the win?
      if (sub && sub.score > 0 && runnerUpScore >= 0) {
        const scoreWithoutMultipliers = computeScoreWithoutMultipliers(sub.tiles);
        if (
          scoreWithoutMultipliers <= runnerUpScore &&
          sub.score > runnerUpScore
        ) {
          decidedByDoubledTile = true;
        }
      }
    }

    const facts: PlayerGameFacts = {
      authUserId: player.authUserId,
      submittedWord: sub?.word ?? null,
      wordScore: sub?.score ?? 0,
      wordLength: sub?.word?.length ?? 0,
      isFullRack: sub ? sub.scoreBreakdown.fullRackBonus > 0 : false,
      usedTwoLetterTile: sub
        ? sub.tiles.some((t) => t.multiplier === "2L")
        : false,
      decidedByDoubledTile,
      wentAllIn,
      allInStage,
      raisedOnRiver,
      stackRatioAtHandStart: stackRatio,
      reachedShowdown,
      wonHand,
    };

    playerFacts.set(hand.playerId, facts);
  }

  return {
    playerFacts,
    winnerIds,
    winningScore,
    winningWord: null,
  };
}

// ============================================================================
// Progress helpers
// ============================================================================

async function getProgress(
  ctx: MutationCtx,
  authUserId: string,
  achievementId: string,
) {
  const existing = await ctx.db
    .query("achievementProgress")
    .withIndex("by_authUserId_achievement", (q) =>
      q.eq("authUserId", authUserId).eq("achievementId", achievementId),
    )
    .first();
  return existing;
}

async function upsertProgress(
  ctx: MutationCtx,
  authUserId: string,
  achievementId: string,
  updates: {
    progress?: number;
    completedTiers?: number[];
    seenWords?: string[];
    targetWordsSeen?: string[];
  },
) {
  const existing = await getProgress(ctx, authUserId, achievementId);
  const now = Date.now();

  const patch: Record<string, unknown> = { updatedAt: now };
  if (updates.progress !== undefined) patch.progress = updates.progress;
  if (updates.completedTiers !== undefined) patch.completedTiers = updates.completedTiers;
  if (updates.seenWords !== undefined) patch.seenWords = updates.seenWords;
  if (updates.targetWordsSeen !== undefined) patch.targetWordsSeen = updates.targetWordsSeen;

  if (existing) {
    await ctx.db.patch(existing._id, patch);
  } else {
    await ctx.db.insert("achievementProgress", {
      authUserId,
      achievementId,
      progress: updates.progress ?? 0,
      completedTiers: updates.completedTiers ?? [],
      seenWords: updates.seenWords,
      targetWordsSeen: updates.targetWordsSeen,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// ============================================================================
// Achievement evaluation
// ============================================================================

export async function evaluateAchievements(
  ctx: MutationCtx,
  gameId: Id<"games">,
  facts: AchievementGameFacts,
): Promise<AchievementResult> {
  const awards: AchievementAward[] = [];
  const progressUpdates: AchievementResult["progressUpdates"] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (!isActive(achievement)) continue;
    if (isTournamentAchievement(achievement.id)) continue;

    const hasTiers = achievement.tiers && achievement.tiers.length > 0;

    // Evaluate per-player.
    for (const [playerId, pf] of facts.playerFacts) {
      const triggered = doesAchievementTrigger(achievement, pf);
      if (!triggered) continue;

      if (achievement.type === "instant") {
        // Invalid words (score 0) never trigger word achievements.
        if (isWordTrigger(achievement.trigger) && pf.submittedWord !== null && pf.wordScore <= 0) continue;

        // Instant: check condition once.
        const met = evaluateInstantCondition(achievement, pf, facts);
        if (!met) continue;

        // Check not already completed.
        const progress = await getProgress(ctx, pf.authUserId, achievement.id);
        if (progress && progress.completedTiers.length > 0) continue;

        // Grant the top-level reward (tiers override top-level).
        const amount = hasTiers ? 0 : achievement.coins;
        if (amount > 0) {
          const opKey = buildOperationKey(
            ACHIEVEMENT_NAMESPACE,
            pf.authUserId,
            `${achievement.id}:unlocked:${String(gameId)}`,
          );
          try {
            await creditWallet(ctx, {
              authUserId: pf.authUserId,
              amount,
              source: "achievement",
              operationKey: opKey,
              gameId,
            });
            awards.push({
              achievementId: achievement.id,
              achievementName: achievement.name,
              playerId,
              authUserId: pf.authUserId,
              amount,
            });
          } catch {
            // Idempotent.
          }
        }

        await upsertProgress(ctx, pf.authUserId, achievement.id, {
          progress: 1,
          completedTiers: hasTiers ? [0] : [0],
        });

        // Grant each tier for instant achievements with tiers.
        if (hasTiers && achievement.tiers) {
          for (let ti = 0; ti < achievement.tiers.length; ti++) {
            const tier = achievement.tiers[ti]!;
            if (tier.coins <= 0) continue;
            const tierKey = buildOperationKey(
              ACHIEVEMENT_NAMESPACE,
              pf.authUserId,
              `${achievement.id}:tier:${ti}:${String(gameId)}`,
            );
            try {
              await creditWallet(ctx, {
                authUserId: pf.authUserId,
                amount: tier.coins,
                source: "achievement",
                operationKey: tierKey,
                gameId,
              });
              awards.push({
                achievementId: achievement.id,
                achievementName: achievement.name,
                tierIndex: ti,
                playerId,
                authUserId: pf.authUserId,
                amount: tier.coins,
              });
            } catch {
              // Idempotent.
            }
          }
        }
      } else {
        // Progress: increment counter, check tiers.
        await evaluateProgressAchievement(
          ctx,
          gameId,
          achievement,
          playerId,
          pf,
          facts,
          awards,
          progressUpdates,
        );
      }
    }
  }

  return { awards, progressUpdates };
}

function isWordTrigger(trigger: string): boolean {
  return trigger === "WORD_SUBMITTED" || trigger === "PLAYED_SPECIFIC_WORD";
}

function doesAchievementTrigger(
  achievement: Achievement,
  pf: PlayerGameFacts,
): boolean {
  const t = achievement.trigger;
  if (t === "WORD_SUBMITTED") return pf.submittedWord !== null;
  if (t === "WON_HAND") return pf.wonHand;
  if (t === "REACHED_SHOWDOWN") return pf.reachedShowdown;
  if (t === "USED_FULL_RACK") return pf.wonHand && pf.isFullRack;
  if (t === "DOUBLED_TILE_DECIDED_WIN") return pf.wonHand && pf.decidedByDoubledTile;
  if (t === "USED_TWO_LETTER_TILE") return pf.wonHand && pf.usedTwoLetterTile;
  if (t === "PLAYED_SPECIFIC_WORD") return pf.submittedWord !== null;
  if (t === "ALL_IN_WIN") return pf.wonHand && pf.wentAllIn;
  if (t === "RIVER_RAISE_WIN") return pf.wonHand && pf.raisedOnRiver;
  if (t === "COMEBACK_WIN") return pf.wonHand;
  return false;
}

function evaluateInstantCondition(
  achievement: Achievement,
  pf: PlayerGameFacts,
  facts: AchievementGameFacts,
): boolean {
  const { field, op, value } = achievement.condition;

  switch (field) {
    case "wordScore":
      return evaluateCondition(pf.wordScore, op, value);
    case "count":
      // Instant achievements don't use count conditions typically.
      return true;
    case "decidedByDoubledTile":
      return evaluateCondition(pf.decidedByDoubledTile, op, value);
    case "word":
      return evaluateCondition(pf.submittedWord, op, value);
    case "allInPhase":
      return evaluateCondition(pf.allInStage, op, value);
    case "stackRatioAtHandStart":
      return evaluateCondition(pf.stackRatioAtHandStart, op, value);
    case "wordLength":
      return evaluateCondition(pf.wordLength, op, value);
    default:
      return false;
  }
}

async function evaluateProgressAchievement(
  ctx: MutationCtx,
  gameId: Id<"games">,
  achievement: Achievement,
  playerId: string,
  pf: PlayerGameFacts,
  facts: AchievementGameFacts,
  awards: AchievementAward[],
  progressUpdates: AchievementResult["progressUpdates"],
): Promise<void> {
  const existing = await getProgress(ctx, pf.authUserId, achievement.id);
  const completedTiers = existing?.completedTiers ?? [];
  const hasTiers = achievement.tiers && achievement.tiers.length > 0;

  // Determine what to increment by.
  let increment = 1;
  let newSeenWords: string[] | undefined;
  let newTargetWordsSeen: string[] | undefined;

  if (achievement.id === "vocabularian" && pf.submittedWord) {
    // Only count unique new words.
    const seen = new Set(existing?.seenWords ?? []);
    if (!seen.has(pf.submittedWord.toLowerCase())) {
      seen.add(pf.submittedWord.toLowerCase());
      newSeenWords = [...seen];
    } else {
      // Word already seen, no progress increment.
      increment = 0;
    }
  }

  if (achievement.id === "brewmaster" && pf.submittedWord && achievement.targetWords) {
    const targets = new Set(achievement.targetWords.map((w) => w.toUpperCase()));
    const word = pf.submittedWord.toUpperCase();
    if (targets.has(word)) {
      const seen = new Set(existing?.targetWordsSeen ?? []);
      if (!seen.has(word)) {
        seen.add(word);
        newTargetWordsSeen = [...seen];
      } else {
        increment = 0;
      }
    } else {
      increment = 0;
    }
  }

  // Only increment for valid word submissions on word-based achievements.
  if (
    (achievement.trigger === "WORD_SUBMITTED" ||
      achievement.trigger === "PLAYED_SPECIFIC_WORD") &&
    pf.wordScore <= 0 &&
    pf.submittedWord !== null
  ) {
    // Invalid words (score 0) do not count for achievements.
    increment = 0;
  }

  const newProgress = (existing?.progress ?? 0) + increment;

  // Update progress.
  await upsertProgress(ctx, pf.authUserId, achievement.id, {
    progress: newProgress,
    completedTiers,
    seenWords: newSeenWords,
    targetWordsSeen: newTargetWordsSeen,
  });

  if (increment > 0) {
    progressUpdates.push({
      achievementId: achievement.id,
      authUserId: pf.authUserId,
      newProgress,
    });
  }

  // Check tiers.
  if (hasTiers && achievement.tiers) {
    for (let ti = 0; ti < achievement.tiers.length; ti++) {
      const tier = achievement.tiers[ti]!;
      if (completedTiers.includes(ti)) continue; // Already granted.
      if (newProgress < tier.at) continue;

      if (tier.coins > 0) {
        const tierKey = buildOperationKey(
          ACHIEVEMENT_NAMESPACE,
          pf.authUserId,
          `${achievement.id}:tier:${ti}:${String(gameId)}`,
        );
        try {
          await creditWallet(ctx, {
            authUserId: pf.authUserId,
            amount: tier.coins,
            source: "achievement",
            operationKey: tierKey,
            gameId,
          });
          awards.push({
            achievementId: achievement.id,
            achievementName: achievement.name,
            tierIndex: ti,
            playerId,
            authUserId: pf.authUserId,
            amount: tier.coins,
          });
        } catch {
          // Idempotent.
        }
      }

      completedTiers.push(ti);
    }

    // Persist updated completed tiers.
    await upsertProgress(ctx, pf.authUserId, achievement.id, {
      progress: newProgress,
      completedTiers,
      seenWords: newSeenWords,
    });
  }

  // For non-tier progress achievements, check if condition is now met.
  if (!hasTiers && completedTiers.length === 0) {
    const valueForCondition =
      achievement.id === "vocabularian"
        ? (newSeenWords ?? existing?.seenWords ?? []).length
        : newProgress;

    if (evaluateCondition(valueForCondition, achievement.condition.op, achievement.condition.value)) {
      if (achievement.coins > 0) {
        const opKey = buildOperationKey(
          ACHIEVEMENT_NAMESPACE,
          pf.authUserId,
          `${achievement.id}:completed:${String(gameId)}`,
        );
        try {
          await creditWallet(ctx, {
            authUserId: pf.authUserId,
            amount: achievement.coins,
            source: "achievement",
            operationKey: opKey,
            gameId,
          });
          awards.push({
            achievementId: achievement.id,
            achievementName: achievement.name,
            playerId,
            authUserId: pf.authUserId,
            amount: achievement.coins,
          });
        } catch {
          // Idempotent.
        }
      }

      await upsertProgress(ctx, pf.authUserId, achievement.id, {
        progress: newProgress,
        completedTiers: [0],
      });
    }
  }
}
