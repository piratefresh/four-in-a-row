# AI Feature Test Plan

## Testing Approach

The codebase follows a clear pattern: **extract pure functions, test them directly with vitest**. No Convex runtime mocking. This maps perfectly to our AI work since the core logic (prompt building, decision parsing, dialogue generation, showdown word selection) is all pure functions.

### What We DO Test

- Prompt building (all vars resolved, correct sections included)
- Tool schema validation (correct parameter definitions)
- Action parsing from tool call responses
- Personality configuration (chattiness values, system prompts)
- Dialogue trigger logic (chattiness probability filter)
- Showdown word validation (CSW24 lookup, choice tile resolution)
- Fallback behavior (when LLM fails or returns invalid data)
- Game rule helper functions (`estimateHandStrength`, `getQuickRecommendation`)

### What We DON'T Test

- Actual LLM API calls (fragile, expensive, non-deterministic)
- Convex mutations/queries (database-dependent)
- Reactive subscriptions / component rendering (separate concern)

## New Test Files

### 1. `convex/aiTools.test.ts` — Tool schemas and action parsing

Tests for `aiTools.ts`:

- **Tool schema validation**: Verify `check`, `call`, `raise`, `fold` tool definitions have correct parameter schemas
- **Action parsing from tool calls**: Given a tool call response, verify it maps to the correct `AIBettingDecision`
- **Invalid/missing action fallback**: When LLM returns no valid tool call, falls back to deterministic recommendation
- **Raise amount validation**: Verify raise amounts are clamped to the raise ladder
- **Edge cases**: LLM calls `raise` with no amount, calls `check` when bet is outstanding (should become `call`), etc.

### 2. `convex/aiDialogue.test.ts` — Dialogue generation logic

Tests for `aiDialogue.ts`:

- **Chattiness probability filter**: Given a personality + trigger, should the AI speak? Test with controlled randomness
- **Dialogue prompt building**: Verify system prompts include personality traits, game context, and trigger event
- **Trigger filtering**: `gameStart`, `playerRaise`, `botWins` etc. map to correct chattiness thresholds per personality
- **Personality consistency**: Given personality definitions, verify system prompts contain the right style keywords
- **Message length**: Dialogue responses should be under the configured token limit
- **No dialogue on filtered triggers**: When `Math.random() > chattiness`, no dialogue is generated

### 3. `convex/aiPersonalities.test.ts` — Personality configuration

Tests for `aiPersonalities.ts`:

- **All 4 bot characters have profiles**: Nora, Ellis, Jax, Mira each have a system prompt, chattiness, and style
- **Chattiness values are valid**: Each personality has a per-trigger chattiness map with values in [0, 1]
- **Personality style keywords**: Aggressive personality prompt contains aggressive/competitive language, cautious contains careful/measured language, etc.
- **Bot character ↔ personality mapping**: Verify `getBotCharacterForSeatIndex` returns the correct personality

### 4. `convex/aiPrompts.test.ts` — Prompt registry

Tests for `aiPrompts.ts`:

- **All prompts have valid ids and versions**: Every registered prompt has `{id, version, description, build}`
- **Betting prompt produces valid output**: Given typical game state vars, the built prompt contains all required sections (game rules, current situation, available actions)
- **Showdown prompt produces valid output**: Given tile vars, prompt describes available tiles and scoring rules
- **Dialogue prompt produces valid output**: Given personality + trigger, prompt contains personality context and game state
- **Prompt version format**: All versions follow semver (`x.y.z`)
- **No undefined template variables**: Calling `.build()` with all required vars produces a string with no `undefined`/`null` interpolations

### 5. `convex/ai.test.ts` — AI decision parsing and fallback logic

Tests for `ai.ts` (betting response parsing, showdown word validation):

- **Tool call response → AIBettingDecision**: Parse a well-formed tool call into the expected decision object
- **Malformed response → fallback**: When LLM output is gibberish, missing, or times out, falls back to `fallbackBettingDecision`
- **Showdown word attempt validation**: Given an LLM-provided word, validate it against CSW24. Invalid words → fallback to deterministic solver
- **Showdown word attempt with choice tiles**: LLM submits a word using choice tile options; verify choice resolution is correct
- **Confidence bounds**: Parsed confidence values are clamped to [0, 1]

### 6. `convex/gameRules.test.ts` — Existing rules + strategy prompts

Tests for `gameRules.ts` (which currently has **no tests**):

- **`estimateHandStrength`**: Given various tile combinations, verify expected strength ranges (all vowels → high, all rare consonants → lower)
- **`getQuickRecommendation`**: Given hand strength + stage + pot, verify appropriate fold/call/raise decisions
- **`getGameRulesForAI()`**: Verify it returns a non-empty string with key sections
- **`getStageStrategy`**: Each stage returns appropriate strategic advice

## Existing Tests to Update

- **`convex/aiStrategy.test.ts`**: Add tests for new `MODEL_CONFIG` mapping (difficulty → model), new personality dialogue configs, and the updated `FUTURE_BETTING_PERSONALITY_PROFILES`
- **`convex/showdownSolver.test.ts`**: Add tests for the LLM showdown attempt flow (valid word kept, invalid word → solver fallback, suboptimal word kept for easy difficulty)

## Test Infrastructure

- No new vitest config needed — current setup works
- No mocking framework needed — we test pure functions
- AI calls (OpenRouter, NIM) are **not** unit tested — they're integration tested via eval (parked in the Confident AI plan)
- LLM-dependent code is tested by mocking the LLM response string at the function boundary (the parsing/validation layer)

## Implementation Order

1. `convex/aiPrompts.ts` + `convex/aiPrompts.test.ts` — Prompt registry (foundation, everything depends on it)
2. `convex/aiTools.ts` + `convex/aiTools.test.ts` — Tool schemas
3. `convex/aiPersonalities.ts` + `convex/aiPersonalities.test.ts` — Personality definitions
4. `convex/aiDialogue.ts` + `convex/aiDialogue.test.ts` — Dialogue generation
5. `convex/ai.ts` updates + `convex/ai.test.ts` — Betting + showdown integration
6. `convex/gameRules.test.ts` — Coverage for existing untested module
7. Update `convex/aiStrategy.test.ts` — New model routing + personality configs