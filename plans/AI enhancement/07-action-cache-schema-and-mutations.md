# Ticket 07: Action Cache Schema & Core Mutations

## Status: ⬜

## Depends on: None (independent)

## Summary

Create the `aiActionsCache` Convex table and the core mutations/queries/actions for storing and searching AI betting/showdown decisions. Modeled after the existing `aiDialogueCache` but with an `approved` boolean for admin curation.

This is future work after tickets 01-05. Implement it only after probabilistic betting and room difficulty are live, otherwise the cache can preserve old deterministic decisions.

## Files

- `convex/schema.ts` — add `aiActionsCache` table
- `convex/aiActionsCache.ts` — **new file**, mutations/queries/actions

## Changes

### `convex/schema.ts`

Add the `aiActionsCache` table after `aiDialogueCache`:

```typescript
aiActionsCache: defineTable({
  personality: v.string(),
  trigger: v.string(),              // "ai_betting" | "ai_showdown"
  gameStage: v.string(),            // "preflop" | "flop" | "turn" | "river" | "showdown"
  contextText: v.string(),          // serialized game-state summary for embedding
  embedding: v.array(v.float64()),  // 1024-dim from qwen/qwen3-embedding-8b
  action: v.string(),               // "fold" | "check" | "call" | "raise" | word
  raiseAmount: v.optional(v.number()),
  wordSubmitted: v.optional(v.string()),
  handStrength: v.number(),
  rateOfReturn: v.optional(v.number()),
  reasoning: v.string(),
  approved: v.boolean(),             // false by default; admin must approve for reuse
  createdAt: v.number(),
})
  .index("by_personality_trigger", ["personality", "trigger"])
  .index("by_approved", ["approved"])
  .index("by_approved_createdAt", ["approved", "createdAt"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1024,
    filterFields: ["personality", "trigger", "approved"],
  }),
```

Key differences from `aiDialogueCache`:
- `approved` field — defaults to `false`; only `true` entries are served in search
- Structured action fields: `action`, `raiseAmount`, `wordSubmitted`, `handStrength`, `rateOfReturn`, `reasoning`
- Additional indexes for admin curation queries

### `convex/aiActionsCache.ts` — new file

Mirror the structure of `convex/aiCache.ts`:

#### `insertActionCacheEntry` — internal mutation

Stores a new action entry with `approved: false`.

```typescript
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
      ...args,
      approved: false,
      createdAt: Date.now(),
    });
  },
});
```

#### `fetchCacheEntries` — internal query

Fetches entries by array of IDs (mirrors dialogue cache pattern):
```typescript
export const fetchCacheEntries = internalQuery({
  args: { ids: v.array(v.id("aiActionsCache")) },
  handler: async (ctx, args) => {
    const results = [];
    for (const id of args.ids) {
      const doc = await ctx.db.get(id);
      if (doc) results.push(doc);
    }
    return results;
  },
});
```

#### `searchActionCache` — internal action

Generates an embedding for the context text, does vector search on `aiActionsCache`, filters by `approved: true` + personality + trigger + gameStage, returns the best match or null.

```typescript
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
    const limit = args.limit ?? 5;
    const threshold = args.threshold ?? RAG_SIMILARITY_THRESHOLD;

    // Generate embedding
    const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
      text: args.contextText,
    });

    // Vector search (filter by approved: true + personality + trigger)
    const results = await ctx.vectorSearch(
      "aiActionsCache",
      "by_embedding",
      {
        vector: embedding,
        limit: limit * 3,
        filter: (q) =>
          q.eq("personality", args.personality)
           .eq("trigger", args.trigger)
           .eq("approved", true),
      },
    ) as VectorSearchResult[];

    if (results.length === 0) return null;

    // Fetch full docs + filter by similarity threshold + gameStage
    const docs = await ctx.runQuery(internal.aiActionsCache.fetchCacheEntries, {
      ids: results.map((r) => r._id as any),
    });
    const docMap = new Map(docs.map((d) => [d._id, d]));

    const matching = results
      .filter((r) => r._score >= threshold)
      .filter((r) => {
        const doc = docMap.get(r._id);
        return doc && doc.gameStage === args.gameStage;
      });

    if (matching.length === 0) return null;

    // Return best match
    const best = matching[0];
    const doc = docMap.get(best._id);
    if (!doc) return null;

    return {
      _id: doc._id,
      personality: doc.personality,
      trigger: doc.trigger,
      gameStage: doc.gameStage,
      action: doc.action,
      raiseAmount: doc.raiseAmount,
      wordSubmitted: doc.wordSubmitted,
      handStrength: doc.handStrength,
      rateOfReturn: doc.rateOfReturn,
      reasoning: doc.reasoning,
      approved: doc.approved,
      _score: best._score,
    };
  },
});
```

#### Admin curation mutations — public

These public mutations/queries must require admin authorization before returning or mutating cache entries. Do not expose approve/reject/delete/list functionality to regular players.

Use the app's existing admin/auth pattern if one exists. If there is no existing admin helper, add one before exposing these functions.

```typescript
export const approveActionCacheEntry = mutation({
  args: { id: v.id("aiActionsCache") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { approved: true });
  },
});

export const rejectActionCacheEntry = mutation({
  args: { id: v.id("aiActionsCache") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { approved: false });
  },
});

export const deleteActionCacheEntry = mutation({
  args: { id: v.id("aiActionsCache") },
  handler: async (ctx, args) => {
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
```

#### `buildActionContextText` — exported helper

Serializes game state into embedding-friendly text:

```typescript
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

  // showdown
  return [
    `Stage: showdown.`,
    `Tiles: ${args.handTiles} ${args.communityTiles}.`,
    `Personality: ${args.personality ?? "?"}.`,
  ].join(" ");
}
```

#### Return types

```typescript
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
```

## Acceptance Criteria

- [ ] `aiActionsCache` table added to schema with vector index
- [ ] `insertActionCacheEntry` internal mutation works
- [ ] `searchActionCache` internal action does vector search with `approved: true` filter
- [ ] `approveActionCacheEntry`, `rejectActionCacheEntry`, `deleteActionCacheEntry` public mutations work
- [ ] `listActionCacheEntries` public query works with filters
- [ ] Public curation functions enforce admin authorization
- [ ] `buildActionContextText` produces consistent text for similar game states
- [ ] Schema migration runs successfully: `bunx convex dev`
- [ ] No regressions in existing tests
