// ============================================================================
// Table-session accounting — the single module allowed to move value between
// a player's wallet, their table stack, and the pot.
// ----------------------------------------------------------------------------
// Part of the Fixed Buy-In Table Stakes epic (M1 — seat-lifecycle economy).
//
// In the new economy, chips live on the SEAT, not the hand:
//   - Buy-in debits the wallet ONCE when a table session opens (join / create
//     / re-activation). It seeds `players.tableStack`.
//   - During a hand, `playerHands.chips` mirrors the seat's uncommitted
//     `tableStack`; every wager decrements both together via
//     `debitStackForWager`.
//   - After a hand, pot winnings are added straight to the winner's
//     `tableStack` via `awardPotToStack` — no wallet write.
//   - The wallet is credited back only on leave / timeout via
//     `cashOutTableSession`.
//
// Duplicate-safe wallet operation keys are derived from
// (player id + tableSessionVersion + rebuyCount) so a replayed join, re-buy,
// or cash-out can never double-charge or double-pay a wallet.
//
// ── Stack invariant ─────────────────────────────────────────────────────────
// During an active BALANCE hand, every seated participant has
//   players.tableStack === playerHands.chips
// EXCEPT during an atomic lifecycle transition (a single mutation that is
// mid-way through updating both). It does NOT apply to non-balance seats
// (their tableStack stays undefined) nor to the seatless AI_DEALER participant.
//
// The invariant only holds because every chip reduction routes through the
// shared betting handlers (which call `syncSeatStack`). Any code that patches
// `playerHands.chips` directly must patch `players.tableStack` in the same
// mutation, or the seat stack will silently desync.
//
// ── AI_DEALER house sink ─────────────────────────────────────────────────────
// The synthetic AI_DEALER participant has no seat row: its starting chips are
// minted at hand start and any pot it wins is burned by `awardPotToStack`
// (a deliberate no-op for seatless participants). Chip conservation therefore
// holds across real seats + wallets, NOT across every hand. This is
// intentional; see the "house sink" test in gamesSettlement.test.ts.
// ============================================================================

import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  buildOperationKey,
  creditWallet,
  debitWallet,
  OPERATION_NAMESPACES,
} from "../wallet/ledger";

// ----------------------------------------------------------------------------
// Validation
// ----------------------------------------------------------------------------

function assertNonNegativeInteger(amount: number, label: string): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new ConvexError({
      code: "INVALID_STACK_AMOUNT",
      message: `${label} must be a non-negative whole number.`,
    });
  }
}

function assertPositiveInteger(amount: number, label: string): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ConvexError({
      code: "INVALID_STACK_AMOUNT",
      message: `${label} must be a positive whole number.`,
    });
  }
}

// ----------------------------------------------------------------------------
// Duplicate-safe operation keys
// ----------------------------------------------------------------------------
//
// A table session is identified by (playerId, tableSessionVersion). The
// version increments each time a seat is re-opened (join after a prior
// cash-out), so keys from a previous session can never collide with a new one.
// `rebuyCount` distinguishes the initial buy-in (r0) from later re-buys.

export function buyInOperationId(
  playerId: Id<"players">,
  tableSessionVersion: number,
  rebuyCount: number,
): string {
  return `${playerId}:v${tableSessionVersion}:r${rebuyCount}`;
}

export function cashOutOperationId(
  playerId: Id<"players">,
  tableSessionVersion: number,
): string {
  return `${playerId}:v${tableSessionVersion}`;
}

// ----------------------------------------------------------------------------
// Session lifecycle
// ----------------------------------------------------------------------------

export type OpenTableSessionArgs = {
  playerId: Id<"players">;
  /** Wallet owner. Ignored (and no debit performed) for bots. */
  authUserId: string;
  buyIn: number;
  /**
   * The seat's prior `tableSessionVersion` (0 for a brand-new seat). The new
   * session opens at `previousSessionVersion + 1`.
   */
  previousSessionVersion?: number;
  /** Bots have no wallet; seed their stack with no debit. */
  isBot?: boolean;
};

/**
 * Open a table session for a seat and seed its stack. Debits exactly `buyIn`
 * from the player's wallet (unless the seat is a bot). Idempotent per session:
 * the wallet operation key is namespaced by the new session version.
 *
 * Returns the new `tableSessionVersion` and seeded `tableStack`.
 */
export async function openTableSession(
  ctx: MutationCtx,
  args: OpenTableSessionArgs,
): Promise<{ tableSessionVersion: number; tableStack: number }> {
  assertPositiveInteger(args.buyIn, "Buy-in");

  const tableSessionVersion = (args.previousSessionVersion ?? 0) + 1;

  if (!args.isBot) {
    await debitWallet(ctx, {
      authUserId: args.authUserId,
      amount: args.buyIn,
      source: "buy_in",
      operationKey: buildOperationKey(
        OPERATION_NAMESPACES.buy_in,
        args.authUserId,
        buyInOperationId(args.playerId, tableSessionVersion, 0),
      ),
    });
  }

  await ctx.db.patch(args.playerId, {
    tableStack: args.buyIn,
    tableSessionVersion,
    rebuyCount: 0,
  });

  return { tableSessionVersion, tableStack: args.buyIn };
}

/**
 * Re-buy an actively-seated player who has busted (`tableStack === 0`).
 * Debits exactly `buyIn`, increments `rebuyCount`, and resets the stack.
 * The caller is responsible for all preconditions except the ones re-checked
 * here (positive buy-in, zero current stack). Never accept a client amount.
 */
export async function rebuyTableSession(
  ctx: MutationCtx,
  args: { player: Doc<"players">; authUserId: string; buyIn: number },
): Promise<{ rebuyCount: number; tableStack: number }> {
  assertPositiveInteger(args.buyIn, "Buy-in");

  const currentStack = args.player.tableStack ?? 0;
  if (currentStack !== 0) {
    throw new ConvexError({
      code: "REBUY_NOT_ALLOWED",
      message: "Re-buy is only allowed when the table stack is empty.",
    });
  }

  const tableSessionVersion = args.player.tableSessionVersion ?? 1;
  const rebuyCount = (args.player.rebuyCount ?? 0) + 1;

  await debitWallet(ctx, {
    authUserId: args.authUserId,
    amount: args.buyIn,
    source: "buy_in",
    operationKey: buildOperationKey(
      OPERATION_NAMESPACES.buy_in,
      args.authUserId,
      buyInOperationId(args.player._id, tableSessionVersion, rebuyCount),
    ),
  });

  await ctx.db.patch(args.player._id, {
    tableStack: args.buyIn,
    rebuyCount,
  });

  return { rebuyCount, tableStack: args.buyIn };
}

/**
 * Cash a seat out: credit its uncommitted `tableStack` back to the wallet and
 * zero the stack. Committed chips already in a live pot are NOT returned — the
 * caller forfeits them via the leave/fold path before calling this.
 *
 * Duplicate-safe: the payout operation key is namespaced by session version,
 * so repeated leave/timeout calls cannot cash out twice. Bots (no wallet) just
 * have their stack zeroed.
 *
 * Returns the amount credited to the wallet (0 for bots or empty stacks).
 */
export async function cashOutTableSession(
  ctx: MutationCtx,
  args: { player: Doc<"players">; isBot?: boolean },
): Promise<{ creditedAmount: number }> {
  const uncommitted = args.player.tableStack ?? 0;
  assertNonNegativeInteger(uncommitted, "Table stack");

  const tableSessionVersion = args.player.tableSessionVersion ?? 1;

  let creditedAmount = 0;
  if (!args.isBot && uncommitted > 0) {
    await creditWallet(ctx, {
      authUserId: args.player.authUserId,
      amount: uncommitted,
      source: "payout",
      operationKey: buildOperationKey(
        OPERATION_NAMESPACES.payout,
        args.player.authUserId,
        cashOutOperationId(args.player._id, tableSessionVersion),
      ),
    });
    creditedAmount = uncommitted;
  }

  if (uncommitted !== 0) {
    await ctx.db.patch(args.player._id, { tableStack: 0 });
  }

  return { creditedAmount };
}

// ----------------------------------------------------------------------------
// In-hand stack movement
// ----------------------------------------------------------------------------
//
// Invariant during an active hand: for a real seat,
//   players.tableStack === playerHands.chips  (the uncommitted remainder).
// Every wager MUST go through `debitStackForWager` so the two stay in lockstep.
// The `AI_DEALER` participant has no seat row; its chips live only on the hand.

/**
 * Mirror an in-hand chip change onto the seat's persistent table stack. Every
 * wager handler (check does nothing; call / raise / all-in) computes the new
 * `playerHands.chips` value, then calls this so `players.tableStack` stays in
 * lockstep. The `AI_DEALER` participant has no seat row and is a safe no-op.
 *
 * This is the single shared helper for the seat side of a wager — the betting
 * engine still owns `game.pot`, `betThisRound`, `totalBet`, and turn state.
 */
export async function syncSeatStack(
  ctx: MutationCtx,
  playerId: string,
  chips: number,
): Promise<void> {
  assertNonNegativeInteger(chips, "Remaining chips");
  const seatId = ctx.db.normalizeId("players", playerId);
  if (!seatId) return;
  const seat = await ctx.db.get(seatId);
  if (!seat) return;
  await ctx.db.patch(seatId, { tableStack: chips });
}

/**
 * Award pot winnings to a seat at settlement. Adds `amount` to the seat's
 * `tableStack` (the persistent uncommitted stack for the next hand). No wallet
 * write — pot chips were already debited from stacks when they were wagered.
 *
 * INTENTIONAL house sink: the seatless `AI_DEALER` participant is a no-op, so
 * a pot it wins is burned rather than paid out. Do not "fix" this into a
 * credit without deciding where those chips should go — see the header note
 * and the house-sink test in gamesSettlement.test.ts.
 */
export async function awardPotToStack(
  ctx: MutationCtx,
  args: { playerId: string; amount: number },
): Promise<void> {
  assertPositiveInteger(args.amount, "Pot award");

  const seatId = ctx.db.normalizeId("players", args.playerId);
  if (!seatId) return; // AI_DEALER / seatless participant — house sink.
  const seat = await ctx.db.get(seatId);
  if (!seat) return;

  await ctx.db.patch(seatId, {
    tableStack: (seat.tableStack ?? 0) + args.amount,
  });
}
