/**
 * RAG cache mutations, queries, and actions for AI betting/showdown decisions.
 *
 * Stores probabilistic betting/showdown actions alongside embeddings so that
 * future similar game states can reuse approved decisions instead of calling
 * the LLM or running the probabilistic engine again.
 *
 * Entries default to `approved: false`. Admin must approve before they appear
 * in search results.
 */

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { RAG_SIMILARITY_THRESHOLD, RAG_TOP_K } from "./schema";

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export type ActionCacheResult = {
  _id: string;
  personality: string;
  trigger: string;
  gameStage: string;
  action: string;
  raiseAmount?: number;
  wordSubmitted?: string;
  handStrength: number;
  rateOfReturn?: number;
  reasoning: string;
  approved: boolean;
  _score: number;
};

// ---------------------------------------------------------------------------
// Internal mutation: insert cache entry
// ---------------------------------------------------------------------------

export const insertActionCacheEntry = internalMutation({
  args: {
    personality: v.string(),
    trigger: v.string(),
    gameStage: v.string(),
    contextText: v.string(),
    embedding: v.array(v.float64()),
    action: v.string(),
    raiseAmount: v.optional(v.number()),
    wordSubmitted: v.optional(v.string()),
    handStrength: v.number(),
    rateOfReturn: v.optional(v.number()),
    reasoning: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiActionsCache", {
      personality: args.personality,
      trigger: args.trigger,
      gameStage: args.gameStage,
      contextText: args.contextText,
      embedding: args.embedding,
      action: args.action,
      raiseAmount: args.raiseAmount,
      wordSubmitted: args.wordSubmitted,
      handStrength: args.handStrength,
      rateOfReturn: args.rateOfReturn,
      reasoning: args.reasoning,
      approved: false,
      createdAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Internal query: fetch entries by IDs
// ---------------------------------------------------------------------------

export const fetchCacheEntries = internalQuery({
  args: {
    ids: v.array(v.id("aiActionsCache")),
  },
  handler: async (ctx, args) => {
    const results: Array<Doc<"aiActionsCache">> = [];
    for (const id of args.ids) {
      const doc = await ctx.db.get(id);
      if (doc) {
        results.push(doc);
      }
    }
    return results;
  },
});

// ---------------------------------------------------------------------------
// Internal action: vector search for approved cache entries
// ---------------------------------------------------------------------------

type VectorSearchResult = {
  _id: string;
  _score: number;
};

export const searchActionCache = internalAction({
  args: {
    contextText: v.string(),
    personality: v.string(),
    trigger: v.string(),
    gameStage: v.string(),
    limit: v.optional(v.number()),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ActionCacheResult | null> => {
    const limit = args.limit ?? RAG_TOP_K;
    const threshold = args.threshold ?? RAG_SIMILARITY_THRESHOLD;

    const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
      text: args.contextText,
    });

    const results = await ctx.vectorSearch(
      "aiActionsCache",
      "by_embedding",
      {
        vector: embedding,
        limit: limit * 3,
        filter: (q) => q.eq("approved", true),
      },
    ) as VectorSearchResult[];

    if (results.length === 0) return null;

    const docs = await ctx.runQuery(internal.aiActionsCache.fetchCacheEntries, {
      ids: results.map((r) => r._id as any),
    });
    const docMap = new Map(docs.map((d) => [d._id as string, d]));

    const matching = results
      .filter((r) => r._score >= threshold)
      .filter((r) => {
        const doc = docMap.get(r._id);
        if (!doc) return false;
        if (doc.personality !== args.personality) return false;
        if (doc.trigger !== args.trigger) return false;
        if (doc.gameStage !== args.gameStage) return false;
        return true;
      });

    if (matching.length === 0) return null;

    const best = matching[0];
    const doc = docMap.get(best._id as string);
    if (!doc) return null;

    return {
      _id: doc._id,
      personality: doc.personality,
      trigger: doc.trigger,
      gameStage: doc.gameStage,
      action: doc.action,
      raiseAmount: doc.raiseAmount ?? undefined,
      wordSubmitted: doc.wordSubmitted ?? undefined,
      handStrength: doc.handStrength,
      rateOfReturn: doc.rateOfReturn ?? undefined,
      reasoning: doc.reasoning,
      approved: doc.approved,
      _score: best._score,
    };
  },
});

// ---------------------------------------------------------------------------
// Public mutations: admin curation (require authenticated user)
// ---------------------------------------------------------------------------

async function requireAuthenticatedUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated: must be signed in to manage action cache.");
  }
  return identity;
}

export const approveActionCacheEntry = mutation({
  args: { id: v.id("aiActionsCache") },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await ctx.db.patch(args.id, { approved: true });
  },
});

export const rejectActionCacheEntry = mutation({
  args: { id: v.id("aiActionsCache") },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await ctx.db.patch(args.id, { approved: false });
  },
});

export const deleteActionCacheEntry = mutation({
  args: { id: v.id("aiActionsCache") },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await ctx.db.delete(args.id);
  },
});

export const listActionCacheEntries = query({
  args: {
    personality: v.optional(v.string()),
    trigger: v.optional(v.string()),
    approved: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const limit = Math.min(args.limit ?? 100, 500);

    if (args.approved !== undefined) {
      return await ctx.db
        .query("aiActionsCache")
        .withIndex("by_approved_createdAt", (q) =>
          q.eq("approved", args.approved!)
        )
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("aiActionsCache")
      .order("desc")
      .take(limit);
  },
});

// ---------------------------------------------------------------------------
// Helper: build embedding-friendly context text
// ---------------------------------------------------------------------------

export function buildActionContextText(args: {
  trigger: "ai_betting" | "ai_showdown";
  gameStage: string;
  handTiles: string;
  communityTiles: string;
  currentBet?: number;
  chips?: number;
  pot?: number;
  handStrength?: number;
  rateOfReturn?: number | string;
  personality?: string;
}): string {
  if (args.trigger === "ai_betting") {
    return [
      `Stage: ${args.gameStage}.`,
      `Hand: ${args.handTiles}.`,
      `Community: ${args.communityTiles}.`,
      `Bet: ${args.currentBet ?? 0}.`,
      `Chips: ${args.chips ?? 0}.`,
      `Pot: ${args.pot ?? 0}.`,
      `HS: ${args.handStrength?.toFixed(2) ?? "?"}.`,
      `RR: ${args.rateOfReturn ?? "?"}.`,
      `Personality: ${args.personality ?? "?"}.`,
    ].join(" ");
  }

  return [
    `Stage: showdown.`,
    `Tiles: ${args.handTiles} ${args.communityTiles}.`,
    `Personality: ${args.personality ?? "?"}.`,
  ].join(" ");
}