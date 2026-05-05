# Word Poker: River Run Solo Rules

## Overview

River Run v1 is a solo Word Poker run.

The player plays a sequence of hands against a rising target score. Each hand has three phases: Draft, Expand, and Finale. Draft is a tile selection phase — no word is submitted. Expand and Finale are scoring phases where the player submits one word each. The two phase scores are added into a hand total, and the hand total is compared to the current target.

This rebuild is solo-only. 1v1 versus matches, opponent scoring, shared shops, hand-win races, and first-to-3 match logic are out of scope for the v1 River Run rebuild.

---

## Run Goal

Clear every target in the target curve before missing one.

Initial target curve:

```text
[30, 40, 55, 70, 90, 115, 145, 180]
```

The first hand uses target `30`. Each passed hand advances to the next target.

> Note: The target curve is calibrated for 2 scored phases (Expand and Finale only). Rebalance if scoring changes.

---

## Run States

| State | Meaning |
|---|---|
| Active | The player is currently in Draft, Expand, or Finale. |
| Shop | The player cleared a target and may buy or skip an upgrade before the next hand. |
| Failed | The player finished Finale with a hand total below the current target. |
| Completed | The player cleared the final target in the curve. |

---

## Pass, Fail, and Completion

A hand passes when the Finale phase resolves and:

```text
Hand Total >= Current Target
```

A hand fails when the Finale phase resolves and:

```text
Hand Total < Current Target
```

Passing a non-final target moves the run into the Shop state. After the player buys or skips, the next hand starts with the next target in the curve.

Passing the final target completes the run. Failed and completed runs are terminal until the player starts a new run.

---

## Hand Structure

Each hand starts with 10 candidate tiles and ends with 7 active tiles.

Tiles flow through 3 phases:

1. **Draft** — 10 tiles shown. Discard 6, keep 4. No word submitted.
2. **Expand** — 2 random tiles revealed. 6 total. Submit one word.
3. **Finale** — 1 random tile revealed. 7 total. Submit one word.

---

## Phase 1: Draft

10 candidate tiles are shown face-up all at once.

The player discards exactly 6 and keeps 4. Discarded tiles are removed for the rest of the hand.

No word is submitted during Draft. This phase is purely strategic.

Example:

```text
Candidates: A  T  S  R  V  Q  E  N  L  O
```

Decision points a player might face:

- Keep `A E N O` for strong vowel coverage going into Expand.
- Keep `A T S R` as a tight consonant-heavy set, gambling on good Expand reveals.
- Keep `Q R S T` to chase a high point value, hoping for a `U` in Expand or Finale.
- Discard both `V` and `Q` immediately — rack poison if no supporting tiles appear.

The 6 discarded tiles are gone. They do not return during Expand or Finale.

---

## Phase 2: Expand

2 new random tiles are revealed and added to the 4 kept tiles, for 6 total.

The player submits one word using any of the 6 available tiles.

Example:

```text
Kept:     A T S R
Revealed: E N
Total:    A T S R E N
```

Possible words:

- RATES
- TEARS
- ASTERN

---

## Phase 3: Finale

1 final random tile is revealed, bringing the total to 7.

The player submits one word using any of the 7 available tiles.

Example:

```text
Expand tiles: A T S R E N
Revealed:     I
Total:        A T S R E N I
```

Possible words:

- NASTIER
- RETAINS
- ANTSIER

After the Finale word is submitted, the hand total is resolved against the current target.

---

## Letter Reuse Rule

Letters are reusable across phases.

A tile used in the Expand word can still be used in the Finale word.

Example:

- Expand word: ASTERN
- Finale word: NASTIER

This is allowed. Within a single submitted word, the word can only use letters available in the currently revealed tile pool.

---

## Scoring

Only Expand and Finale words score points. Draft has no score.

At the end of the hand, the 2 phase scores are added together.

Example:

| Phase | Word | Score |
|---|---|---:|
| Draft | *(discard phase)* | — |
| Expand | ASTERN | 22 |
| Finale | NASTIER | 48 |
| Total | | 70 |

If the current target is `70`, this hand passes.

---

## Basic Score Formula

```text
Word Score = Letter Points + Length Bonus + Power-Up Bonuses
```

---

## Suggested Length Bonus

| Word Length | Bonus |
|---|---:|
| 2 letters | +0 |
| 3 letters | +3 |
| 4 letters | +6 |
| 5 letters | +10 |
| 6 letters | +15 |
| 7 letters | +25 |

---

## Credits

Credits are earned after successful hands.

Credits can be used to:

1. Flip a revealed tile during Expand or Finale.
2. Buy power-ups after a passed hand.
3. Refresh the shop.

---

## Initial Credit Rules

| Action | Credits |
|---|---:|
| Start a run | 0 |
| Clear a target | +3 |
| Use all 7 tiles on Finale | +2 |
| Invalid or missing word | +0 for that phase |

Failed and completed runs do not enter the shop.

---

## Flip Tile

During Expand or Finale, the player may spend credits to Flip one revealed tile.

A Flip rerolls that tile into a new random letter.

Example:

```text
A T S E R N L
```

The player Flips `L`.

```text
A T S E R N I
```

Flip is not available during Draft. During Draft, the player shapes their tile pool by choosing which 4 tiles to keep.

---

## Flip Rules

- Flip costs 2 credits.
- Only available during Expand and Finale.
- Only revealed tiles can be Flipped.
- Max 1 Flip per phase.
- Flipped tiles stay changed for the rest of the hand.
- A tile cannot Flip into the same letter.

---

## Shop Phase

After passing a non-final target, the player enters the shop.

Shop rules:

- The shop shows upgrade options.
- The player may buy 1 power-up.
- The player may skip and save credits.
- The player may refresh the shop for 2 credits.
- Buying or skipping starts the next hand.

---

## Word Validation

Allowed:

- Common English words
- Plurals
- Verb forms
- Past tense
- Present participles

Not allowed:

- Proper nouns
- Abbreviations
- Acronyms
- Prefixes or suffixes alone
- Hyphenated words
- Words requiring apostrophes

---

## Invalid Words

If the player submits an invalid word:

- That phase scores 0 points.
- Power-ups do not trigger for that phase.
- The word does not count for credit rewards.

Players may resubmit while the phase is still active.

---

## V1 Scope

In scope:

- Solo run creation.
- Rising target curve.
- Draft discard phase: 10 shown, discard 6, keep 4. No word submitted.
- Expand and Finale word submissions.
- Hand total versus target resolution.
- Credits from successful hands.
- One tile Flip per phase (Expand and Finale only).
- Between-hand shop after passed non-final targets.
- Failed and completed terminal states.

Out of scope:

- 1v1 River Run matches.
- Opponent submissions or opponent scoring.
- First-to-3 hand-win match logic.
- Shared versus shops.
- Real-time phase timers.
- Multiplayer fairness rules.

---

## Recommended MVP Rules

- River Run is solo-only for v1.
- Target curve is `[30, 40, 55, 70, 90, 115, 145, 180]`.
- Each hand has Draft, Expand, and Finale phases.
- Draft shows 10 candidate tiles. Player discards 6, keeps 4. No word submitted.
- Expand reveals 2 random tiles, for 6 total. Player submits one word.
- Finale reveals 1 random tile, for 7 total. Player submits one word.
- Letters can be reused across Expand and Finale.
- Total score across Expand and Finale is the hand total.
- A hand passes when hand total meets or beats the current target.
- A hand fails when hand total is below the current target after Finale.
- Passing the final target completes the run.
- Passing a non-final target enters the shop before the next hand.
- Flip costs 2 credits.
- Max 1 Flip per phase (Expand and Finale only).
