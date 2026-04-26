/**
 * RAG cache mutations and queries for AI dialogue responses.
 *
 * Stores LLM-generated responses alongside their embeddings so that
 * future similar contexts can retrieve cached responses instead of
 * calling the LLM again.
 */

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { RAG_SIMILARITY_THRESHOLD, RAG_TOP_K } from "./schema";

export const insertDialogueCacheEntry = internalMutation({
  args: {
    personality: v.string(),
    trigger: v.string(),
    contextText: v.string(),
    embedding: v.array(v.float64()),
    responseText: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiDialogueCache", {
      personality: args.personality,
      trigger: args.trigger,
      contextText: args.contextText,
      embedding: args.embedding,
      responseText: args.responseText,
      createdAt: Date.now(),
    });
  },
});

export const fetchCacheEntries = internalQuery({
  args: {
    ids: v.array(v.id("aiDialogueCache")),
  },
  handler: async (ctx, args) => {
    const results: Array<{ _id: string; trigger: string; responseText: string }> = [];
    for (const id of args.ids) {
      const doc = await ctx.db.get(id);
      if (doc) {
        results.push({ _id: doc._id, trigger: doc.trigger, responseText: doc.responseText });
      }
    }
    return results;
  },
});

type VectorSearchResult = {
  _id: string;
  _score: number;
};

export const searchDialogueCache = internalAction({
  args: {
    embedding: v.array(v.float64()),
    personality: v.string(),
    trigger: v.string(),
    limit: v.optional(v.number()),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const limit = args.limit ?? RAG_TOP_K;
    const threshold = args.threshold ?? RAG_SIMILARITY_THRESHOLD;

    const results = await ctx.vectorSearch(
      "aiDialogueCache",
      "by_embedding",
      {
        vector: args.embedding,
        limit: limit * 3,
        filter: (q) => q.eq("personality", args.personality),
      },
    ) as VectorSearchResult[];

    if (results.length === 0) return null;

    const docs = await ctx.runQuery(internal.aiCache.fetchCacheEntries, {
      ids: results.map((r) => r._id as any),
    });

    const docMap = new Map(docs.map((d) => [d._id, d]));

    const matchingTrigger = results
      .filter((r) => r._score >= threshold)
      .filter((r) => {
        const doc = docMap.get(r._id);
        return doc && doc.trigger === args.trigger;
      });

    if (matchingTrigger.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * matchingTrigger.length);
    const doc = docMap.get(matchingTrigger[randomIndex]._id);

    return doc ? doc.responseText : null;
  },
});
