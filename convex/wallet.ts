import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { getVerifiedUserId, requireVerifiedUser } from "./verifyUser";
import {
  applyLedgerEntry,
  buildOperationKey,
  getOrCreateWallet,
  getWalletBalance,
  OPERATION_NAMESPACES,
} from "./wallet/ledger";

export const MAX_PLAYTEST_DEPOSIT = 100_000;

export const getMyBalance = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getVerifiedUserId(ctx);
    if (!authUserId) {
      return { balance: null as number | null, hasWallet: false };
    }
    const balance = await getWalletBalance(ctx, authUserId);
    return { balance, hasWallet: balance !== null };
  },
});

export const getMyTransactions = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const authUserId = await getVerifiedUserId(ctx);
    if (!authUserId) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    return await ctx.db
      .query("transactions")
      .withIndex("by_authUserId_createdAt", (q) =>
        q.eq("authUserId", authUserId),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const ensureMyWallet = mutation({
  args: {},
  handler: async (ctx) => {
    const { authUserId } = await requireVerifiedUser(ctx);
    const wallet = await getOrCreateWallet(ctx, authUserId);
    return { balance: wallet.balance };
  },
});

export const depositPlaytestCoins = mutation({
  args: {
    amount: v.number(),
    // Opaque client-supplied operation id. The full operation key is
    // constructed server-side as
    // `playtest_deposit:{authUserId}:{operationId}` so clients cannot collide
    // with other namespaces or users. If omitted, a fresh random id is
    // generated here (the call is then non-retryable).
    operationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { authUserId } = await requireVerifiedUser(ctx);

    if (!Number.isInteger(args.amount) || args.amount <= 0) {
      throw new ConvexError({
        code: "INVALID_AMOUNT",
        message: "Deposit must be a positive whole number.",
      });
    }
    if (args.amount > MAX_PLAYTEST_DEPOSIT) {
      throw new ConvexError({
        code: "INVALID_AMOUNT",
        message: `Deposits up to ${MAX_PLAYTEST_DEPOSIT} coins are allowed.`,
      });
    }

    const trimmedOperationId = args.operationId?.trim();
    if (trimmedOperationId === "") {
      throw new ConvexError({
        code: "INVALID_OPERATION_ID",
        message: "Operation id must be a non-empty string.",
      });
    }
    const operationId = trimmedOperationId ?? crypto.randomUUID();
    const key = buildOperationKey(
      OPERATION_NAMESPACES.playtest_deposit,
      authUserId,
      operationId,
    );

    const result = await applyLedgerEntry(ctx, {
      authUserId,
      amount: args.amount,
      source: "playtest_deposit",
      operationKey: key,
    });

    return { balance: result.balanceAfter, status: result.status };
  },
});
