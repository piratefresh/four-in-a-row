# Word Poker: River Run Solo Rules

## Overview

River Run v1 is a solo Word Poker run.

The player plays a sequence of hands against a rising target score. Each hand has Deal, Turn, and River phases. The player submits one word per phase, the three phase scores are added into a hand total, and the hand total is compared to the current target.

This rebuild is solo-only. 1v1 versus matches, opponent scoring, shared shops, hand-win races, and first-to-3 match logic are out of scope for the v1 River Run rebuild.

---

## Run Goal

Clear every target in the target curve before missing one.

Initial target curve:

```text
[45, 55, 70, 85, 105, 130, 160, 195]
```

The first hand uses target `45`. Each passed hand advances to the next target.

---

## Run States

| State | Meaning |
|---|---|
| Active | The player is currently playing Deal, Turn, or River. |
| Shop | The player cleared a target and may buy or skip an upgrade before the next hand. |
| Failed | The player finished River with a hand total below the current target. |
| Completed | The player cleared the final target in the curve. |

---

## Pass, Fail, and Completion

A hand passes when the River phase resolves and:

```text
Hand Total >= Current Target
```

A hand fails when the River phase resolves and:

```text
Hand Total < Current Target
```

Passing a non-final target moves the run into the Shop state. After the player buys or skips, the next hand starts with the next target in the curve.

Passing the final target completes the run. Failed and completed runs are terminal until the player starts a new run.

---

## Hand Structure

Each hand has 7 total tiles.

Tiles are revealed across 3 phases:

1. Deal
2. Turn
3. River

The player submits one word per phase.

---

## Phase 1: Deal

Reveal 4 tiles.

The player makes one word using the revealed tiles.

Example:

```text
A T S R ? ? ?
```

Possible words:

- STAR
- RATS
- SAT

---

## Phase 2: Turn

Reveal 2 more tiles, for 6 total revealed tiles.

The player makes one word using any revealed tiles.

Example:

```text
A T S R E N ?
```

Possible words:

- RATES
- TEARS
- ASTERN

---

## Phase 3: River

Reveal the final tile, for all 7 tiles.

The player makes one word using any revealed tiles.

Example:

```text
A T S E R N I
```

Possible words:

- NASTIER
- RETAINS
- ANTSIER

After the River word is submitted, the hand total is resolved against the current target.

---

## Letter Reuse Rule

Letters are reusable across phases.

A letter used during Deal can still be used during Turn and River.

Example:

- Deal word: STAR
- Turn word: ASTERN
- River word: NASTIER

This is allowed.

Within a single submitted word, the word can only use letters that are available in the currently revealed tiles.

---

## Scoring

Each phase word gives points.

At the end of the hand, the 3 phase scores are added together.

Example:

| Phase | Word | Score |
|---|---|---:|
| Deal | STAR | 8 |
| Turn | ASTERN | 22 |
| River | NASTIER | 48 |
| Total |  | 78 |

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

1. Flip a revealed tile during a phase.
2. Buy power-ups after a passed hand.
3. Refresh the shop.

---

## Initial Credit Rules

| Action | Credits |
|---|---:|
| Start a run | 0 |
| Clear a target | +3 |
| Use all 7 tiles on River | +2 |
| Invalid or missing word | +0 for that phase |

Failed and completed runs do not enter the shop.

---

## Flip Tile

During a phase, the player may spend credits to Flip one revealed tile.

A Flip rerolls that tile into a new letter.

Example:

```text
A T S E R N L
```

The player Flips `L`.

```text
A T S E R N I
```

---

## Flip Rules

- Flip costs 2 credits.
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
- Deal, Turn, and River submissions.
- Hand total versus target resolution.
- Credits from successful hands.
- One tile Flip per phase.
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
- Target curve is `[45, 55, 70, 85, 105, 130, 160, 195]`.
- Each hand has Deal, Turn, and River phases.
- Deal reveals 4 tiles.
- Turn reveals 2 more tiles, for 6 total.
- River reveals the final tile, for 7 total.
- The player submits one word per phase.
- Letters can be reused across phases.
- Total score across all 3 phases is the hand total.
- A hand passes when hand total meets or beats the current target.
- A hand fails when hand total is below the current target after River.
- Passing the final target completes the run.
- Passing a non-final target enters the shop before the next hand.
- Flip costs 2 credits.
- Max 1 Flip per phase.
