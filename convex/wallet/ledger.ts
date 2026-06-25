// ============================================================================
// Wallet ledger — domain invariants
// ----------------------------------------------------------------------------
// These rules are encoded here and referenced by the game lifecycle
// (convex/games/gamesSetup.ts) and settlement (convex/games/gamesSettlement.ts)
// paths. Changing them requires updating both call sites and their tests.
//
// 1. Operation keys are server-namespaced and cannot collide across
//    operation types or users. Every key is built here via
//    `buildOperationKey(namespace, authUserId, operationId)`.
// 2. Only the public `depositPlaytestCoins` mutation accepts an opaque
//    client `operationId`; the full key is constructed server-side.
// 3. When an operation key already exists, the existing transaction must
//    match the requested authUserId, amount, source, and gameId. A mismatch
//    is treated as a collision (OPERATION_KEY_COLLISION) and rejected,
//    never silently returned as `already_processed`.
// 4. Wallet initialization happens through one atomic helper
//    (`initializeWalletWithStarterGrant`) that inserts the wallet, the
//    starter-grant transaction, and the balance update together. It is the
//    single integration point used by both `getOrCreateWallet` and
//    `applyLedgerEntry`.
// 5. `activeGameId` on the auth user means an active, charged, unsettled
//    game — never a waiting game. It is set only after buy-ins, hand
//    creation, and game activation succeed (gamesSetup.ts) and cleared only
//    after successful settlement (gamesSettlement.ts via gamesProgression).
// 6. Missing `economyMode` on a room is treated as `nonBalance` everywhere
//    (gameConfig.ts / rooms helpers). The wallet ledger only writes
//    transactions for `balance` games during buy-in and payout.
// ============================================================================

import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { STARTER_GRANT_AMOUNT, type TransactionSource } from "../schema";

// ----------------------------------------------------------------------------
// Operation key namespaces
// ----------------------------------------------------------------------------
//
// Each namespace is a fixed string prefix. Keys are built as
// `{namespace}:{authUserId}:{operationId}` so that:
//   - different operation types can never share a key, and
//   - different users can never share a key.
//
// `operationId` is the only client-supplied component, and it is only ever
// accepted through `depositPlaytestCoins`. All other callers pass a
// server-derived operationId (e.g. a game id + seat id).

export const OPERATION_NAMESPACES = {
  starter_grant: "starter_grant",
  playtest_deposit: "playtest_deposit",
  buy_in: "buy_in",
  payout: "payout",
  reward: "reward",
  achievement: "achievement",
  login_streak: "login_streak",
  tutorial: "tutorial",
} as const satisfies Record<TransactionSource, string>;

export type OperationNamespace = (typeof OPERATION_NAMESPACES)[keyof typeof OPERATION_NAMESPACES];

export function buildOperationKey(
  namespace: OperationNamespace,
  authUserId: string,
  operationId: string,
): string {
  return `${namespace}:${authUserId}:${operationId}`;
}

// Backwards-compatible helper for the starter grant. The grant is a
// one-per-user operation, so the operationId is fixed as "grant".
const STARTER_GRANT_OPERATION_ID = "grant";

export function starterGrantOperationKey(authUserId: string): string {
  return buildOperationKey(
    OPERATION_NAMESPACES.starter_grant,
    authUserId,
    STARTER_GRANT_OPERATION_ID,
  );
}

export const STARTER_GRANT_OPERATION_PREFIX =
  OPERATION_NAMESPACES.starter_grant;

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type WalletDoc = Doc<"wallets">;
export type TransactionDoc = Doc<"transactions">;

export type ApplyLedgerEntryInput = {
  authUserId: string;
  amount: number;
  source: TransactionSource;
  operationKey: string;
  gameId?: Id<"games">;
};

export type ApplyLedgerEntryResult =
  | {
      status: "applied";
      transaction: TransactionDoc;
      balanceBefore: number;
      balanceAfter: number;
    }
  | {
      status: "already_processed";
      transaction: TransactionDoc;
      balanceBefore: number;
      balanceAfter: number;
    };

// ----------------------------------------------------------------------------
// Reads
// ----------------------------------------------------------------------------

export async function getWallet(
  ctx: QueryCtx,
  authUserId: string,
): Promise<WalletDoc | null> {
  return await ctx.db
    .query("wallets")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
    .unique();
}

export async function getWalletBalance(
  ctx: QueryCtx,
  authUserId: string,
): Promise<number | null> {
  const wallet = await getWallet(ctx, authUserId);
  return wallet?.balance ?? null;
}

/**
 * Look up a transaction by its operation key. When the authUserId is known
 * the composite `by_authUserId_operationKey` index is used so the lookup
 * cannot accidentally cross users.
 */
export async function findTransactionByOperationKey(
  ctx: QueryCtx,
  operationKey: string,
  authUserId?: string,
): Promise<TransactionDoc | null> {
  if (authUserId !== undefined) {
    return await ctx.db
      .query("transactions")
      .withIndex("by_authUserId_operationKey", (q) =>
        q.eq("authUserId", authUserId).eq("operationKey", operationKey),
      )
      .unique();
  }
  return await ctx.db
    .query("transactions")
    .withIndex("by_operationKey", (q) => q.eq("operationKey", operationKey))
    .unique();
}

// ----------------------------------------------------------------------------
// Wallet initialization (single atomic helper)
// ----------------------------------------------------------------------------

/**
 * Insert a wallet, its starter-grant transaction, and the resulting balance
 * update in one atomic mutation. Convex mutations are serializable, so a
 * concurrent caller that also reaches this path will either see the wallet
 * already present (via `getWallet` above) or hit the unique
 * `by_authUserId` index and retry.
 *
 * Returns the freshly-initialized wallet doc with the starter grant applied.
 */
async function initializeWalletWithStarterGrant(
  ctx: MutationCtx,
  authUserId: string,
): Promise<WalletDoc> {
  const grantKey = starterGrantOperationKey(authUserId);

  // If a previous attempt already wrote the starter-grant transaction but
  // crashed before patching the wallet, treat the grant as applied and
  // reconcile the wallet from it.
  const existingGrant = await findTransactionByOperationKey(
    ctx,
    grantKey,
    authUserId,
  );
  if (existingGrant) {
    const wallet = await getWallet(ctx, authUserId);
    if (wallet) return wallet;
  }

  const now = Date.now();
  const walletId = await ctx.db.insert("wallets", {
    authUserId,
    balance: 0,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.insert("transactions", {
    authUserId,
    amount: STARTER_GRANT_AMOUNT,
    source: "starter_grant",
    balanceBefore: 0,
    balanceAfter: STARTER_GRANT_AMOUNT,
    operationKey: grantKey,
    createdAt: now,
  });

  await ctx.db.patch(walletId, {
    balance: STARTER_GRANT_AMOUNT,
    updatedAt: now,
  });

  return (await ctx.db.get(walletId))!;
}

/**
 * Public wrapper used by the `ensureMyWallet` mutation and by tests. Returns
 * the wallet for `authUserId`, creating it (with the one-time starter grant)
 * on first access.
 */
export async function getOrCreateWallet(
  ctx: MutationCtx,
  authUserId: string,
): Promise<WalletDoc> {
  const existing = await getWallet(ctx, authUserId);
  if (existing) return existing;
  return await initializeWalletWithStarterGrant(ctx, authUserId);
}

// ----------------------------------------------------------------------------
// Apply ledger entry (the single write path for balance changes)
// ----------------------------------------------------------------------------

/**
 * Validate that an existing transaction with the same operation key
 * actually represents the same operation the caller is requesting. A key
 * that matches but carries different user/amount/source/game data is a
 * collision and must not be silently treated as a replay.
 */
function assertExistingMatchesRequest(
  existing: TransactionDoc,
  input: ApplyLedgerEntryInput,
): void {
  if (existing.authUserId !== input.authUserId) {
    throw new ConvexError({
      code: "OPERATION_KEY_COLLISION",
      message:
        "Operation key already used by a different user. Generate a new operation id.",
    });
  }
  if (existing.amount !== input.amount) {
    throw new ConvexError({
      code: "OPERATION_KEY_COLLISION",
      message:
        "Operation key already used with a different amount. Generate a new operation id.",
    });
  }
  if (existing.source !== input.source) {
    throw new ConvexError({
      code: "OPERATION_KEY_COLLISION",
      message:
        "Operation key already used with a different transaction source. Generate a new operation id.",
    });
  }
  const existingGameId = existing.gameId ?? null;
  const inputGameId = input.gameId ?? null;
  if (existingGameId !== inputGameId) {
    throw new ConvexError({
      code: "OPERATION_KEY_COLLISION",
      message:
        "Operation key already used with a different game. Generate a new operation id.",
    });
  }
}

export async function applyLedgerEntry(
  ctx: MutationCtx,
  input: ApplyLedgerEntryInput,
): Promise<ApplyLedgerEntryResult> {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    throw new ConvexError({
      code: "INVALID_AMOUNT",
      message: "Transaction amount must be a non-zero whole number.",
    });
  }

  const existing = await findTransactionByOperationKey(
    ctx,
    input.operationKey,
    input.authUserId,
  );
  if (existing) {
    assertExistingMatchesRequest(existing, input);
    return {
      status: "already_processed",
      transaction: existing,
      balanceBefore: existing.balanceBefore,
      balanceAfter: existing.balanceAfter,
    };
  }

  const wallet = await getOrCreateWallet(ctx, input.authUserId);
  const balanceBefore = wallet.balance;
  const balanceAfter = balanceBefore + input.amount;

  if (!Number.isInteger(balanceAfter)) {
    throw new ConvexError({
      code: "INVALID_AMOUNT",
      message: "Resulting balance must be a whole number.",
    });
  }
  if (balanceAfter < 0) {
    throw new ConvexError({
      code: "INSUFFICIENT_FUNDS",
      message: `Insufficient balance: have ${balanceBefore}, need ${-input.amount}.`,
    });
  }

  const now = Date.now();
  const transactionId = await ctx.db.insert("transactions", {
    authUserId: input.authUserId,
    amount: input.amount,
    source: input.source,
    balanceBefore,
    balanceAfter,
    gameId: input.gameId,
    operationKey: input.operationKey,
    createdAt: now,
  });

  await ctx.db.patch(wallet._id, {
    balance: balanceAfter,
    updatedAt: now,
  });

  const transaction = (await ctx.db.get(transactionId))!;
  return {
    status: "applied",
    transaction,
    balanceBefore,
    balanceAfter,
  };
}

export async function creditWallet(
  ctx: MutationCtx,
  input: Omit<ApplyLedgerEntryInput, "amount"> & { amount: number },
): Promise<ApplyLedgerEntryResult> {
  if (input.amount <= 0) {
    throw new ConvexError({
      code: "INVALID_AMOUNT",
      message: "Credit amount must be positive.",
    });
  }
  return applyLedgerEntry(ctx, input);
}

export async function debitWallet(
  ctx: MutationCtx,
  input: Omit<ApplyLedgerEntryInput, "amount"> & { amount: number },
): Promise<ApplyLedgerEntryResult> {
  if (input.amount <= 0) {
    throw new ConvexError({
      code: "INVALID_AMOUNT",
      message: "Debit amount must be positive.",
    });
  }
  return applyLedgerEntry(ctx, { ...input, amount: -input.amount });
}
