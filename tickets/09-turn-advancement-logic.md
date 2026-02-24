# Ticket 9: Automatic Turn and Stage Progression (PO-Aligned)

## Objective
Automatically move the game to the next player and next stage after player actions, using the canonical Word Poker flow.

## Why This Ticket Exists
Players can act, but progression still depends on manual behavior in some paths. The game should advance reliably without manual stage controls.

## PO Alignment
- Stage names must be: `Preflop`, `Flop`, `Turn`, `River`, `Final`, `Showdown`.
- Community reveal flow must be: `0 -> 2 -> 3 -> 4 -> 5` total visible community letters.
- Action language in UI should stay outcome-based:
  - `Add [X] Points to Prize Pool`
  - `Match [X] Points`
  - `Skip Round (Lose [X] Points)`

## Current State
- Turn movement is inconsistent across action paths.
- Stage advancement is not fully automatic.
- Manual stage controls are still present for testing.

## Scope
- Advance turn automatically after each completed player action.
- Advance stage automatically when all active players have acted.
- Apply canonical reveal counts per stage transition.
- Reset per-stage action flags when entering a new stage.
- End round early if only one non-folded player remains.
- Remove or disable manual stage-advance controls in room UI.

## Out of Scope
- Word validation and scoring math details.
- Showdown winner comparison and tie-break logic.
- AI player decision-making.
- Timer behavior changes.

## Canonical Stage Progression Rules
1. `Preflop`: 0 community letters visible, betting/actions active.
2. `Flop`: reveal 2 community letters, betting/actions active.
3. `Turn`: reveal 1 more (3 total), betting/actions active.
4. `River`: reveal 1 more (4 total), betting/actions active.
5. `Final`: reveal 1 more (5 total), no betting.
6. `Showdown`: final word comparison flow.

## Requirements
- Turn can only move to active (non-folded) players.
- Stage can only advance after all active players have acted for the current stage.
- On stage change, all active-player `hasActed` flags reset for the new stage.
- If one player remains active, round ends immediately.
- Transition from `Final` must move into `Showdown` state correctly.
- Manual stage advance controls are not available in normal gameplay.

## Expected Deliverables
- Shared backend helper(s) for turn advancement and stage readiness checks.
- Unified stage advancement path used by both submit and skip/fold actions.
- Canonical reveal logic tied to stage transitions.
- UI update to remove manual stage progression button in normal flow.

## Acceptance Criteria
1. After a player action, turn moves automatically to the next active player.
2. When all active players have acted, stage advances automatically.
3. Community letters reveal on canonical schedule (`0 -> 2 -> 3 -> 4 -> 5`).
4. `hasActed` state resets correctly on each stage transition.
5. Round ends early when only one active player remains.
6. Flow reaches `Showdown` automatically after `Final` stage completion.
7. Manual stage-advance button is removed or disabled in normal game mode.

## Verification Checklist
- Two active players both act in a stage -> stage auto-advances.
- One player acts and one skips/folds -> progression still behaves correctly.
- Turn never advances to folded players.
- Stage labels follow exact canonical names.
- Community reveal count is correct at each stage boundary.
- Final stage completes and transitions to showdown path automatically.

## Risks
- Race conditions when players act nearly simultaneously.
- Incorrect stage transition ordering causing reveal mismatch.
- Action-state reset bugs causing premature or blocked advancement.

## Dependencies
- Ticket 8 (submission records and action updates).
- Core game state model and stage enums in backend.
- Ticket 10 for showdown comparison and winner resolution.

## Done Definition
This ticket is complete when turns and stages progress automatically, the canonical reveal/stage flow is enforced, and gameplay no longer depends on manual stage controls.
