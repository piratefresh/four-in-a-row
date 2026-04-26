# Ticket 03: Personality & Difficulty Modifiers

## Status: ⬜

## Depends on: Ticket 02

## Summary

Rename `FUTURE_BETTING_PERSONALITY_PROFILES` to `BETTING_PERSONALITY_PROFILES` and export `getPersonalityModifiers` and `getDifficultyModifiers` functions that return the percentage-point adjustments used by `getProbabilisticBettingAction`.

This ticket provides reusable modifier helpers only. Creative's extra low-RR bluff behavior remains inside `getProbabilisticBettingAction` because it depends on the selected RR bucket.

## Files

- `convex/aiStrategy.ts` — rename export, add new functions
- `convex/aiStrategy.test.ts` — add tests for new functions

## Changes

### `convex/aiStrategy.ts`

#### 1. Rename `FUTURE_BETTING_PERSONALITY_PROFILES` → `BETTING_PERSONALITY_PROFILES`

Remove the `FUTURE_` prefix. Update all references in the codebase, including `shouldBelievePlayer`.

#### 2. Export `getPersonalityModifiers`

```typescript
export type BettingModifiers = {
  fold: number;
  call: number;
  raise: number;
};

export function getPersonalityModifiers(personality: AIPersonality): BettingModifiers {
  switch (personality) {
    case AI_PERSONALITIES.CAUTIOUS:
      return { fold: 15, call: -5, raise: -10 };
    case AI_PERSONALITIES.BALANCED:
      return { fold: 0, call: 0, raise: 0 };
    case AI_PERSONALITIES.AGGRESSIVE:
      return { fold: -10, call: 0, raise: 10 };
    case AI_PERSONALITIES.CREATIVE:
      return { fold: 0, call: -5, raise: 5 };
    default:
      return { fold: 0, call: 0, raise: 0 };
  }
}
```

Note: Creative's modifier here is the baseline (non-bluff bucket). The bluff-bucket adjustment (+10 raise in RR<1.0) is handled inside `getProbabilisticBettingAction` in Ticket 02, not here.

#### 3. Export `getDifficultyModifiers`

```typescript
export function getDifficultyModifiers(difficulty: AIDifficulty): BettingModifiers {
  switch (difficulty) {
    case AI_DIFFICULTY.EASY:
      return { fold: 15, call: 0, raise: -10 }; // plays weaker
    case AI_DIFFICULTY.MEDIUM:
      return { fold: 0, call: 0, raise: 0 };
    case AI_DIFFICULTY.HARD:
      return { fold: -5, call: 0, raise: 5 }; // plays stronger
    default:
      return { fold: 0, call: 0, raise: 0 };
  }
}
```

#### 4. Update references

Find all references to `FUTURE_BETTING_PERSONALITY_PROFILES` across the codebase and update to `BETTING_PERSONALITY_PROFILES`. The existing code in `aiStrategy.ts` that references it should use the new name.

### `convex/aiStrategy.test.ts`

Add tests:

- `getPersonalityModifiers` returns expected modifiers for each personality
- `getDifficultyModifiers` returns expected modifiers for each difficulty
- `BETTING_PERSONALITY_PROFILES` (renamed) is still accessible and has all 4 personalities
- `shouldBelievePlayer` uses `BETTING_PERSONALITY_PROFILES`
- No references to `FUTURE_BETTING_PERSONALITY_PROFILES` remain
- Existing tests still pass with renamed export

## Acceptance Criteria

- [ ] `FUTURE_BETTING_PERSONALITY_PROFILES` renamed to `BETTING_PERSONALITY_PROFILES`
- [ ] All references updated across codebase
- [ ] `shouldBelievePlayer` uses the renamed `BETTING_PERSONALITY_PROFILES`
- [ ] `getPersonalityModifiers` exported and tested
- [ ] `getDifficultyModifiers` exported and tested
- [ ] `BettingModifiers` type exported
- [ ] All existing tests still pass
- [ ] No `FUTURE_BETTING_PERSONALITY_PROFILES` references remain
- [ ] `bun test convex/aiStrategy.test.ts` passes
