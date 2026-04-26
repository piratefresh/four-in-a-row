# Ticket 02: Probabilistic FCR Betting Decision

## Status: ⬜

## Depends on: Ticket 01

## Summary

Add a probabilistic Fold/Call/Raise system based on the cowboyprogramming article's Rate of Return approach. Instead of always making the same decision for the same inputs, this function rolls a weighted random number to pick an action from probability distributions.

Do not remove `getQuickRecommendation` in this ticket. The new function becomes the preferred path in Ticket 04, while `getQuickRecommendation` stays as a deprecated safety net.

## Files

- `convex/gameRules.ts` — add new function + types
- `convex/gameRules.test.ts` — add tests

## Changes

### `convex/gameRules.ts`

Add the following:

#### New types

```typescript
export type ProbabilisticBetResult = {
  action: "fold" | "call" | "check" | "raise";
  raiseAmount?: number;
  reasoning: string;
  debug: {
    handStrength: number;
    potOdds: number;
    rateOfReturn: number;
    chipRisk: number;
    stackProtection: boolean;
    fcrBucket: string;
    basePct: { fold: number; call: number; raise: number };
    personalityMod: { fold: number; call: number; raise: number };
    difficultyMod: { fold: number; call: number; raise: number };
    finalPct: { fold: number; call: number; raise: number };
    roll: number;
  };
};
```

#### New function: `getProbabilisticBettingAction`

```typescript
export function getProbabilisticBettingAction(
  handStrength: number,
  currentBet: number,
  chips: number,
  potSize: number,
  ante: number,
  stage: GameStage,
  personality: AIPersonality,
  difficulty: AIDifficulty,
  raiseLadder: number[],
  randomFn?: () => number
): ProbabilisticBetResult
```

`currentBet` means the amount the bot must pay to continue in the hand. If the caller has a table-level current bet and a player-level `betThisRound`, pass `amountToCall = currentBet - betThisRound` instead. If the current pipeline only has table current bet available, pass that for now and keep the old no-free-fold protections in the caller.

**Algorithm:**

1. Compute `potOdds = calculatePotOdds(currentBet, potSize)`
2. Compute `rateOfReturn = calculateRateOfReturn(handStrength, potOdds)`
3. Compute `chipRisk = currentBet / chips` (0 if chips is 0)
4. Select FCR bucket based on RR:

| RR Range | Fold% | Call% | Raise% |
|----------|-------|-------|--------|
| RR < 0.8 | 95 | 0 | 5 (bluff) |
| RR < 1.0 | 80 | 5 | 15 (bluff) |
| RR < 1.3 | 0 | 60 | 40 |
| RR >= 1.3 | 0 | 30 | 70 |

5. Apply personality modifiers (percentage points shifted):
   - Cautious: fold +15, raise -10, call -5
   - Balanced: no change (0, 0, 0)
   - Aggressive: fold -10, raise +10, call 0
   - Creative: in RR<1.0 buckets, raise +10 (shifted from call); in RR>=1.0 buckets, raise +5

6. Apply difficulty modifiers (percentage points shifted):
   - Easy: fold +15, raise -10
   - Medium: no change
   - Hard: fold -5, raise +5

7. Clamp all percentages to [0, 100] and normalize so they sum to 100.

8. Roll `randomFn()` (default `Math.random`) to select fold/call/raise. Treat the roll as `[0, 1)`. Clamp defensive out-of-range injected test values to `[0, 0.999999]`.

9. **Special rules:**
   - **Never fold for free**: if `currentBet <= 0` and selected action is "fold", convert to "check"
   - **Stack protection** (from article): `if (chips - currentBet < ante * 4) && handStrength < 0.5` → override action to "fold" (unless currentBet is 0, then "check")
   - If action is "call" and `currentBet <= 0`, action becomes "check"
   - If action is "raise", compute `raiseAmount` as the next step on `raiseLadder` that exceeds `currentBet`
   - If action is "raise" but there is no legal next raise step, convert to "call" when `currentBet > 0`, otherwise "check"
   - If `chips <= 0`, do not call or raise; return "check" when `currentBet <= 0`, otherwise "fold"

10. Build a `reasoning` string like: `"RR=0.72 < 0.8 | aggressive +10% raise | roll 0.03 → bluff raise"`

11. Return `ProbabilisticBetResult`.

#### Deprecate `getQuickRecommendation`

Add JSDoc `@deprecated` comment pointing to `getProbabilisticBettingAction`. Do NOT remove the function — it stays as a last-resort safety net.

### `convex/gameRules.test.ts`

Test the new function:

**FCR bucket selection (fixed random seed to test determinism):**
- RR < 0.8, roll = 0.02 → fold (95%)
- RR < 0.8, roll = 0.97 → raise (5% bluff)
- RR < 1.0, roll = 0.02 → fold (80%)
- RR < 1.0, roll = 0.86 → raise (15% bluff)
- RR < 1.3, roll = 0.05 → call (60%)
- RR < 1.3, roll = 0.75 → raise (40%)
- RR >= 1.3, roll = 0.10 → call (30%)
- RR >= 1.3, roll = 0.50 → raise (70%)

**Personality modifiers shift percentages correctly:**
- Cautious personality shifts fold up, raise down
- Aggressive personality shifts fold down, raise up
- Creative personality shifts raise up in low-RR buckets

**Difficulty modifiers:**
- Easy shifts fold up, raise down
- Hard shifts fold down, raise up

**Never fold for free:**
- currentBet = 0, RR < 0.8 (would normally fold) → check

**Stack protection:**
- chips=50, currentBet=40, ante=20, handStrength=0.3 → fold despite RR (calling would leave < 4× ante)
- chips=1000, currentBet=40, ante=20, handStrength=0.8 → no stack protection override

**Raise amount calculation:**
- currentBet=20, raiseLadder=[20,40,60,...], action=raise → raiseAmount=40
- currentBet=200, raiseLadder=[20,40,60,80,100,120,140,160,200], action=raise → call
- currentBet=0, no raise step available → check

**Chip edge cases:**
- chips=0, currentBet=0 → check
- chips=0, currentBet=20 → fold

## Acceptance Criteria

- [ ] `getProbabilisticBettingAction` exported and tested
- [ ] All 4 RR buckets produce correct distributions with fixed seeds
- [ ] Personality modifiers shift percentages correctly
- [ ] Difficulty modifiers shift percentages correctly
- [ ] Never folds for free (converts to check)
- [ ] Stack protection overrides correctly
- [ ] No legal raise step converts raise to call/check
- [ ] Chips <= 0 does not produce call/raise
- [ ] `getQuickRecommendation` marked as `@deprecated`
- [ ] All tests pass: `bun test convex/gameRules.test.ts`
