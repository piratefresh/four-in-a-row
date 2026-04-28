# Room Types & Game Modes

### Summary

Implement the first batch of game modes (Verbs Only, Adjectives Only, Lowball, Speed) as composable room configurations. Each mode is defined by its config combination, validated word set, and AI behavior adjustments — not as separate codepaths.

### Game Mode Definitions

| Mode | `gameMode` | `bettingStructure` | Word Validation | Scoring | AI Adjustment |
|---|---|---|---|---|---|
| Standard | `"standard"` | `"standard"` | CSW24 only | Highest score wins | Current behavior |
| Verbs Only | `"verbs"` | any | CSW24 ∩ VERB_WORDS only | Highest score wins | Prompt: "find a verb"; filter candidates by POS |
| Adjectives Only | `"adjectives"` | any | CSW24 ∩ ADJ_WORDS only | Highest score wins | Prompt: "find an adjective"; filter candidates by POS |
| Lowball | `"lowball"` | any | CSW24 only | **Lowest** score wins | Invert hand strength; seek lowest-scoring valid word |
| Speed | `"standard"` | `"speed"` | CSW24 only | Highest score wins | Faster timers, half stakes |

Any combination is valid (e.g., `"verbs" + "speed"` = fast verb-only game).

### POS Dictionary Generation

#### Approach: WordNet at Build Time (MIT Licensed)

- Add `wordnet-db` as a dev dependency
- Create `scripts/generate-pos-index.mjs` (mirrors `scripts/generate-csw24-index.mjs`)
- Parse WordNet `index.verb` and `index.adj` files
- Intersect with CSW24 2-7 letter word set
- Generate `convex/posWords.generated.ts`:
  - `VERB_WORDS: Record<string, true>` (~5K words)
  - `ADJ_WORDS: Record<string, true>` (~5K words)
- Add `"generate:pos-index"` script to `package.json`
- Add `posWords.generated.ts` to `.gitignore` (regenerated from source)

#### WordNet Data

- WordNet 3.1 (via `wordnet-db` npm package) — MIT licensed, Princeton public domain
- Contains ~5,252 verbs and ~5,239 adjectives in the 2-7 letter range
- ~391 words overlap (e.g., "RUN" is both noun and verb) — these appear in both sets
- The generated file will be a simple hash map like `VALID_WORDS` in `csw24.generated.ts`

### Game Mode Logic

#### Word Validation (`validateWord`)

```ts
function isValidWordForMode(word: string, mode: GameMode): { valid: boolean; reason?: string } {
  const normalized = word.trim().toUpperCase();
  if (!/^[A-Z]{2,7}$/.test(normalized)) {
    return { valid: false, reason: "Word must be 2-7 letters" };
  }
  if (!VALID_WORDS[normalized]) {
    return { valid: false, reason: "Not in dictionary" };
  }
  if (mode === "verbs" && !VERB_WORDS[normalized]) {
    return { valid: false, reason: "Not a verb" };
  }
  if (mode === "adjectives" && !ADJ_WORDS[normalized]) {
    return { valid: false, reason: "Not an adjective" };
  }
  return { valid: true };
}
```

- `"standard"` and `"lowball"` modes use CSW24 only (no POS filter)
- `"verbs"` requires CSW24 pass + `VERB_WORDS` pass
- `"adjectives"` requires CSW24 pass + `ADJ_WORDS` pass
- Invalid words for mode still score 0 (same as current invalid-word behavior)

#### Scoring (`compareRankedSubmissions`)

- Standard/Verbs/Adjectives: higher score wins (current behavior)
- Lowball: **lower score wins** — reverse the primary sort key

```ts
if (config.gameMode === "lowball") {
  // Sort ascending by score instead of descending
  return a.score - b.score;
}
// Default: sort descending by score
return b.score - a.score;
```

Tiebreakers remain the same (longer word wins, higher single tile value wins, earlier submission wins).

#### AI Showdown Strategy

- **Verbs Only**: Append to AI prompt: "You must find a verb (a word that is a verb form, like RUN, JUMP, THINK, PLAYED, GOING)."
- **Adjectives Only**: Append: "You must find an adjective (a word that describes something, like FAST, BIG, RED, HAPPY, BETTER)."
- **Lowball**: Replace "highest-scoring" with "lowest-scoring" in prompt. AI should seek the shortest, lowest-value valid word.
- **Standard/Speed**: No change to current prompt.

AI candidate word enumeration (`getWordsForSignature`) filters by POS set when mode requires it:

```ts
let candidates = getWordsForSignature(signature);
if (config.gameMode === "verbs") {
  candidates = candidates.filter(w => VERB_WORDS[w]);
}
if (config.gameMode === "adjectives") {
  candidates = candidates.filter(w => ADJ_WORDS[w]);
}
```

#### AI Betting Strategy (Lowball)

In lowball mode, hand strength interpretation inverts:
- Weak hands (low-scoring letter combinations) become "strong"
- Strong hands (high-scoring letters like Q, Z, X) become "weak"
- The AI should fold more when it has high-value tiles and call/raise when it has low-value tiles

Implementation: add a `handStrengthInverted: boolean` derived from `gameMode === "lowball"` that flips the fold/call/raise probabilities in the FCR bucket calculation.

### Speed Mode Details

| Parameter | Standard | Speed |
|---|---|---|
| Small blind | 10 | 5 |
| Big blind | 20 | 10 |
| Starting chips | 1000 | 500 |
| Raise ladder | [20, 40, 60, 80, 100, 120, 140, 160, 200] | [10, 20, 30, 40, 50, 60, 70, 80, 100] |
| Turn clock grace | 60s | 10s |
| Turn clock called | 30s | 15s |
| Showdown timer | 60s | 30s |

All speed parameters are derived from `bettingStructure: "speed"` via `resolveConfig()`. No new constants needed — just the override values.

### Choice Tile Frequency Details

| Frequency | Private choice tiles | Community choice tiles | Total per round |
|---|---|---|---|
| `"low"` | 0 | 0–1 | 0–1 |
| `"standard"` | 1 | 1–2 | 2–3 |
| `"high"` | 1–2 | 2–3 | 3–4 |

Implementation: modify `createChoiceTileDeal` to accept frequency config and adjust `PREFERRED_PRIVATE_CHOICE_TILE_COUNT`, `MIN_COMMUNITY_CHOICE_TILE_COUNT`, and `MAX_COMMUNITY_CHOICE_TILE_COUNT` accordingly.

### Showdown UI Changes

When `gameMode !== "standard"`, show a persistent mode indicator:

| Mode | Header Badge | Showdown Placeholder | Result Emphasis |
|---|---|---|---|
| Standard | (none) | "Enter your word" | Current |
| Verbs | "Verbs Only" | "Find a verb!" | Highlight verb words |
| Adjectives | "Adjectives Only" | "Find an adjective!" | Highlight adjective words |
| Lowball | "Lowball" | "Go low!" | Emphasize lowest score wins |
| Speed | (none, timer shows) | "Enter your word" | Current (faster) |

Invalid word feedback should show the mode-specific reason ("Not a verb", "Not an adjective") rather than a generic "Invalid word".

### Implementation Order

#### Phase 1: POS Dictionary Generation

- [ ] `bun add -D wordnet-db`
- [ ] Create `scripts/generate-pos-index.mjs`
- [ ] Parse `index.verb` and `index.adj` from `wordnet-db`, intersect with CSW24 2-7 letter words
- [ ] Generate `convex/posWords.generated.ts` with `VERB_WORDS` and `ADJ_WORDS` exports
- [ ] Add `"generate:pos-index"` script to `package.json`
- [ ] Add `convex/posWords.generated.ts` to `.gitignore`
- [ ] Verify generation: `bun run generate:pos-index`

#### Phase 2: Game Mode Validation & Scoring

- [ ] Create `convex/gameConfig.ts` with `GameMode` type union and `isValidWordForMode()`
- [ ] Update `validateWord.ts` to use `isValidWordForMode()`
- [ ] Update `compareRankedSubmissions` for lowball reverse sort
- [ ] Update AI showdown prompt builder to append mode-specific constraints
- [ ] Update AI candidate word enumeration to filter by POS when mode requires
- [ ] Update AI betting strategy for lowball (inverted hand strength)

#### Phase 3: Choice Tile Frequency

- [ ] Update `createChoiceTileDeal` to accept `ChoiceTileFrequency` config
- [ ] Implement low/standard/high frequency logic
- [ ] Wire through game setup

#### Phase 4: Frontend Mode UI

- [ ] Add game mode badge/label to game header
- [ ] Add mode-specific placeholder/hint text to showdown input
- [ ] Update invalid word error messages to show mode-specific reasons
- [ ] Show "Lowest score wins!" in lowball mode results

#### Verification

- [ ] Unit tests for `isValidWordForMode` (standard, verbs, adjectives, lowball)
- [ ] Unit tests for POS dictionary intersection counts
- [ ] Unit tests for lowball scoring reversal
- [ ] Unit tests for AI prompt mode constraint text
- [ ] Unit tests for choice tile frequency adjustments
- [ ] Unit tests for speed mode config resolution
- [ ] Run `bun run test`
- [ ] Run `bunx tsc -p convex/tsconfig.json --pretty false`
- [ ] Run `bun run build`

### Future Modes (Out of Scope)

These can be added as new `gameMode` or `bettingStructure` union values without schema changes:

- **Category Card** — random category per round, LLM-validates word fit
- **Blind Showdown** — community tiles hidden until showdown
- **Double or Nothing** — loser can challenge for a comeback hand
- **No Limit / Pot Limit** — alternative betting structures to fixed-limit
- **Anarchy** — 1-letter words allowed