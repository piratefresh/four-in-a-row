# Game + AI Tracer Plan

## Overview

Build a custom AI + game tracer using Convex DB + a flat-table dashboard at `/admin/traces`.
No external tracing SDK needed — just lightweight Convex mutations that write trace rows
inline during game execution.

## Design Decisions

| Choice | Value |
|--------|-------|
| Granularity | Full timeline (~20-30 writes per game) |
| Dashboard layout | Flat table with filters (not game-first) |
| Data retention | Keep forever (no auto-purge) |
| Route guard | Dev-only (`import.meta.env.DEV`) |
| Trace capture | Inline in game actions (not separate logging action) |
| Showdown tracing | Yes — even though deterministic, useful for observability |
| Full prompt storage | Yes — store entire `inputPrompt` for debugging |

## Schema: `gameTraces` table

```ts
gameTraces: defineTable({
  gameId: v.id("games"),
  roomId: v.optional(v.id("rooms")),

  category: v.union(
    v.literal("game_start"),
    v.literal("game_action"),
    v.literal("stage_change"),
    v.literal("showdown_submit"),
    v.literal("game_complete"),
    v.literal("ai_betting"),
    v.literal("ai_showdown"),
    v.literal("ai_dialogue"),
  ),

  // Who
  playerId: v.optional(v.string()),
  playerName: v.optional(v.string()),
  isBot: v.optional(v.boolean()),

  // Game action fields
  action: v.optional(v.string()),
  stage: v.optional(v.string()),
  previousStage: v.optional(v.string()),
  tilesRevealed: v.optional(v.string()),
  potBefore: v.optional(v.number()),
  potAfter: v.optional(v.number()),
  chipsBefore: v.optional(v.number()),
  chipsAfter: v.optional(v.number()),
  raiseAmount: v.optional(v.number()),

  // Showdown fields
  wordSubmitted: v.optional(v.string()),
  wordScore: v.optional(v.number()),
  wordScoreBreakdown: v.optional(v.string()),
  winnerId: v.optional(v.string()),
  winnerWord: v.optional(v.string()),
  winnerScore: v.optional(v.number()),

  // AI trace fields
  model: v.optional(v.string()),
  difficulty: v.optional(v.string()),
  personality: v.optional(v.string()),
  handStrength: v.optional(v.number()),
  isBluffing: v.optional(v.boolean()),
  inputPrompt: v.optional(v.string()),
  outputRaw: v.optional(v.string()),
  outputParsed: v.optional(v.string()),
  usedFallback: v.optional(v.boolean()),

  // Dialogue fields
  dialogueTrigger: v.optional(v.string()),
  dialogueMessage: v.optional(v.string()),

  // Common
  success: v.boolean(),
  error: v.optional(v.string()),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
})
  .index("by_gameId_createdAt", ["gameId", "createdAt"])
  .index("by_category_createdAt", ["category", "createdAt"])
  .index("by_createdAt", ["createdAt"])
```

## Trace Categories

| Category | Trigger | Fields populated |
|----------|---------|-----------------|
| `game_start` | `startGame` mutation | gameId, roomId, players, stage, pot |
| `game_action` | check/call/raise/fold handlers | action, stage, potBefore→After, chipsBefore→After, isBot, playerName |
| `stage_change` | `advanceStage` | previousStage→stage, tilesRevealed, pot |
| `showdown_submit` | `submitWord` / bot showdown | wordSubmitted, wordScore, isBot, playerId |
| `game_complete` | winner determined | winnerId, winnerWord, winnerScore |
| `ai_betting` | `aiDecideBet` action | model, difficulty, inputPrompt, outputRaw, outputParsed, handStrength, isBluffing, usedFallback |
| `ai_showdown` | `aiSubmitWord` action | model, difficulty, personality, wordSubmitted, wordScore, usedFallback |
| `ai_dialogue` | `maybeSendBotDialogue` | model, personality, dialogueTrigger, dialogueMessage, inputPrompt, outputRaw |

## New Files

| File | Purpose |
|------|---------|
| `convex/aiTracing.ts` | `insertGameTrace` internal mutation, typed helpers for each category |
| `src/routes/admin/traces.tsx` | Dev-gated admin route, flat table with filters |
| `src/components/admin/TraceTable.tsx` | Data table with category badges, expandable rows |
| `src/components/admin/TraceDetail.tsx` | Expanded detail panel (prompt, response, context) |
| `src/components/admin/TraceFilters.tsx` | Filter by category, player, isBot, difficulty |

## Modified Files

| File | Change |
|------|--------|
| `convex/schema.ts` | Add `gameTraces` table |
| `convex/games/gamesSetup.ts` | Log `game_start` on game creation |
| `convex/games/gamesBetting.ts` | Log `game_action` on check/call/raise/fold + log `ai_dialogue` from `maybeSendBotDialogue` |
| `convex/games/gamesProgression.ts` | Log `stage_change` on stage transitions + `game_complete` on winner |
| `convex/games/gamesShowdown.ts` | Log `showdown_submit` on word submission + `game_complete` on resolution |
| `convex/ai.ts` | Log `ai_betting` / `ai_showdown` after LLM/solver calls |
| `convex/openRouterClient.ts` | Return `{ content, latencyMs }` so callers can log latency in metadata |

## Dashboard: `/admin/traces`

**Flat table view** with:

- **Category badges** — color-coded: game_start (blue), game_action (gray), stage_change (purple), showdown_submit (yellow), game_complete (green), ai_betting (orange), ai_showdown (cyan), ai_dialogue (pink)
- **Filter tabs** — All / Game / AI / Dialogue
- **Filter chips** — isBot, difficulty, stage, success/fallback
- **Expandable rows** — click to see full prompt, raw output, parsed result, metadata
- **Live-updating** — Convex subscription via `useQuery`
- **Search** — by player name, word, action

### Example row layout

```
Time      Category        Player    Action/Word      Stage    Details
───────────────────────────────────────────────────────────────────────────
12:00:01  🎮 game_start   —         4 players        —        Room: abc123
12:00:05  📋 stage_change —         preflop          preflop  Blinds: 10/20
12:00:10  ⬆️ game_action  Bob       raise to 40      preflop  Pot: 20→60
12:00:15  🤖 game_action  🤖Nora    call 40          preflop  Pot: 60→120
12:00:15  💬 ai_betting   🤖Nora    call             preflop  HS: 0.4, no bluff
12:00:20  🤖 game_action  🤖Jax     fold             preflop  —
12:00:20  💬 ai_betting   🤖Jax     fold             preflop  HS: 0.15, no bluff
12:00:25  ⬇️ game_action  Alice     fold             preflop  —
12:00:30  📋 stage_change —         flop             flop     Tiles: A• E• S•
12:00:35  ⬆️ game_action  Bob       raise to 60      flop     Pot: 60→120
12:00:40  🤖 game_action  🤖Nora    call 60          flop     Pot: 120→180
12:00:40  💬 ai_betting   🤖Nora    call             flop     HS: 0.7, BLUFFING
12:00:45  📋 stage_change —         turn             turn     Tile: T•
12:00:50  ⬆️ game_action  🤖Nora    raise to 80      turn     Pot: 80→160
12:00:50  💬 ai_betting   🤖Nora    raise            turn     HS: 0.7, bluffing
12:01:00  ⬇️ game_action  Bob       fold             turn     —
12:01:05  📝 showdown     🤖Nora    SEAT (6pts)      showdown —
12:01:05  💬 ai_showdown  🤖Nora    SEAT             showdown Score: 6
12:01:10  ✅ game_complete 🤖Nora   Winner!          showdown Score: 6
```

## Shadcn Components to Install

```bash
bunx shadcn@latest add table tabs badge scroll-area collapsible
```

## Implementation Order

1. **Schema** — Add `gameTraces` table to `convex/schema.ts`
2. **Tracing mutation** — Create `convex/aiTracing.ts` with `insertGameTrace`
3. **OpenRouter client** — Return `{ content, latencyMs }`
4. **AI actions** — Log `ai_betting` / `ai_showdown` in `convex/ai.ts`
5. **Game mutations** — Log `game_start`, `game_action`, `stage_change`, `showdown_submit`, `game_complete`
6. **Dialogue** — Log `ai_dialogue` in `gamesBetting.ts`
7. **Dashboard** — Create route + components
8. **Install shadcn components** — table, tabs, badge, scroll-area, collapsible
