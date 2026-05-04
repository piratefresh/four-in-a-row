# Word Poker: River Run 1v1 Rules Backup

This is the previous 1v1 River Run rules draft, kept for reference while the active v1 implementation target is solo River Run in `word-poker-river-run-rules.md`.

---

# Word Poker: River Run Rules

## Overview

River Run is a 1v1 online Word Poker mode.

Players reveal letter tiles over three phases, make one word each phase, earn points, gain credits, flip tiles, and buy power-ups between hands.

The first player to win 3 hands wins the match.

---

## Match Goal

Win 3 hands before your opponent.

A match can last up to 5 hands.

---

## Hand Structure

Each hand has 7 total tiles.

Tiles are revealed across 3 phases:

1. Deal
2. Turn
3. River

---

## Phase 1: Deal

Reveal 3 tiles.

Each player makes one word using the revealed tiles.

Suggested timer: 15 seconds.

Example:

```text
A T S ? ? ? ?
```

Possible words:

- SAT
- AT
- AS

---

## Phase 2: Turn

Reveal 2 more tiles.

Each player makes one word using any revealed tiles.

Suggested timer: 20 seconds.

Example:

```text
A T S E R ? ?
```

Possible words:

- STARE
- TEARS
- RATES

---

## Phase 3: River

Reveal the final 2 tiles.

Each player makes one word using any revealed tiles.

Suggested timer: 25 seconds.

Example:

```text
A T S E R N I
```

Possible words:

- NASTIER
- RETAINS
- ANTSIER

---

## Letter Reuse Rule

Letters are reusable each phase.

A letter used during Deal can still be used during Turn and River.

Example:

- Deal word: SAT
- Turn word: STARE
- River word: NASTIER

This is allowed.

---

## Scoring

Each phase word gives points.

At the end of the hand, each player's 3 phase scores are added together.

The player with the higher total wins the hand.

Example:

| Phase | Player A | Player B |
|---|---:|---:|
| Deal | 8 | 6 |
| Turn | 22 | 24 |
| River | 48 | 41 |
| Total | 78 | 71 |

Player A wins the hand.

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

Credits are earned after each hand.

Credits can be used to:

1. Flip a revealed tile during a phase.
2. Buy power-ups after a hand.
3. Refresh the shop.

---

## Credit Rewards

| Action | Credits |
|---|---:|
| Submit valid words in all 3 phases | +2 |
| Win a phase | +1 each |
| Win the hand | +3 |
| Lose the hand | +1 |
| Use all 7 tiles on River | +2 |
| Invalid or missing word | +0 for that phase |

---

## Flip Tile

During a phase, a player may spend credits to Flip one revealed tile.

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
- Flipped tiles stay changed for that player for the rest of the hand.
- Each player has their own board after Flips.
- A tile cannot Flip into the same letter.
- Flipping happens during the phase timer.

---

## Shop Phase

After each hand, both players enter the shop.

Shop rules:

- The shop shows 3 power-up options.
- Both players see the same shop options.
- Each player may buy 1 power-up.
- Players may skip and save credits.
- Players may refresh the shop for 2 credits.
- Suggested shop timer: 20 seconds.

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

If a player submits an invalid word:

- That phase scores 0 points.
- Power-ups do not trigger.
- The word does not count for credit rewards.

Players may resubmit while the timer is still running.

---

## Fairness Rules

Both players get:

- The same starting tiles.
- The same reveal order.
- The same phase timers.
- The same shop options.
- The same scoring rules.
- The same dictionary validation.

Players differ by:

- Words submitted.
- Tile Flips used.
- Credits spent.
- Power-ups purchased.

---

## Recommended MVP Rules

- 1v1 online mode.
- First to 3 hands wins.
- Each hand has Deal, Turn, and River phases.
- Deal reveals 3 tiles.
- Turn reveals 2 more tiles.
- River reveals final 2 tiles.
- Players submit one word per phase.
- Letters can be reused each phase.
- Total score across all 3 phases wins the hand.
- Credits are earned after each hand.
- Flip costs 2 credits.
- Max 1 Flip per phase.
- Shop appears after each hand.
- Shop has 3 shared power-up options.
- Players may buy 1 power-up or skip.
