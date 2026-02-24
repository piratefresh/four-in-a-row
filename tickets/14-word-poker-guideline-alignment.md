# Ticket 14: Word Poker Guideline Alignment

**Status**: Not Started
**Priority**: High
**Epic**: Game Mechanics Refinement

## Overview

Align the current implementation with the Word Poker Prototype Rules & Guidelines to ensure consistent betting mechanics, ante system, and scoring that matches the reference implementation.

## Current State vs Guidelines

### ✅ Already Correct
- Stage progression: `preflop → flop → turn → river → final → showdown`
- Community tile reveals: `0 → 2 → 3 → 4 → 5` (increments: `+2, +1, +1, +1`)
- Letter values and distribution (Scrabble-based)
- Word validation (CSW dictionary, min 2 letters, must use private tile)
- Multipliers: `2L` and `3L` on community tiles
- Showdown-only word submissions
- Win by default when all others fold

### ⚠️ Missing/Incorrect

#### 1. Ante System
**Guideline**: Each player pays ante (`MIN_LEVEL = 20`) at hand start
**Current**: No ante system, pot starts at 0
**Impact**: Players can play without initial investment

#### 2. Fixed Raise Ladder
**Guideline**: Fixed bet levels `[20, 40, 60, 80, 100, 120, 140, 160, 200]`
**Current**: Arbitrary raise amounts allowed
**Impact**: No standardized betting structure

#### 3. Raise Cap Per Round
**Guideline**: Max 3 raises per betting round
**Current**: Unlimited raises allowed
**Impact**: Betting rounds can run indefinitely

#### 4. Final Stage Betting
**Guideline**: `final` stage has NO betting round
**Current**: `final` stage likely includes betting
**Impact**: Extra unnecessary betting round

#### 5. Scoring System
**Guideline**: Sum of letter values + multipliers only
**Current**: Length points (3/letter) + speed bonus + valid word bonus
**Impact**: Scoring is more complex than reference

## Tasks

### Task 1: Implement Ante System
- [ ] Add `ANTE_AMOUNT = 20` constant
- [ ] Deduct ante from each player's chips at game start
- [ ] Set initial pot to `ANTE_AMOUNT * playerCount`
- [ ] Update `startGame` mutation to collect antes
- [ ] Add ante validation (players must have sufficient chips)
- [ ] Update UI to show ante deduction

### Task 2: Implement Fixed Raise Ladder
- [ ] Add `RAISE_LADDER = [20, 40, 60, 80, 100, 120, 140, 160, 200]` constant
- [ ] Update `raise` mutation to only accept values from ladder
- [ ] Raise button always goes to next level in ladder
- [ ] Handle case when already at max level (200)
- [ ] Update UI to show "Raise to $X" with next ladder level
- [ ] Remove arbitrary raise input

### Task 3: Implement Raise Cap
- [ ] Add `raisesThisRound` counter to game state
- [ ] Increment on each raise action
- [ ] Reset to 0 on stage transitions
- [ ] Max 3 raises per betting round (`MAX_RAISES_PER_ROUND = 3`)
- [ ] Disable raise button when limit reached
- [ ] Update UI to show raise count or disable appropriately

### Task 4: Skip Betting in Final Stage
- [ ] Update `advanceStage` to skip betting when entering `final`
- [ ] Automatically progress `final → showdown` after tile reveal
- [ ] OR mark `final` as non-betting stage in stage progression logic
- [ ] Update UI to not show betting buttons during `final`
- [ ] Show message: "Final tile revealed - proceed to showdown"

### Task 5: Scoring System Decision
**Note**: Current system has extra features not in guideline.

**Option A**: Align to guideline (letter values + multipliers only)
- [ ] Remove `lengthPoints` calculation
- [ ] Remove `speedBonus` calculation
- [ ] Remove `validWordBonus`
- [ ] Only sum letter base values with multipliers

**Option B**: Keep current enhanced system
- [ ] Document as intentional divergence from guideline
- [ ] Update scoring display to clearly show breakdown
- [ ] Keep current 3 points/letter + bonuses

**Decision needed**: Which scoring system to use?

## Technical Changes

### Schema Updates
```typescript
// games table
games: defineTable({
  // ... existing fields
  raisesThisRound: v.number(), // NEW: track raise count
})
```

### Constants to Add
```typescript
// gameState.ts
export const ANTE_AMOUNT = 20;
export const RAISE_LADDER = [20, 40, 60, 80, 100, 120, 140, 160, 200];
export const MAX_RAISES_PER_ROUND = 3;
```

### Mutations to Update
- `startGame` - collect antes
- `raise` - enforce ladder and cap
- `advanceStage` - reset raise counter, skip final betting
- `handlePostActionProgression` - handle final stage skip

## Acceptance Criteria

### Ante System
- [ ] Each player pays 20 chips ante at game start
- [ ] Pot correctly initialized to `20 * playerCount`
- [ ] Players with insufficient chips cannot join
- [ ] UI shows ante deduction

### Fixed Raise Ladder
- [ ] Raises only to ladder levels: 20, 40, 60, 80, 100, 120, 140, 160, 200
- [ ] UI shows next valid raise amount
- [ ] Cannot raise above 200
- [ ] Raise button disabled at max level

### Raise Cap
- [ ] Max 3 raises per betting round
- [ ] Counter resets on stage transitions
- [ ] Raise button disabled after 3rd raise
- [ ] UI indicates raise limit reached

### Final Stage Flow
- [ ] `final` stage reveals 5th community tile
- [ ] No betting round in `final` stage
- [ ] Automatically progresses to `showdown`
- [ ] UI shows "Final tile revealed" message

### Scoring (if Option A chosen)
- [ ] Score = sum of letter values only
- [ ] Multipliers (2L, 3L) applied correctly
- [ ] No length/speed/valid bonuses
- [ ] UI shows letter-by-letter breakdown

## Testing

### Manual Test Cases
1. **Ante Collection**
   - Start game with 3 players (1000 chips each)
   - Verify pot = 60, each player has 980 chips

2. **Fixed Raises**
   - At preflop with bet=0, raise goes to 20
   - At bet=20, raise goes to 40
   - At bet=200, raise button disabled

3. **Raise Cap**
   - Player A raises to 20 (1st)
   - Player B raises to 40 (2nd)
   - Player C raises to 60 (3rd)
   - Player A can only call/fold (raise disabled)

4. **Final Stage Skip**
   - Reach `final` stage
   - 5th tile revealed
   - No betting buttons shown
   - Auto-advance to showdown

5. **Scoring**
   - Submit "CAT" (C=3, A=1, T=1)
   - Score = 5 points (if Option A)
   - Multiplier on C (2L) → 6+1+1 = 8 points

## Open Questions

1. **Scoring System**: Keep enhanced scoring or align to simple letter-sum?
2. **UI for Raise Limit**: Show count "Raises: 2/3" or just disable when reached?
3. **Final Stage Message**: What should UI display during final stage?
4. **Ante Insufficient Funds**: Prevent game start or allow partial antes?

## Dependencies
- Ticket 9: Turn advancement logic (completed)
- Ticket 13: Betting rounds state machine (if exists)

## Estimated Effort
- **Small** (4-6 hours) if keeping enhanced scoring
- **Medium** (6-8 hours) if switching to simple scoring + full testing

## Notes
- Player count flexibility (1-6 players) is intentionally kept different from guideline (fixed 6)
- Current implementation is more flexible in some areas
- This ticket focuses on betting mechanics alignment only
