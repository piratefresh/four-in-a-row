# Room Configuration System

### Summary

Add a composable configuration system to rooms so gameplay parameters (game mode, betting structure, choice tile frequency, showdown timer) are per-room settings rather than hardcoded constants. This makes room types like Speed Round or Verbs Only simple config combinations rather than separate codepaths.

### Key Principles

- **Composability over presets** — each config dimension is independently settable. A room can be `gameMode: "verbs" + bettingStructure: "speed"` without needing a bespoke "Speed Verbs" mode.
- **Defaults to current behavior** — when `config` is absent or any field is omitted, all gameplay matches the existing hardcoded constants exactly. No migration for existing rooms.
- **Config flows from room to game** — the `rooms.config` field is resolved once into a `ResolvedGameConfig` that gets threaded through game creation and game logic. Game functions never import hardcoded constants directly; they receive resolved config.

### Config Schema (on `rooms` table)

```ts
config: v.optional(v.object({
  gameMode: v.optional(v.union(
    v.literal("standard"),    // default — CSW24 only
    v.literal("verbs"),       // CSW24 + must be a verb
    v.literal("adjectives"),  // CSW24 + must be an adjective
    v.literal("lowball"),     // CSW24, lowest score wins
  )),
  bettingStructure: v.optional(v.union(
    v.literal("standard"),    // default raise ladder, 60s clock
    v.literal("speed"),       // half blinds/chips, 10s clock
  )),
  choiceTileFrequency: v.optional(v.union(
    v.literal("standard"),    // default: 2-3 choice tiles per round
    v.literal("low"),         // 0-1 choice tiles per round
    v.literal("high"),        // 3-4 choice tiles per round
  )),
  showdownTimer: v.optional(v.number()),  // override SHOWDOWN_TIMER_MS in ms
}))
```

### Resolved Config

`resolveConfig(config?: RoomConfig) → ResolvedGameConfig` merges a partial room config with defaults:

| Field | Default (`standard`) | `speed` Override |
|---|---|---|
| `smallBlind` | 10 | 5 |
| `bigBlind` | 20 | 10 |
| `startingChips` | 1000 | 500 |
| `raiseLadder` | [20, 40, 60, 80, 100, 120, 140, 160, 200] | [10, 20, 30, 40, 50, 60, 70, 80, 100] |
| `turnClockGraceMs` | 60000 | 10000 |
| `turnClockCalledDurationMs` | 30000 | 15000 |
| `showdownTimerMs` | 60000 | 30000 |
| `choiceTileFrequency` | "standard" | — |

| `choiceTileFrequency` | Private choice tiles | Community choice tiles |
|---|---|---|
| `"low"` | 0 | 0–1 |
| `"standard"` | 1 | 1–2 |
| `"high"` | 1–2 | 2–3 |

### Where Config is Consumed

| Config Field | Consumed By | Effect |
|---|---|---|
| `gameMode` | `validateWord` | Selects dictionary: standard → CSW24, verbs → CSW24 ∩ VERB_WORDS, adjectives → CSW24 ∩ ADJ_WORDS, lowball → CSW24 |
| `gameMode` | `compareRankedSubmissions` | Lowball reverses sort (lowest score wins) |
| `gameMode` | AI showdown prompts | Appends mode constraint ("You must find a verb") |
| `gameMode` | AI word enumeration | Filters candidate words against POS sets |
| `gameMode` | Showdown UI | Label + hint text ("Find a verb!", "Lowest score wins!") |
| `bettingStructure` | Game setup (deal, blinds) | Starting chips, blind amounts, raise ladder |
| `bettingStructure` | Turn clock logic | Grace period and called duration |
| `bettingStructure` | Showdown timer | Duration override |
| `choiceTileFrequency` | `createChoiceTileDeal` | Private/community choice tile counts |
| `showdownTimer` | Game progression | Overrides `SHOWDOWN_TIMER_MS` |

### Create Room Mutation

```ts
export const createRoom = mutation({
  args: {
    name: v.string(),
    difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
    config: v.optional(v.object({
      gameMode: v.optional(v.union(v.literal("standard"), v.literal("verbs"), v.literal("adjectives"), v.literal("lowball"))),
      bettingStructure: v.optional(v.union(v.literal("standard"), v.literal("speed"))),
      choiceTileFrequency: v.optional(v.union(v.literal("standard"), v.literal("low"), v.literal("high"))),
      showdownTimer: v.optional(v.number()),
    })),
  },
  // ...
});
```

`continueToNextRoom` copies config from source room to continuation room.

### Implementation Order

#### Phase 1: Schema & Config Infrastructure

- [ ] Add `config` field to `rooms` schema
- [ ] Create `convex/gameConfig.ts` with `GameMode`, `BettingStructure`, `ChoiceTileFrequency` types, `RoomConfig`, `ResolvedGameConfig`, and `resolveConfig()`
- [ ] Update `CreateOpenRoomOptions` to include `config`
- [ ] Thread config through `createRoom` → `createRoomWithHostOptions` → `createOpenRoom` → room document
- [ ] Update `continueToNextRoom` to copy config from source room
- [ ] Run `bunx convex dev` to regenerate types

#### Phase 2: Replace Hardcoded Constants With Resolved Config

- [ ] Update `createInitialGameDocument` to accept resolved config (blinds, raises)
- [ ] Update `dealHands` to accept starting chips and blind amounts from config
- [ ] Update `createShuffledDeck` to accept choice tile count from config
- [ ] Update `createChoiceTileDeal` to accept frequency config for private/community choice tile counts
- [ ] Update turn clock logic to use config timer values
- [ ] Update game progression to use config showdown timer
- [ ] Ensure all game functions receive `ResolvedGameConfig` through game creation flow
- [ ] Verify all existing standard-mode gameplay is unchanged (config defaults must match current constants exactly)

#### Phase 3: Frontend Config UI

- [ ] Create `RoomConfigPanel` component with Game Mode, Pace, Choice Tiles, Difficulty selectors
- [ ] Update `HomeModeMenu` to include config panel for Offline Mode
- [ ] Update `createRoom` mutation call to pass config
- [ ] Show active game mode label in game UI header
- [ ] Show mode-specific hint text at showdown
- [ ] Update Results "Play Again" to preserve config

#### Verification

- [ ] Unit tests for `resolveConfig` defaults and speed overrides
- [ ] Integration test: standard config produces identical game behavior as current hardcoded constants
- [ ] Run `bun run test`
- [ ] Run `bunx tsc -p convex/tsconfig.json --pretty false`
- [ ] Run `bun run build`

### Assumptions

- Config is per-room, not per-game. All games in a room share the same config.
- Online rooms default to standard config. Config UI for online rooms (host-configured rooms) is a separate future feature.
- `speed` is a preset, not a collection of individual sliders. Individual parameter control can be added later without schema changes by extending the union.
- `continueToNextRoom` preserves config so "Play Again" keeps the same room type across games.