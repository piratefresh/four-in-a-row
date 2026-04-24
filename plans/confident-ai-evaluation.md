# Confident AI Evaluation Plan

## Overview

Integrate [Confident AI](https://www.confident-ai.com) (DeepEval) for prompt tracking, LLM tracing, and evaluation of our AI system. DeepEval provides a TypeScript SDK (`deepeval` npm package) with `observe` wrappers, `traceManager`, and `updateCurrentTrace`/`updateCurrentSpan` — compatible with our Convex backend.

## Key Components from Confident AI

- **LLM Tracing**: Every AI call traced, visualized, and stored in their dashboard
- **Prompt Versioning**: Git-based prompt management synced from code
- **Online Evals**: Auto-evaluate traces in production
- **Regression Testing**: Compare eval results across prompt versions
- **Datasets**: Curate golden test cases for betting/showdown/dialogue
- **DeepEval TS SDK**: `observe` wrapper, `traceManager.configure()`, `updateCurrentTrace()`, `updateCurrentSpan()`

## Phase 0: Confident AI Setup + Tracing

### Install

```bash
npm install deepeval
npx deepeval login  # Connect to Confident AI project
```

### New file: `convex/aiTracing.ts`

- Initialize `traceManager` with `CONFIDENT_API_KEY` from env
- Wrap every LLM call (`callNvidiaNimChat`, `callOpenRouterChat`) with `observe`
- Use span types: `"llm"` for model calls, `"tool"` for betting action parsing, `"agent"` for full bot turn
- Set `updateCurrentSpan` with input prompt, output, model, tokenCount, latency
- Link traces to `threadId` = gameId (groups all AI calls in one game together)
- Tag traces with `difficulty`, `personality`, `promptVersion`

```typescript
import { observe } from "deepeval/tracing";
import { traceManager } from "deepeval/tracing";

traceManager.configure({
  confidentApiKey: process.env.CONFIDENT_API_KEY,
});
```

### Modify: `convex/ai.ts`

- Wrap `aiDecideBet` handler body in `observe({ fn: ... })`
- Wrap `aiSubmitWord` handler body in `observe`
- Add `updateCurrentTrace` with game metadata (gameId, difficulty, personality, stage)
- Add `updateCurrentSpan` with prompt version tracking

### Modify: `convex/aiClient.ts` / `openRouterClient.ts`

- Wrap the actual `chat.completions.create` calls in `observe({ type: "llm" })`
- Log model name, token usage (from `response.usage`), latency

### New Convex env var: `CONFIDENT_API_KEY`

## Phase 1: Prompt Registry + Versioning

### New file: `convex/aiPrompts.ts`

Code-native prompt definitions with explicit versions, synced to Confident AI:

```typescript
export const AI_PROMPTS = {
  betting: {
    id: "betting-v1",
    version: "1.0.0",
    description: "Initial tool-use betting prompt",
    build: (vars: BettingPromptVars) => string,
  },
  bettingTooluse: {
    id: "betting-tooluse-v1",
    version: "1.0.0",
    description: "Tool-use betting with function calling",
    build: (vars: BettingPromptVars) => string,
  },
  showdown: {
    id: "showdown-v1",
    version: "1.0.0",
    description: "LLM showdown word attempt",
    build: (vars: ShowdownPromptVars) => string,
  },
  dialogue: {
    id: "dialogue-v1",
    version: "1.0.0",
    description: "Personality-driven dialogue generation",
    build: (vars: DialoguePromptVars) => string,
  },
} as const;
```

Every prompt is a typed function that produces the final prompt string. Versions live in code and are tagged in traces via `updateCurrentTrace({ metadata: { promptVersion: "betting-v1.0.0" } })`.

Confident AI's git-based prompt versioning can pull these versions into the dashboard for A/B testing and regression tracking.

## Phase 2: Evaluation with Confident AI + DeepEval

### Directory: `eval/`

```
eval/
├── fixtures/               # Pre-built game states
│   ├── betting/
│   │   ├── strong-hand.ts
│   │   ├── weak-hand.ts
│   │   ├── bluff-scenario.ts
│   │   └── preflop.ts
│   ├── showdown/
│   │   ├── high-value-tiles.ts
│   │   ├── choice-tiles.ts
│   │   └── minimal-tiles.ts
│   └── dialogue/
│       ├── trigger-events.ts
│       └── personality-prompts.ts
│
├── scenarios/               # Test scenarios + assertions
│   ├── betting/
│   │   ├── fold-weak.scenario.ts
│   │   ├── raise-strong.scenario.ts
│   │   ├── personality-aggressive.scenario.ts
│   │   └── difficulty-easy.scenario.ts
│   ├── showdown/
│   │   ├── valid-word.scenario.ts
│   │   ├── personality-word-choice.scenario.ts
│   │   └── difficulty-curve.scenario.ts
│   ├── dialogue/
│   │   ├── personality-consistency.scenario.ts
│   │   ├── trigger-appropriateness.scenario.ts
│   │   └── safety-toxicity.scenario.ts
│   └── e2e/
│       └── full-game.scenario.ts
│
├── metrics/                 # Custom DeepEval metrics
│   ├── actionCorrectness.ts      # Valid action from allowed set
│   ├── handStrengthAlignment.ts  # Action matches hand quality
│   ├── personalityConsistency.ts  # Dialogue matches personality
│   ├── wordQuality.ts            # Valid word + score appropriate
│   └── difficultyCurve.ts         # Easy < Hard performance
│
├── tests/                   # DeepEval test files
│   ├── test_betting.py
│   ├── test_showdown.py
│   ├── test_dialogue.py
│   └── test_e2e.py
│
├── runner.ts                 # TS runner: calls Convex actions, collects results
└── config.ts                 # Model config, environment setup
```

### Evaluation Architecture

TypeScript runner calls Convex HTTP actions with fixture data, collects AI responses, then uses DeepEval's Python metrics via subprocess or Confident AI API directly.

```python
# eval/tests/test_betting.py
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from deepeval.metrics import GEval

def test_fold_weak_hand():
    result = call_convex_action("ai:aiDecideBet", WEAK_HAND_FIXTURE)
    
    test_case = LLMTestCase(
        input=WEAK_HAND_FIXTURE_DESCRIPTION,
        actual_output=result["action"],
        context=[result["reasoning"]]
    )
    
    metric = GEval(
        name="Weak Hand Fold",
        criteria="Weak hands should fold or check, not raise",
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.7
    )
    assert_test(test_case, [metric])
```

### Production Monitoring (via Confident AI dashboard)

- `traceManager.configure()` sends all traces to Confident AI
- Online evals: configure metrics to auto-evaluate traces as they come in
- Alerts: get notified when AI quality drops (e.g., betting actions become invalid)
- Thread view: see all AI calls for a single game grouped together
- Prompt version comparison: A/B test prompt changes with built-in regression detection

### Key Metrics

| Metric | Type | What it tracks |
|--------|------|---------------|
| Betting action validity | Deterministic | Is action from allowed set? |
| Hand strength alignment | GEval | Does action match hand quality? |
| Dialogue personality | GEval | Does tone match character? |
| Dialogue safety | GEval | Is it free of toxicity? |
| Dialogue brevity | Deterministic | Under 50 tokens? |
| Word validity | Deterministic | Is it a valid CSW24 word? |
| Word score vs. optimal | Deterministic | How close to solver's best? |

## Phase 3: Model Routing

### Modify: `convex/aiStrategy.ts`

```typescript
export const MODEL_CONFIG = {
  easy:   { model: "meta-llama/llama-3.1-8b-instruct",   provider: "openrouter" },
  medium: { model: "google/gemma-3-12b-it",              provider: "openrouter" },
  hard:   { model: "google/gemma-3-27b-it",               provider: "openrouter" },
} as const;
```

Configurable via env vars. Easy changes to model = immediate trace visibility + eval regression check.

## Implementation Order

| # | Phase | What | Depends on |
|---|-------|------|------------|
| 0A | Confident AI setup | Install `deepeval`, configure `traceManager`, wrap AI calls | - |
| 0B | Prompt registry | `aiPrompts.ts` with versioned templates | 0A |
| 0C | Eval foundation | Python test files, fixtures, metrics | 0A |
| 1 | Tool-use betting | Rewrite with tools + tracing | 0A, 0B |
| 2 | Dialogue system | Personality-driven chat + tracing | 0A, 0B |
| 3 | Showdown AI | LLM word attempt + solver fallback | 0A, 0B |
| 4 | Model routing | Difficulty→model mapping | 1, 2, 3 |
| 5 | Full eval suite | All test scenarios + regression | 0C, 1-3 |