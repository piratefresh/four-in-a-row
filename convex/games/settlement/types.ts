// ============================================================================
// Settlement pipeline types
// ----------------------------------------------------------------------------
// A SettlementContext is the single data bag passed to every reward rule.
// Rules are functions (ctx, context) => SettlementEntry[] that compute and
// apply their own entries using the context's pre-built maps.
//
// Adding a new reward type means writing one new rule function and registering
// it in the pipeline — no orchestration changes, no new return-type fields.
// ============================================================================

import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

// ---------------------------------------------------------------------------
// Settlement context — all facts extracted once, shared by every rule
// ---------------------------------------------------------------------------

export type SettlementContext = {
  game: Doc<"games">;
  room: Doc<"rooms"> | null;
  economyMode: "balance" | "nonBalance" | null;
  isBalanceGame: boolean;
  foldWin: boolean;

  hands: Doc<"playerHands">[];
  players: Doc<"players">[];
  submissions: Doc<"wordSubmissions">[];

  /** playerId → player doc */
  playerById: Map<string, Doc<"players">>;
  /** playerId → seatIndex */
  seatIndexByPlayerId: Map<string, number>;
  /** Non-folded player IDs */
  eligiblePlayerIds: Set<string>;

  /** Primary + tied winners (pot-share recipients). */
  winnerIds: string[];
  /** All winner IDs including tied (for rewards). */
  allWinnerIds: string[];
  winningScore: number | null;
  winningWord: string | null;

  /** playerId → pot share amount */
  potShares: Map<string, number>;
  /** Computed payout entries (all humans + bots, for reporting). */
  payouts: PayoutEntry[];

  /** Starting chips for the game (used by achievement facts). */
  startingChips: number;
};

// ---------------------------------------------------------------------------
// Payout entry (ported from gamesSettlement.ts)
// ---------------------------------------------------------------------------

export type PayoutEntry = {
  playerId: string;
  authUserId: string;
  amount: number;
  isBot: boolean;
};

// ---------------------------------------------------------------------------
// Settlement entry — unified return type for all reward/award rules
// ---------------------------------------------------------------------------

export type SettlementEntry = {
  /** Which rule produced this entry. */
  ruleId: string;
  /** The game-scoped player ID. */
  playerId: string;
  /** The auth-scoped user ID (empty for bots). */
  authUserId: string;
  /** Coin amount. */
  amount: number;
  /** Human-readable description (for toasts / logs). */
  description: string;
};

// ---------------------------------------------------------------------------
// Reward rule — the interface every reward/award function conforms to
// ---------------------------------------------------------------------------

export type SettlementRule = (
  ctx: MutationCtx,
  context: SettlementContext,
) => Promise<SettlementEntry[]>;

// ---------------------------------------------------------------------------
// Settlement pipeline result
// ---------------------------------------------------------------------------

export type SettlementPipelineResult = {
  status: "settled" | "already_settled";
  entries: SettlementEntry[];
};
