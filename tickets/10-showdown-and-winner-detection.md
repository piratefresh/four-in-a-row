# Ticket 10: Showdown and Winner Resolution (PO-Aligned)

## Objective
Resolve showdown by comparing final submitted words, selecting the winner, and presenting clear end-of-round results.

## Why This Ticket Exists
The game can reach late stages, but a consistent PO-aligned showdown result flow is needed to decide winners and show outcomes clearly.

## PO Alignment
- Showdown occurs after canonical stage flow: `Preflop -> Flop -> Turn -> River -> Final -> Showdown`.
- Showdown compares one final submitted word per eligible player.
- Results should support a clear score breakdown using:
  - Word Length Points
  - Speed Bonus
  - Valid Word Bonus
- Word length points must follow the canonical table (3 points per letter, 2-7 letters).

## Word Length Points Table
- 2 letters = 6 points
- 3 letters = 9 points
- 4 letters = 12 points
- 5 letters = 15 points
- 6 letters = 18 points
- 7 letters = 21 points

## Current State
- Word submissions exist, but final winner resolution is not consistently handled.
- Endgame UI does not consistently show full results and score breakdown.

## Scope
- Read final showdown submissions from game state.
- Compare eligible submissions and determine winner.
- Apply deterministic tie-break behavior.
- Persist winner fields in game state.
- Return and display showdown results with score breakdown and total.
- Ensure result handling runs once and is safe from duplicate completion.

## Out of Scope
- Mid-round betting/turn progression logic.
- Persistent ranking/leaderboard systems.
- Non-essential celebration animations.

## Winner Resolution Rules
- Only eligible showdown submissions are compared.
- Highest total score wins.
- Tie-break order:
  1. Higher Word Length Points
  2. Faster submission time (or configured speed metric)
  3. Deterministic fallback (stable ordering rule)
- Winner is written once to game state and not re-awarded.

## Requirements
- Game must be in completion-ready showdown state before winner resolution.
- Result payload must include:
  - winner identity
  - winning word
  - total score
  - score breakdown (length/speed/valid bonus)
  - all compared submissions
- If no eligible submission exists, return a no-winner outcome gracefully.
- UI must show clear final outcome and all player submissions for transparency.

## Expected Deliverables
- Backend showdown resolution function/mutation.
- Persisted winner fields on game state.
- Query/read model for final results display.
- UI results section with winner and per-submission score breakdown.

## Acceptance Criteria
1. Winner is determined automatically when showdown completes.
2. Highest total score wins using canonical scoring model.
3. Tie-breakers are deterministic and consistently applied.
4. Winner data is persisted on the game record.
5. Results UI shows winner, winning word, total score, and breakdown.
6. Results UI lists all compared submissions and their totals.
7. No-winner case is handled with a clear user-facing outcome.

## Verification Checklist
- Complete a game with valid showdown submissions -> winner is shown correctly.
- Two equal totals -> tie-break rules apply consistently.
- No eligible submissions -> no-winner outcome is shown.
- Score breakdown displays length, speed, valid-word bonus, and total.
- Winner resolution does not run twice for the same game.

## Risks
- Tie-break ambiguity if speed metric is missing/inconsistent.
- Race conditions around completion and result persistence.
- UI/backend mismatch in score breakdown fields.

## Dependencies
- Ticket 8 (submission + validation + scoring data storage).
- Ticket 9 (automatic progression into showdown).
- Canonical scoring definitions from PO docs.

## Done Definition
This ticket is complete when showdown compares final submissions, stores a single deterministic winner result, and presents transparent PO-aligned scoring outcomes in the UI.
