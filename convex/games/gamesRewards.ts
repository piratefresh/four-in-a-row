// ============================================================================
// Passive gameplay coin rewards — STO-235
// ----------------------------------------------------------------------------
// Issued during settlement for every human participant, regardless of economy
// mode.  Rewards match the earn rules defined in convex/achievements/definitions.ts
// and use idempotent operation keys so settlement never double-pays.
//
// Earn rules implemented here:
//   hand_complete   (REACHED_SHOWDOWN) → 5 coins
//   hand_win        (WON_HAND)         → 20 coins + floor(score × 0.5) capped at 50
//   daily_first_win (WON_HAND)         → 100 coins, once per UTC day
//
// Returns SettlementEntry[] for unified pipeline consumption.
// ============================================================================

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  buildOperationKey,
  creditWallet,
} from "../wallet/ledger";
import { DEV_BOT_AUTH_PREFIX } from "./gamesShared";
import type { SettlementEntry } from "./settlement/types";

function isBotAuthUserId(authUserId: string): boolean {
  return authUserId.startsWith(DEV_BOT_AUTH_PREFIX);
}

function getUtcDateString(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

type GameplayRewardInput = {
  gameId: Id<"games">;
  hands: Array<{
    _id: Id<"playerHands">;
    playerId: string;
    hasFolded: boolean;
  }>;
  playerById: Map<string, Doc<"players">>;
  winnerId: string | undefined;
  winningScore: number | undefined;
  allWinnerIds: string[];
  foldWin: boolean;
};

const REWARD_NAMESPACE = "reward" as const;

const HAND_COMPLETE_COINS = 5;
const HAND_WIN_BASE_COINS = 20;
const HAND_WIN_PER_POINT = 0.5;
const HAND_WIN_MAX_BONUS = 50;
const DAILY_FIRST_WIN_COINS = 100;

export async function awardGameplayRewards(
  ctx: MutationCtx,
  input: GameplayRewardInput,
): Promise<SettlementEntry[]> {
  const entries: SettlementEntry[] = [];
  const { gameId, hands, playerById, winnerId, winningScore, allWinnerIds, foldWin } = input;
  const gameIdStr = String(gameId);
  const utcDate = getUtcDateString();

  const eligibleHands = hands.filter((h) => !h.hasFolded);
  const winnerIds = new Set(allWinnerIds);

  // ── hand_complete (REACHED_SHOWDOWN): 5 coins ─────────────────────
  if (!foldWin) {
    for (const hand of eligibleHands) {
      const player = playerById.get(hand.playerId);
      if (!player) continue;
      if (isBotAuthUserId(player.authUserId)) continue;

      const opKey = buildOperationKey(
        REWARD_NAMESPACE,
        player.authUserId,
        `hand_complete:${gameIdStr}`,
      );
      try {
        await creditWallet(ctx, {
          authUserId: player.authUserId,
          amount: HAND_COMPLETE_COINS,
          source: "reward",
          operationKey: opKey,
          gameId,
        });
        entries.push({
          ruleId: "hand_complete",
          playerId: hand.playerId,
          authUserId: player.authUserId,
          amount: HAND_COMPLETE_COINS,
          description: "Reached showdown",
        });
      } catch {
        // Idempotent — skip if already credited.
      }
    }
  }

  // ── hand_win (WON_HAND): 20 coins + possible word bonus ──────────
  for (const wid of winnerIds) {
    const winnerHand = hands.find((h) => h.playerId === wid);
    const winner = playerById.get(wid);
    if (!winner || isBotAuthUserId(winner.authUserId) || !winnerHand) continue;

    let wordBonus = 0;
    if (!foldWin && winningScore != null && winningScore > 0) {
      wordBonus = Math.min(
        Math.floor(winningScore * HAND_WIN_PER_POINT),
        HAND_WIN_MAX_BONUS,
      );
    }

    const totalAmount = HAND_WIN_BASE_COINS + wordBonus;

    const opKey = buildOperationKey(
      REWARD_NAMESPACE,
      winner.authUserId,
      `hand_win:${gameIdStr}`,
    );
    try {
      await creditWallet(ctx, {
        authUserId: winner.authUserId,
        amount: totalAmount,
        source: "reward",
        operationKey: opKey,
        gameId,
      });
      entries.push({
        ruleId: "hand_win",
        playerId: wid,
        authUserId: winner.authUserId,
        amount: totalAmount,
        description:
          wordBonus > 0
            ? `Won hand (+${HAND_WIN_BASE_COINS}) + word bonus (+${wordBonus})`
            : `Won hand (+${HAND_WIN_BASE_COINS})`,
      });
    } catch {
      // Idempotent.
    }
  }

  // ── daily_first_win (WON_HAND, once per UTC day): 100 coins ─────
  for (const wid of winnerIds) {
    const winner = playerById.get(wid);
    const winnerHand = hands.find((h) => h.playerId === wid);
    if (
      !winner ||
      isBotAuthUserId(winner.authUserId) ||
      !winnerHand ||
      winnerHand.hasFolded
    ) continue;

    const opKey = buildOperationKey(
      REWARD_NAMESPACE,
      winner.authUserId,
      `daily_first_win:${utcDate}`,
    );
    try {
      await creditWallet(ctx, {
        authUserId: winner.authUserId,
        amount: DAILY_FIRST_WIN_COINS,
        source: "reward",
        operationKey: opKey,
      });
      entries.push({
        ruleId: "daily_first_win",
        playerId: wid,
        authUserId: winner.authUserId,
        amount: DAILY_FIRST_WIN_COINS,
        description: "First win of the day",
      });
    } catch {
      // Idempotent — already received today's first-win bonus.
    }
  }

  return entries;
}
