# Ticket 04: Wire Probabilistic Betting into AI Pipeline

## Status: ⬜

## Depends on: Tickets 01, 02, 03

## Summary

Replace the deterministic `getQuickRecommendation` in the AI betting decision pipeline with `getProbabilisticBettingAction`. Update the LLM prompt to include pot odds, rate of return, and FCR recommendation context. Update the fallback path. Add `personality` arg to `aiDecideBet`.

After this ticket, `convex/ai.ts` should not call `getQuickRecommendation`. The old function remains available only as a deprecated safety net for other callers/tests.

## Files

- `convex/ai.ts` — update `aiDecideBet` and `fallbackBettingDecision`
- `convex/aiPrompts.ts` — update `PROMPT_BETTING_TOOLUSE` with new vars
- `convex/ai.test.ts` — update tests

## Changes

### `convex/ai.ts`

#### 1. Add imports

Add imports for `calculatePotOdds`, `calculateRateOfReturn`, `estimateHandStrengthDetailed`, `getProbabilisticBettingAction` from `./gameRules`.
Add imports for `getPersonalityModifiers`, `getDifficultyModifiers`, `BETTING_PERSONALITY_PROFILES` from `./aiStrategy`.
Add import for `ANTE_AMOUNT` from `./gameState`.

#### 2. Add `personality` arg to `aiDecideBet`

Add `personality: v.optional(v.string())` to the args validator. Resolve it from the caller or default to `AI_PERSONALITIES.BALANCED`.

Fix the current prompt wiring bug where `difficulty` is passed as the prompt `personality`. Use the bot character personality for `personality`, and a description based on that personality.

#### 3. Update `aiDecideBet` handler

In the handler, replace the current `estimateHandStrength` + `getQuickRecommendation` block with:
- Compute `handStrengthBreakdown` via `estimateHandStrengthDetailed(...)`
- Set `handStrength = handStrengthBreakdown.strength`
- Compute `potOdds` via `calculatePotOdds(args.currentBet, args.pot)`
- Compute `rateOfReturn` via `calculateRateOfReturn(handStrength, potOdds)`
- Compute `chipRisk` = `args.currentBet / args.chips` (0 if chips is 0)
- Compute `probabilisticResult` via `getProbabilisticBettingAction(handStrength, args.currentBet, args.chips, args.pot, ANTE, args.stage, personality, difficulty, args.raiseLadder)`

Use `ANTE_AMOUNT` from `convex/gameState.ts` for `ANTE`.

Pass these new values to the prompt builder and trace.

#### 4. Update `fallbackBettingDecision`

Replace `getQuickRecommendation` call with `getProbabilisticBettingAction`. Add `personality` and `difficulty` args to the function signature:

```typescript
function fallbackBettingDecision(
  args: any,
  personality: AIPersonality,
  difficulty: AIDifficulty
): AIBettingDecision
```

This requires the caller in the `aiDecideBet` handler (both the early-return path and the catch path) to pass personality and difficulty.

Fallback decision should use:
- `action: probabilisticResult.action`
- `raiseAmount: probabilisticResult.raiseAmount`
- `reasoning: probabilisticResult.reasoning`
- `confidence: handStrength`

#### 5. Update `PROMPT_BETTING_TOOLUSE` vars

Add new fields to `BettingPromptVars`:
```typescript
potOdds: number;
rateOfReturn: number | string;
recommendedAction: string;
fcrRecommendation: string;
```

Remove `quickRecommendation` from `BettingPromptVars` and the prompt body. Replace it with the probabilistic recommendation. Keep `handStrength`.

In the prompt template, add a section:
```
## Probabilistic Analysis
Pot odds: {potOdds}
Rate of return: {rateOfReturn}
Recommended action: {recommendedAction}
FCR distribution: {fcrRecommendation}
```

Bump prompt version from `"1.0.0"` to `"2.0.0"`.

#### 6. Use ante constant

Import `ANTE_AMOUNT` from `convex/gameState.ts`. Do not add a duplicate magic-number ante constant.

### `convex/aiPrompts.ts`

- Add new vars to `BettingPromptVars` type
- Add new section to the prompt template
- Bump version to `"2.0.0"`
- Remove `quickRecommendation` from the betting prompt type and template

### `convex/ai.test.ts`

- Update any tests that call fallback logic to use `getProbabilisticBettingAction` (if they test the fallback path)
- Add test that `getProbabilisticBettingAction` is called with correct args in the fallback scenario

## Acceptance Criteria

- [ ] `aiDecideBet` accepts `personality` arg
- [ ] `fallbackBettingDecision` uses `getProbabilisticBettingAction` instead of `getQuickRecommendation`
- [ ] LLM prompt includes pot odds, rate of return, and FCR recommendation
- [ ] Prompt version bumped to 2.0.0
- [ ] Betting prompt uses bot personality, not difficulty, for personality text
- [ ] All tests pass: `bun test convex/ai.test.ts`
- [ ] `getQuickRecommendation` is no longer called in the betting pipeline
