# Game + AI Observability Plan

### Summary

Upgrade the current tracer from a raw event stream into a lightweight Confident-style
observability layer for Word Poker: one timeline for debugging, plus aggregate bot/player
signals for balancing decisions. Keep full prompts and outputs indefinitely, and keep the
tooling dev/admin-gated.

The repo already has partial implementation: `gameTraces`, `/admin/traces`, `/admin/stats`,
AI/game trace inserts, OpenRouter latency, and `playerStats`. The next work should refine
and harden that system rather than start over.

### Key Changes

- Extend `gameTraces` with normalized observability fields: `component`, `operation`,
  `decisionSource`, `latencyMs`, `provider`, `promptTemplate`, `cacheStatus`, and optional
  `qualityFlags`.
- Add game/player-read fields for AI behavior analysis: `bluffDetected` and `believesPlayer`.
- Keep `gameId` as the trace run id; each row remains a flat event/span in the game timeline.
- Continue storing full `inputPrompt`, `outputRaw`, and `outputParsed`.
- Move repeated trace insert shaping into typed helper functions in `convex/aiTracing.ts`.

### Backend Implementation

- Fix `playerStats` aggregation to use `gameTraces` for full action counts instead of only
  `playerHands.lastAction`.
- Make stat aggregation idempotent per completed game by adding a processed-rollup marker
  or equivalent guard so repeated completion paths do not double-count.
- Add core balance metrics: win rate, net chips, showdown reach/win rate, average word score,
  action mix, fold/raise rate, bluff rate, fallback rate, average hand strength, average
  latency, and LLM success rate.
- Enrich betting traces with probabilistic recommendation, final executed action, action
  override reason when applicable, bluff/player-read fields, latency, model, and fallback source.
- Enrich showdown traces with LLM word, validation result, deterministic fallback reason,
  selected score, and candidate metadata where available.
- Enrich dialogue traces with template/RAG/LLM source, trigger, latency, and whether the
  message was suppressed or sent.

### Admin UI

- Keep `/admin/traces` as the raw timeline, but add filters for component, decision source,
  difficulty, character, success, fallback, and game id.
- Add detail sections for LLM, Game Decision, and Evaluation Signals so prompts, outputs,
  parsed decisions, and balance metadata are readable without digging through raw JSON.
- Upgrade `/admin/stats` into the decision dashboard with player vs bot comparison,
  per-character comparison, action mix, fallback rate, latency, win-rate spread, chip delta,
  and showdown quality.
- Keep routes dev-only with `import.meta.env.DEV`.

### Test Plan

- Add focused tests for trace helper payload shaping and undefined stripping.
- Add aggregation tests proving full action counts come from traces and completed games are
  not double-counted.
- Add AI trace tests for fallback, successful LLM parse, invalid LLM showdown word,
  deterministic showdown, and dialogue source variants.
- Run `bun run test`, `bunx tsc -p convex/tsconfig.json --pretty false`, and `bun run build`.

### Assumptions

- No external tracing SDK will be added.
- Full prompts and raw outputs are intentionally retained forever.
- This remains dev/admin observability, not a player-facing feature.
- Core balance metrics are in scope now; cohort experiments and advanced trend dashboards
  can come later.

## Progress Checklist

### Current Implementation Audit

- [x] Confirm existing `gameTraces` schema exists
- [x] Confirm `convex/aiTracing.ts` exists
- [x] Confirm `/admin/traces` route exists
- [x] Confirm trace table, detail, and filter components exist
- [x] Confirm OpenRouter returns `latencyMs`
- [x] Confirm AI betting and showdown traces are partially instrumented
- [x] Confirm game action, stage, showdown, and completion traces are partially instrumented
- [ ] Verify current tracing coverage with a real bot game

### Observability Schema

- [ ] Add normalized observability fields: `component`, `operation`, `decisionSource`, `latencyMs`, `provider`, `promptTemplate`, `cacheStatus`
- [ ] Add game and player-read fields: `bluffDetected`, `believesPlayer`, `qualityFlags`
- [ ] Add indexes needed for admin filtering
- [ ] Update trace validators to match schema

### Trace Helpers

- [ ] Replace loose trace payload construction with typed helper functions
- [ ] Add helper for game lifecycle traces
- [ ] Add helper for betting decision traces
- [ ] Add helper for showdown decision traces
- [ ] Add helper for dialogue traces
- [ ] Keep full `inputPrompt`, `outputRaw`, and `outputParsed`

### Instrumentation

- [ ] Enrich `ai_betting` traces with final executed action and override reason
- [ ] Enrich `ai_showdown` traces with LLM word validation and fallback reason
- [ ] Enrich `ai_dialogue` traces with template/RAG/LLM source and suppression info
- [ ] Ensure game actions produce the full action timeline
- [ ] Ensure completion traces include winner and resolution reason

### Player And Bot Analytics

- [ ] Fix `playerStats` to count all actions from `gameTraces`
- [ ] Make completed-game aggregation idempotent
- [ ] Add fallback rate, latency, LLM success rate, bluff rate, and average hand strength
- [ ] Add player/bot balance metrics for win rate, net chips, showdown quality, and action mix

### Admin UI

- [ ] Add filters for component, decision source, difficulty, character, success, fallback, and game id
- [ ] Improve trace detail sections: LLM, Game Decision, Evaluation Signals
- [ ] Upgrade `/admin/stats` with bot/player comparison and balance metrics
- [ ] Keep `/admin/traces` and `/admin/stats` dev-only

### Verification

- [ ] Add tests for trace helper payload shaping
- [ ] Add tests for full-action stat aggregation
- [ ] Add tests to prevent double-counting completed games
- [ ] Add tests for AI fallback and invalid showdown word paths
- [ ] Run `bun run test`
- [ ] Run `bunx tsc -p convex/tsconfig.json --pretty false`
- [ ] Run `bun run build`
