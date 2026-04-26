# Ticket 08: Integrate Action Cache into Betting & Showdown

## Status: ⬜

## Depends on: Tickets 04, 07

## Summary

Wire the action cache into `aiDecideBet` and `aiSubmitWord`. Before calling the LLM, check if a similar game state has an approved cached action. If found, reuse it with 60% probability. After making a decision (LLM or fallback), store the result in the cache for future reuse.

This is future work after tickets 01-05 and 07. The cache key should use bot personality for personality filtering, and room difficulty should remain a separate context signal when needed.

## Files

- `convex/ai.ts` — integrate cache lookup + storage in both `aiDecideBet` and `aiSubmitWord`

## Changes

### `convex/ai.ts`

#### Add constant

```typescript
const CACHE_REUSE_PROBABILITY = 0.6;
```

#### Add imports

```typescript
import { internal } from "./_generated/api";
import {
  buildActionContextText,
  type ActionCacheResult,
} from "./aiActionsCache";
```

Also add `internal.aiActionsCache.*` to the internal API imports for the mutations/actions.

#### Update `aiDecideBet` handler

**Before the LLM call** (after the `if (!isOpenRouterConfigured())` block and after computing `handStrength`, `potOdds`, `rateOfReturn`), add cache lookup:

```typescript
// Check action cache for a previously approved action
let cacheHit: ActionCacheResult | null = null;
let cacheReused = false;

try {
  const contextText = buildActionContextText({
    trigger: "ai_betting",
    gameStage: args.stage,
    handTiles: handDescription,
    communityTiles: communityDescription || "None yet",
    currentBet: args.currentBet,
    chips: args.chips,
    pot: args.pot,
    handStrength,
    rateOfReturn: rr,
    personality,
  });

  cacheHit = await ctx.runAction(internal.aiActionsCache.searchActionCache, {
    contextText,
    personality,
    trigger: "ai_betting",
    gameStage: args.stage,
  });

  if (cacheHit) {
    const roll = Math.random();
    if (roll < CACHE_REUSE_PROBABILITY) {
      cacheReused = true;
      logAIDebug("betting", "cache hit, reusing cached action", {
        cacheAction: cacheHit.action,
        cacheRaiseAmount: cacheHit.raiseAmount,
        cacheScore: cacheHit._score,
        roll,
        probability: CACHE_REUSE_PROBABILITY,
      });

      const action = fixActionForBetState(cacheHit.action as any, args.currentBet);
      const cachedDecision: AIBettingDecision = {
        action,
        raiseAmount: action === "raise" ? cacheHit.raiseAmount : undefined,
        reasoning: `Cached: ${cacheHit.reasoning}`,
        confidence: cacheHit.handStrength,
      };

      await insertAITrace(ctx, {
        ...args,
        category: "ai_betting",
        action,
        raiseAmount: cachedDecision.raiseAmount,
        difficulty,
        handStrength,
        rateOfReturn: rr,
        potOdds,
        isBluffing,
        usedFallback: true,
        actionCacheHit: true,
        metadata: { source: "action_cache", cacheScore: cacheHit._score },
      });

      return cachedDecision;
    } else {
      logAIDebug("betting", "cache hit but rolling for fresh LLM call", {
        cacheAction: cacheHit.action,
        roll,
        probability: CACHE_REUSE_PROBABILITY,
      });
    }
  }
} catch (cacheError) {
  console.warn("[ai:betting] Action cache lookup failed, falling through to LLM", {
    error: String(cacheError),
  });
}
```

**After LLM/fallback decision** (before the final `return decision`), best-effort cache storage:

```typescript
// Best-effort: store the action in the cache for future reuse
try {
  const contextText = buildActionContextText({
    trigger: "ai_betting",
    gameStage: args.stage,
    handTiles: handDescription,
    communityTiles: communityDescription || "None yet",
    currentBet: args.currentBet,
    chips: args.chips,
    pot: args.pot,
    handStrength,
    rateOfReturn: rr,
    personality,
  });
  const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
    text: contextText,
  });
  await ctx.runMutation(internal.aiActionsCache.insertActionCacheEntry, {
    personality,
    trigger: "ai_betting",
    gameStage: args.stage,
    contextText,
    embedding,
    action: decision.action,
    raiseAmount: decision.raiseAmount,
    handStrength,
    rateOfReturn: rr,
    reasoning: decision.reasoning,
  });
} catch (cacheError) {
  console.warn("[ai:betting] Failed to cache betting action", {
    error: String(cacheError),
  });
}
```

#### Update `aiSubmitWord` handler

Same pattern — before LLM, check cache for showdown actions. After, store result.

The `contextText` for showdown entries uses `trigger: "ai_showdown"` and the serialized available tiles.

Cache hit returns the stored `wordSubmitted` and reasoning. If the cached word is valid (still in dictionary and buildable from tiles), use it. Otherwise, fall through to LLM/deterministic.

**Best-effort storage after showdown resolution:**

```typescript
try {
  const contextText = buildActionContextText({
    trigger: "ai_showdown",
    gameStage: "showdown",
    handTiles: handDescription,
    communityTiles: communityDescription,
    personality,
  });
  const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
    text: contextText,
  });
  await ctx.runMutation(internal.aiActionsCache.insertActionCacheEntry, {
    personality,
    trigger: "ai_showdown",
    gameStage: "showdown",
    contextText,
    embedding,
    action: wordResult.word,
    wordSubmitted: wordResult.word,
    handStrength: 0, // not computed for showdown
    reasoning: wordResult.reasoning,
  });
} catch (cacheError) {
  console.warn("[ai:showdown] Failed to cache showdown action", {
    error: String(cacheError),
  });
}
```

#### Update trace to include `actionCacheHit`

In all `insertAITrace` calls from `aiDecideBet`, include:
```typescript
actionCacheHit: cacheReused ? true : false,
```

(Ticket 06 already added this field to the schema.)

## Testing

Integration testing for the action cache requires a running Convex dev server (since it depends on vector search). Unit testing for `buildActionContextText` can be done in isolation.

### Manual testing steps:
1. Start a game with bots
2. Play through a betting round
3. Check Convex dashboard for `aiActionsCache` entries (should be `approved: false`)
4. Manually approve an entry via the Convex dashboard: `ctx.db.patch(id, { approved: true })`
5. Play a similar betting round again
6. Check logs for `[ai:betting] cache hit` messages
7. Verify that the cached action is used ~60% of the time when a match is found

## Acceptance Criteria

- [ ] `aiDecideBet` checks action cache before LLM call
- [ ] Betting cache lookup/storage uses bot `personality`, not `difficulty`, for personality filtering
- [ ] `aiDecideBet` stores result in action cache after LLM/fallback
- [ ] `aiSubmitWord` checks action cache before LLM call
- [ ] `aiSubmitWord` stores result in action cache after LLM/deterministic
- [ ] `CACHE_REUSE_PROBABILITY = 0.6` constant defined
- [ ] Cache hits are logged via `logAIDebug`
- [ ] Cache misses fall through to LLM/deterministic (no errors)
- [ ] Cache storage is best-effort (errors caught and logged, not thrown)
- [ ] Traces include `actionCacheHit` field
- [ ] All new cache entries have `approved: false` by default
- [ ] `buildActionContextText` produces consistent text for similar game states
- [ ] No regressions: `bun test` passes
