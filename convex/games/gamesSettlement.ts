// ============================================================================
// Settlement & completion — STO-234
// ----------------------------------------------------------------------------
// One completion API (`completeGame`) is called by every game-completion
// path (progression fold wins, showdown submissions, forfeits, timer
// resolution). It persists winner/completion data, records the trace,
// applies wallet payouts via duplicate-safe settlement, marks the game
// settled, and clears `activeGameId` on every participant.
//
// Settlement flows through a pipeline of reward rules, each receiving the
// same SettlementContext. Adding a new reward type means writing one rule
// function — no orchestration changes needed.
//
// Pure calculation functions (`findEligibleWinnerIds`, `splitPotBySeatOrder`,
// `buildPayouts`) are exported for unit testing. Database writes are kept in
// the orchestration functions only.
// ============================================================================

import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { awardPotToStack } from "./tableSession";
import { getHighestScoringTileValue } from "./gamesScoring";
import { AI_DEALER_PLAYER_ID, DEV_BOT_AUTH_PREFIX } from "./gamesShared";
import { recordGameCompletion } from "../activityFeed";
import { clearSettledGameForParticipants } from "./gamesProgression";
import { awardGameplayRewards } from "./gamesRewards";
import { awardTutorialCompletionReward } from "../tutorialReward";
import {
  extractGameFacts,
  evaluateAchievements,
} from "../achievements/engine";
import { buildSettlementContext } from "./settlement/context";
import type { SettlementEntry } from "./settlement/types";

// TODO(high-tile-tie-break): Replace the temporary whole-coin split-pot logic
// with the future high-tile tie-break flow once that ticket is implemented.

// ---------------------------------------------------------------------------
// Payout types (public — used by context builder and tests)
// ---------------------------------------------------------------------------

export type PayoutEntry = {
  playerId: string;
  authUserId: string;
  amount: number;
  isBot: boolean;
};

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type SettleGameResult =
  | {
      ok: true;
      status: "settled";
      economyMode: "balance" | "nonBalance" | null;
      payouts: PayoutEntry[];
      entries: SettlementEntry[];
    }
  | {
      ok: true;
      status: "already_settled";
      payouts: PayoutEntry[];
      entries: SettlementEntry[];
    }
  | {
      ok: false;
      status: "not_completed";
    };

export type CompleteGameResult =
  | {
      ok: true;
      settlementStatus: "settled" | "already_settled";
      entries: SettlementEntry[];
    }
  | { ok: false; reason: string };

// ---------------------------------------------------------------------------
// Bot detection
// ---------------------------------------------------------------------------

function isBotAuthUserId(authUserId: string): boolean {
  return authUserId.startsWith(DEV_BOT_AUTH_PREFIX);
}

function isBotPlayerId(playerId: string): boolean {
  return playerId === AI_DEALER_PLAYER_ID;
}

type RankedSubmission = {
  playerId: string;
  score: number;
  word: string | null;
  tiles: Array<{ baseValue: number; multiplier?: "2L" | "3L" }>;
  createdAt: number;
};

// ---------------------------------------------------------------------------
// Pure functions (exported for testing)
// ---------------------------------------------------------------------------

export function findEligibleWinnerIds(
  submissions: RankedSubmission[],
  winnerId: string | undefined,
  eligiblePlayerIds: Set<string>,
): string[] {
  if (!winnerId) return [];
  if (!eligiblePlayerIds.has(winnerId)) return [];

  const eligibleSubmissions = submissions.filter((s) =>
    eligiblePlayerIds.has(s.playerId),
  );
  const winnerSubmission = eligibleSubmissions.find(
    (s) => s.playerId === winnerId,
  );
  if (!winnerSubmission) return [winnerId];

  const winnerWordLength =
    winnerSubmission.word?.length ?? winnerSubmission.tiles.length;
  const winnerHighestTile = getHighestScoringTileValue(winnerSubmission.tiles);

  const tied = eligibleSubmissions.filter(
    (s) =>
      s.score === winnerSubmission.score &&
      (s.word?.length ?? s.tiles.length) === winnerWordLength &&
      getHighestScoringTileValue(s.tiles) === winnerHighestTile,
  );

  return tied.map((s) => s.playerId);
}

export function splitPotBySeatOrder(
  pot: number,
  winnerIds: string[],
  seatIndexByPlayerId: Map<string, number>,
): Map<string, number> {
  const shares = new Map<string, number>();
  if (winnerIds.length === 0 || pot <= 0) return shares;

  const baseShare = Math.floor(pot / winnerIds.length);
  let remainder = pot - baseShare * winnerIds.length;

  const sortedWinnerIds = [...winnerIds].sort((a, b) => {
    const seatA = seatIndexByPlayerId.get(a) ?? Number.MAX_SAFE_INTEGER;
    const seatB = seatIndexByPlayerId.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (seatA !== seatB) return seatA - seatB;
    return a.localeCompare(b);
  });

  for (const winnerId of sortedWinnerIds) {
    const extra = remainder > 0 ? 1 : 0;
    shares.set(winnerId, baseShare + extra);
    if (remainder > 0) remainder -= 1;
  }

  return shares;
}

export type BuildPayoutsInput = {
  hands: Array<{
    playerId: string;
    chips: number;
    hasFolded: boolean;
  }>;
  playerById: Map<string, { authUserId: string; seatIndex: number }>;
  potShares: Map<string, number>;
};

export function buildPayouts(input: BuildPayoutsInput): PayoutEntry[] {
  const payouts: PayoutEntry[] = [];

  for (const hand of input.hands) {
    const player = input.playerById.get(hand.playerId);
    const authUserId = player?.authUserId ?? "";
    const isBot =
      isBotPlayerId(hand.playerId) ||
      (player ? isBotAuthUserId(player.authUserId) : false);
    const potShare = input.potShares.get(hand.playerId) ?? 0;
    const payoutAmount = hand.chips + potShare;

    if (payoutAmount <= 0) continue;

    payouts.push({
      playerId: hand.playerId,
      authUserId,
      amount: payoutAmount,
      isBot,
    });
  }

  return payouts;
}

// ---------------------------------------------------------------------------
// Settlement pipeline
// ---------------------------------------------------------------------------

/**
 * Settlement pipeline — runs after the game is marked completed.
 *
 *   1. Build SettlementContext (all DB queries, maps, winner calculations).
 *   2. Apply wallet payouts for balance games.
 *   3. Run reward rules: gameplay rewards → tutorial reward → achievements.
 *   4. Mark game as settled.
 *
 * Each rule receives the same context and returns SettlementEntry[].
 * Adding a new reward type means writing one rule and adding it to the
 * pipeline array below — no other orchestration changes.
 */
export async function settleGameHandler(
  ctx: MutationCtx,
  args: { gameId: Id<"games">; foldWin?: boolean },
): Promise<SettleGameResult> {
  const game = await ctx.db.get(args.gameId);
  if (!game) {
    throw new ConvexError({
      code: "GAME_NOT_FOUND",
      message: "Game does not exist.",
    });
  }

  if (game.status !== "completed") {
    return { ok: false, status: "not_completed" };
  }

  if (game.settlementState === "settled") {
    return {
      ok: true,
      status: "already_settled",
      payouts: [],
      entries: [],
    };
  }

  // Mark as settling so concurrent callers see the in-progress state.
  await ctx.db.patch(game._id, {
    settlementState: "settling",
    updatedAt: Date.now(),
  });

  // --- 1. Build the unified settlement context ---
  const context = await buildSettlementContext(
    ctx,
    game._id,
    args.foldWin ?? false,
  );

  // --- 2. Award pot winnings to seat stacks for balance games ---
  // In the seat-lifecycle economy, chips stay on the seat: each player's
  // uncommitted stack was already reduced as they wagered, so settlement only
  // adds each winner's pot share to their persistent `tableStack`. No wallet
  // payout is written — the wallet is credited only on leave / cash-out.
  const payoutEntries: SettlementEntry[] = [];
  if (context.isBalanceGame) {
    for (const [playerId, share] of context.potShares) {
      if (share <= 0) continue;
      await awardPotToStack(ctx, { playerId, amount: share });
      const player = context.playerById.get(playerId);
      payoutEntries.push({
        ruleId: "payout",
        playerId,
        authUserId: player?.authUserId ?? "",
        amount: share,
        description: "Pot award",
      });
    }
  }

  // --- 3. Run reward rules ---
  // Each rule receives a narrow input extracted from the unified context.
  // Adding a new reward: write the rule function, then add one line here.
  const allEntries: SettlementEntry[] = [...payoutEntries];

  // 3a. Passive gameplay coin rewards (all game types, humans only).
  const gameplayEntries = await awardGameplayRewards(ctx, {
    gameId: game._id,
    hands: context.hands.map((h) => ({
      _id: h._id,
      playerId: h.playerId,
      hasFolded: h.hasFolded,
    })),
    playerById: context.playerById,
    winnerId: context.game.winnerId ?? undefined,
    winningScore: context.winningScore ?? undefined,
    allWinnerIds: context.allWinnerIds,
    foldWin: context.foldWin,
  });
  allEntries.push(...gameplayEntries);

  // 3b. One-time tutorial completion reward (tutorial games only).
  const tutorialEntries = await awardTutorialCompletionReward(ctx, {
    room: context.room,
    gameId: game._id,
    hands: context.hands.map((h) => ({
      playerId: h.playerId,
      hasFolded: h.hasFolded,
    })),
    playerById: context.playerById,
  });
  allEntries.push(...tutorialEntries);

  // 3c. Achievements (all game types, humans only).
  const facts = await extractGameFacts(
    ctx,
    game._id,
    context.hands.map((h) => ({
      _id: h._id,
      playerId: h.playerId,
      chips: h.chips,
      totalBet: h.totalBet,
      hasFolded: h.hasFolded,
    })),
    context.submissions.map((s) => ({
      playerId: s.playerId,
      word: s.word,
      score: s.score,
      tiles: s.tiles as Array<{ baseValue: number; multiplier?: string }>,
      scoreBreakdown: s.scoreBreakdown,
    })),
    context.players,
    context.allWinnerIds,
    context.winningScore,
    context.startingChips,
  );
  const achievementResult = await evaluateAchievements(ctx, game._id, facts);
  const achievementEntries: SettlementEntry[] = achievementResult.awards.map(
    (a) => ({
      ruleId: `achievement:${a.achievementId}`,
      playerId: a.playerId,
      authUserId: a.authUserId,
      amount: a.amount,
      description: a.tierIndex !== undefined
        ? `${a.achievementName} tier ${a.tierIndex}`
        : a.achievementName,
    }),
  );
  allEntries.push(...achievementEntries);

  // --- 4. Mark as settled ---
  await ctx.db.patch(game._id, {
    settlementState: "settled",
    settledAt: Date.now(),
    updatedAt: Date.now(),
  });

  return {
    ok: true,
    status: "settled",
    economyMode: context.economyMode,
    payouts: context.payouts,
    entries: allEntries,
  };
}

// ---------------------------------------------------------------------------
// Complete game — the single completion orchestration (STO-234)
// ---------------------------------------------------------------------------

export type CompleteGameArgs = {
  gameId: Id<"games">;
  winnerId?: string;
  winningWord?: string;
  winningScore?: number;
  winningScoreBreakdown?: {
    basePoints: number;
    multiplierBonus: number;
    fullRackBonus: number;
  };
  reason: string;
  foldWin?: boolean;
  extraPatch?: Record<string, unknown>;
};

export async function completeGame(
  ctx: MutationCtx,
  args: CompleteGameArgs,
): Promise<CompleteGameResult> {
  const game = await ctx.db.get(args.gameId);
  if (!game) {
    throw new ConvexError({
      code: "GAME_NOT_FOUND",
      message: "Game does not exist.",
    });
  }

  // 1. Persist winner/completion data.
  const now = Date.now();
  await ctx.db.patch(args.gameId, {
    status: "completed",
    winnerId: args.winnerId,
    winningWord: args.winningWord,
    winningScore: args.winningScore,
    winningScoreBreakdown: args.winningScoreBreakdown,
    updatedAt: now,
    ...(args.extraPatch ?? {}),
  });

  // 2. Record the activity-feed completion entry.
  await recordGameCompletion(ctx, args.gameId);

  // 3-4. Settle (build context, apply payouts, run reward rules, mark settled).
  const settleResult = await settleGameHandler(ctx, {
    gameId: args.gameId,
    foldWin: args.foldWin,
  });

  // 5. Clear activeGameId only if settlement succeeded.
  if (settleResult.ok) {
    await clearSettledGameForParticipants(ctx, game.roomId as Id<"rooms">);
    const status =
      settleResult.status === "already_settled" ? "already_settled" : "settled";
    return {
      ok: true,
      settlementStatus: status,
      entries: settleResult.entries,
    };
  }

  return { ok: false, reason: settleResult.status };
}
