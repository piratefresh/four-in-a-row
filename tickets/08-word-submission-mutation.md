# Ticket 8: Word Submission Backend Support

## Objective
Enable players to submit words during active rounds, validate those words via API, and store the results in game state for later showdown comparison.

## Why This Ticket Exists
Players can currently build words in the UI, but the game does not yet persist submissions or update round state after a submission. This blocks the core play loop.

## Current State
- Players can prepare a word in the room UI.
- Basic word validation exists on the frontend.
- No backend flow currently records submissions, scores, or player action state.

## Scope
- Add backend support for submitting a word during a live game.
- Ensure a submission is only accepted when the game and player state allow it.
- Validate submitted words through the Dictionary API during submission.
- Save each accepted submission into game state with normalized data for scoring and audit/history.
- Calculate and store score data for each submitted word.
- Update the player's round/action state after a successful submission.
- Ensure the frontend uses the backend submission flow.

## Out of Scope
- Dictionary quality or word legitimacy rules beyond API pass/fail for this ticket.
- Round winner determination and final showdown comparison logic.
- Turn progression and betting flow changes beyond recording that a player acted.

## Requirements
- Submission must be tied to a specific game and player.
- Submission must only be accepted during valid game status/stage.
- Submission must call Dictionary API validation before being accepted.
- Submission must include the tiles used and reject invalid tile combinations.
- Community tiles can only be used when available/revealed.
- A tile cannot be counted multiple times in one submitted word.
- Stored words should use a consistent format (lowercase).
- Stored score should be a non-negative whole number.
- Stored submission data should include fields needed later for showdown comparison.

## Scoring System (PO-Aligned)
Use the canonical scoring model for each accepted submission:
- Word Length Points
- Speed Bonus
- Valid Word Bonus

### Word Length Points Table
Use 3 points per letter:
- 2 letters = 6 points
- 3 letters = 9 points
- 4 letters = 12 points
- 5 letters = 15 points
- 6 letters = 18 points
- 7 letters = 21 points

### Scoring Output Requirements
- Store total score for each submission.
- Store or return a score breakdown that includes length, speed, and valid-word bonus.
- Keep scoring behavior consistent with PO guides across backend and frontend.
- Ensure stored submission data can be consumed directly by showdown comparison logic in a later ticket.

## Expected Deliverables
- Data model support for storing word submissions.
- Backend mutation/action for submitting a word.
- Dictionary API validation integrated into backend submission flow.
- Scoring logic applied consistently on submission.
- Frontend wired to call the backend submission flow and surface success/errors.
- Score breakdown support for round-end display (length/speed/valid bonus).

## Acceptance Criteria
1. A word submission record is created for successful submissions.
2. Submissions are rejected when it is not the player's turn or state is invalid.
3. Submissions are validated against Dictionary API before acceptance.
4. Tile usage is validated against player and community availability.
5. Score is calculated using PO-aligned scoring (length + speed + valid bonus) and stored for each accepted word.
6. Player round/action state is updated after successful submission.
7. Frontend receives clear success and error responses.
8. Stored submission data can be used later for showdown comparison without re-shaping.

## Verification Checklist
- Submit a valid word on the active player's turn -> success.
- Submit when it is not your turn -> rejected with clear error.
- Submit an invalid dictionary word -> rejected with clear error.
- Submit with invalid or unavailable tiles -> rejected with clear error.
- Submit after folding -> rejected with clear error.
- Confirm submission appears in stored records with expected total score.
- Confirm 2-7 letter words map to the correct length points from the table.
- Confirm scoring breakdown includes length, speed, and valid-word bonus values.
- Confirm stored submission shape includes fields required for later showdown comparison.

## Risks
- Concurrent submissions creating race-condition edge cases.
- Dictionary API outages or latency impacting submission responsiveness.
- Incorrect tile validation allowing duplicate or unavailable tile use.
- Scoring inconsistencies if logic is duplicated across layers.

## Dependencies
- Core game and room setup is in place.
- Frontend word-building flow is available.
- Dictionary API integration is available and reachable from backend flow.

## Done Definition
This ticket is complete when a player can submit a word from the UI, the backend validates it via Dictionary API, stores validated submission plus scoring data in game state, and updates the player's action state for the round.
