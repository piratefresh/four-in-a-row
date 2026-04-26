# Ticket 01: Rate of Return & Hand Strength Breakdown

## Status: ⬜

## Summary

Add pure functions for pot odds, rate of return, and a detailed hand strength breakdown. These are the mathematical foundation for the probabilistic betting system in Ticket 02.

This ticket should not change betting behavior yet. It only adds tested math helpers and makes the existing hand-strength estimator safer to inspect.

## Files

- `convex/gameRules.ts` — add new functions
- `convex/gameRules.test.ts` — **new file**, add tests

## Changes

### `convex/gameRules.ts`

Add the following exported functions:

#### `calculatePotOdds(currentBet: number, potSize: number): number`

Pot odds = `amountToCall / (amountToCall + potSize)`. The existing code often calls this value `currentBet`, but for this helper it means the amount the bot must pay to continue. Returns 0 when `currentBet <= 0`.

Examples:
- `calculatePotOdds(20, 60)` → `20 / 80 = 0.25` (you must contribute 25% of the final pot)
- `calculatePotOdds(0, 100)` → `0` (no bet to call = no pot odds)

#### `calculateRateOfReturn(handStrength: number, potOdds: number): number`

RR = `handStrength / potOdds`. Returns `Infinity` when `potOdds <= 0` (free to call = infinite return).

Examples:
- `calculateRateOfReturn(0.5, 0.25)` → `2.0` (great return)
- `calculateRateOfReturn(0.3, 0.25)` → `1.2` (decent return)
- `calculateRateOfReturn(0.2, 0.25)` → `0.8` (poor return, should fold)
- `calculateRateOfReturn(0.5, 0)` → `Infinity` (free to call)

#### `estimateHandStrengthDetailed(...)`

Same inputs and core logic as `estimateHandStrength`, but returns an object:

```typescript
export type HandStrengthBreakdown = {
  strength: number;
  vowelScore: number;
  commonScore: number;
  highValueScore: number;
  avgValue: number;
};

export function estimateHandStrengthDetailed(
  tiles: Array<{ letter: string; baseValue: number }>,
  revealedCommunityTiles: Array<{ letter: string; baseValue: number }> = []
): HandStrengthBreakdown
```

The `strength` field MUST match what `estimateHandStrength` returns for the same inputs (exact same formula, just also returns the breakdown).

If there are no tiles, return a safe all-zero breakdown instead of `NaN`:

```typescript
{
  strength: 0,
  vowelScore: 0,
  commonScore: 0,
  highValueScore: 0,
  avgValue: 0,
}
```

Update `estimateHandStrength` to delegate to `estimateHandStrengthDetailed(...).strength` so there is only one formula to maintain.

### `convex/gameRules.test.ts` — new file

Test all three new functions:

**`calculatePotOdds`**
- Returns 0 when currentBet is 0
- Returns 0 when currentBet is negative
- Returns 0.25 for currentBet=20, potSize=60
- Returns 0.5 for currentBet=40, potSize=40
- Returns ~0.167 for currentBet=20, potSize=100

**`calculateRateOfReturn`**
- Returns Infinity when potOdds is 0
- Returns Infinity when potOdds is negative
- Returns 2.0 for handStrength=0.5, potOdds=0.25
- Returns 0.8 for handStrength=0.2, potOdds=0.25
- Returns 0 for handStrength=0, potOdds=0.25

**`estimateHandStrengthDetailed`**
- Returns breakdown where `strength` matches `estimateHandStrength` for identical inputs
- Empty tiles return `strength = 0` and no `NaN` values
- Vowel-heavy hand has vowelScore near 1.0
- Consonant-heavy hand has lower vowelScore
- Breakdown values are all between 0 and 1 (or 0 and some reasonable max for avgValue)

## No existing code changes

This ticket ONLY adds new functions. `estimateHandStrength` and `getQuickRecommendation` remain untouched.

## Acceptance Criteria

- [ ] `calculatePotOdds` exported and tested
- [ ] `calculateRateOfReturn` exported and tested
- [ ] `estimateHandStrengthDetailed` exported and tested
- [ ] `estimateHandStrength` delegates to `estimateHandStrengthDetailed(...).strength`
- [ ] Empty tile input returns `0` strength, not `NaN`
- [ ] All tests pass: `bun test convex/gameRules.test.ts`
