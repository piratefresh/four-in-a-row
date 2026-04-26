# Ticket 06: Enhanced Debug Logging & Trace Fields

## Status: ⬜

## Depends on: Ticket 04

## Summary

Add detailed decision-reasoning console logs and store new trace fields (rate of return, pot odds, chip risk, FCR bucket, probabilistic action) so the admin traces dashboard shows why the AI chose fold/call/raise.

This is future work after tickets 01-05. Do not use this ticket to change betting behavior; it only exposes the values already computed by the probabilistic pipeline.

## Files

- `convex/gameRules.ts` — add `console.log` in `getProbabilisticBettingAction`
- `convex/aiTracing.ts` — add new optional fields to trace schema
- `convex/ai.ts` — add new fields to `insertAITrace` calls in `aiDecideBet`
- `src/components/admin/TraceDetail.tsx` — display new fields

## Changes

### `convex/gameRules.ts`

In `getProbabilisticBettingAction`, add a structured console.log.

Important: Ticket 02's function receives `handStrength`, not the full hand-strength breakdown. Either pass `handStrengthBreakdown` into `getProbabilisticBettingAction` before implementing this log, or omit the `breakdown` block from the function-level log and include breakdown only in `aiDecideBet` logs/traces.

Preferred minimal version inside `getProbabilisticBettingAction`:

```typescript
console.log(`[ai:decision]`, {
  handStrength: handStrength.toFixed(3),
  potOdds: potOdds.toFixed(3),
  rateOfReturn: rateOfReturn === Infinity ? "∞" : rateOfReturn.toFixed(3),
  chipRisk: chipRisk.toFixed(3),
  stackProtection,
  fcrBucket,
  basePct,
  personalityMod,
  difficultyMod,
  finalPct,
  roll: roll.toFixed(3),
  action,
  reason: reasoning,
});
```

### `convex/aiTracing.ts`

Add optional fields to the trace validator:

```typescript
rateOfReturn: v.optional(v.number()),
potOdds: v.optional(v.number()),
chipRisk: v.optional(v.number()),
probabilisticAction: v.optional(v.string()),
fcrBucket: v.optional(v.string()),
actionCacheHit: v.optional(v.boolean()),
```

Also add these to the `traceInputValidator` object.

### `convex/ai.ts`

In `aiDecideBet`, after computing the probabilistic result, include these fields in the `insertAITrace` call:

```typescript
rateOfReturn: probabilisticResult.debug.rateOfReturn,
potOdds: probabilisticResult.debug.potOdds,
chipRisk: probabilisticResult.debug.chipRisk,
probabilisticAction: probabilisticResult.action,
fcrBucket: probabilisticResult.debug.fcrBucket,
```

Also include `actionCacheHit` (will be `false` until Ticket 08, but add the field now as `false` or `undefined`).

### `src/components/admin/TraceDetail.tsx`

In the "Signals" section (`<DetailSection title="Signals">`), add display rows:

```tsx
<DetailItem label="Rate of return" value={trace.rateOfReturn === undefined ? "-" : trace.rateOfReturn === Infinity ? "∞" : trace.rateOfReturn.toFixed(3)} />
<DetailItem label="Pot odds" value={trace.potOdds === undefined ? "-" : trace.potOdds.toFixed(3)} />
<DetailItem label="Chip risk" value={trace.chipRisk === undefined ? "-" : trace.chipRisk.toFixed(3)} />
<DetailItem label="FCR bucket" value={trace.fcrBucket ?? "-"} />
<DetailItem label="Probabilistic action" value={trace.probabilisticAction ?? "-"} />
<DetailItem label="Cache hit" value={trace.actionCacheHit === undefined ? "-" : trace.actionCacheHit ? "Yes" : "No"} />
```

## Acceptance Criteria

- [ ] `getProbabilisticBettingAction` logs `[ai:decision]` with available probabilistic decision fields
- [ ] Breakdown logging is added only where a breakdown object is actually available
- [ ] Trace schema includes `rateOfReturn`, `potOdds`, `chipRisk`, `probabilisticAction`, `fcrBucket`, `actionCacheHit`
- [ ] `aiDecideBet` traces include these new fields
- [ ] `TraceDetail.tsx` displays the new fields
- [ ] All existing tests pass
- [ ] `bunx convex dev` runs without schema errors
