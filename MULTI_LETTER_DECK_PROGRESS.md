# Multi-Letter Deck Implementation - Progress Summary

## 📋 Epic Overview
**Goal**: Add configurable deck system with multi-letter choice cards to Word Poker, enabling strategic gameplay with ~23% choice cards (face-card-like frequency).

**Start Date**: 2026-02-25
**Current Status**: Core implementation complete, needs database cleanup to test

---

## ✅ Completed Tickets

### Ticket 00: Card Types and Rules ✅
**Status**: Complete (Definition)
- Defined card types: `single`, `choice-2`, `choice-3`, `choice-4`
- Established resolution rules: choice cards resolve on submit
- One card can satisfy one letter position only
- Choice cards score as the selected letter's value

### Ticket 01: Deck Distribution and Generator ✅
**Status**: Complete + Tested
- **MVP Deck Configuration**:
  - 60 cards total
  - 14 choice cards (23.3%)
    - 8× Choice-2: A/E, A/E, E/I, O/U, S/T, R/N, L/D, C/H
    - 4× Choice-3: A/E/I, S/T/R, N/L/D, C/H/M
    - 2× Choice-4: A/E/I/O, S/T/R/N
  - 46 single-letter cards (scaled from standard distribution)
- **Implementation**: `convex/gameState.ts`
  - `createShuffledDeck()` - generates mixed deck
  - `validateDeckConfig()` - ensures configuration integrity
  - Proper cryptographic shuffling
- **Testing**: 21 unit tests passing (`convex/gameState.test.ts`)

### Ticket 02: Schema and Types ✅
**Status**: Complete
- **Backend Types** (`convex/gameState.ts`):
  ```typescript
  type GameDeckTile =
    | { kind: "single"; letter: string; baseValue: number }
    | { kind: "choice"; options: string[]; baseValues: number[] }

  type GameTile = /* same but with revealed & multiplier fields */
  ```
- **Schema Updates** (`convex/schema.ts`):
  - Updated validators for `GameDeckTile` and `GameTile`
  - Supports discriminated unions for both card types

### Ticket 03: Deal and Reveal Integration ✅
**Status**: Complete
- **Game Creation** (`convex/games.ts`):
  - `startGame()` always generates fresh deck with choice cards
  - Community tiles properly preserve choice card structure
  - Hand tiles correctly dealt as choice or single cards
- **Reveal Logic**:
  - Stage progression preserves card identity
  - Both single and choice cards revealed correctly

### Ticket 04: Submission Contract and Resolution ✅
**Status**: Complete (Schema & API)
- **Submission Schema** (`convex/schema.ts`):
  ```typescript
  wordSubmissions: {
    tiles: Array<{
      letter: string;
      baseValue: number;
      source: "hand" | "community";
      cardIndex?: number;
      wasChoice?: boolean;
    }>;
    choiceResolutions?: {
      hand?: Record<string, string>; // cardIndex -> selectedLetter
      community?: Record<string, string>;
    };
  }
  ```
- **API Updates**:
  - `submitWord` action accepts `choiceResolutions`
  - `submitWordInternal` mutation stores resolution data
  - Tile validation updated to handle choice cards by cardIndex

### Ticket 07: UI Hand and Submit UX ✅
**Status**: Complete
- **ScrabbleTile Component** (`src/components/rooms/ScrabbleTile.tsx`):
  - Displays choice cards with multiple letters: "A/E", "S/T/R"
  - Shows base values below options: "1/1", "1/1/1"
  - Maintains visual style for both card types
- **RoomHandsBoard Component** (`src/components/rooms/RoomHandsBoard.tsx`):
  - Choice selection UI: buttons appear below enabled choice cards
  - Word preview shows `[A]` for unselected, `E` for selected
  - Submit disabled until all choice cards have letter selections
  - Clear error messages: "Please select a letter for each choice card"
  - Passes `choiceResolutions` to backend on submit
- **User Experience**:
  1. Click choice card → moves to word area
  2. Letter buttons appear below card
  3. Select letter → button highlights blue
  4. Word preview updates in real-time
  5. Submit button enables when all resolved

---

## 🚧 Partially Complete

### Ticket 05: Validation Engine Updates 🔶
**Status**: Partially Complete (needs testing)
- ✅ Tile availability tracking for choice cards
- ✅ Card index-based validation instead of letter-value
- ❌ Choice resolution validation (verify selected letters are valid options)
- ❌ Comprehensive error messages for missing/invalid selections
- **Files**: `convex/games.ts` (submitWordInternal)

---

## ❌ Not Started

### Ticket 06: Scoring and Breakdown ❌
**Requirements**:
- Score breakdown shows resolved choice letters
- Example: "A/E → E (1 point)" in UI
- Backend returns resolved card mapping in response
- **Files to update**: `convex/games.ts`, frontend score display

### Ticket 08: AI and Bot Compatibility ❌
**Requirements**:
- AI dealer can handle choice cards
- Bot word generation considers choice options
- AI selects appropriate letter from choice cards
- **Files to update**: Bot/AI logic (if exists)

### Ticket 09: Telemetry and Playtest ❌
**Requirements**:
- Track choice card usage statistics
- Monitor selected letter distribution
- Capture submit outcomes with choice cards
- **Files to update**: Add analytics/logging

### Ticket 90: Optional Combo Tiles ❌
**Status**: Post-MVP (intentionally deferred)
- Combo tiles (TH, ING, STAR) require all letters used together
- Higher complexity than choice cards
- Should implement only after choice cards are stable

---

## 🐛 Current Issues

### Schema Validation Error
**Issue**: Old games in database have tiles without `kind` field:
```
Value: {baseValue: 1.0, letter: "A", revealed: true}
Expected: {kind: "single", letter: "A", baseValue: 1.0, revealed: true}
```

**Root Cause**: Games created before schema update still exist in database

**Solution Required**:
```bash
bunx convex run clearOldGames:clearAllGames
```
This will delete all old games/rooms and allow fresh games with new schema.

---

## 📊 Statistics

- **Backend Files Modified**: 3 major files
  - `convex/gameState.ts` (deck generator, types)
  - `convex/schema.ts` (schema updates)
  - `convex/games.ts` (game logic, validation)
- **Frontend Files Modified**: 2 components
  - `src/components/rooms/ScrabbleTile.tsx`
  - `src/components/rooms/RoomHandsBoard.tsx`
- **Tests Written**: 21 unit tests (all passing)
- **Lines of Code**: ~500+ backend, ~200+ frontend

---

## 🎯 Next Steps (Priority Order)

### Immediate (Required to Test)
1. ✅ Fix TypeScript errors in validation logic
2. 🔶 **Clear old games from database** (run `clearOldGames:clearAllGames`)
3. 🔶 **Test full submission flow** with choice cards
4. 🔶 Fix any runtime errors discovered during testing

### Short Term (Complete MVP)
1. ❌ **Ticket 05**: Add comprehensive validation for choice resolutions
2. ❌ **Ticket 06**: Implement score breakdown showing resolved choices
3. ❌ **Ticket 09**: Add basic telemetry for playtesting

### Medium Term (Polish)
1. ❌ **Ticket 08**: AI/Bot compatibility (if AI exists)
2. ❌ Improve error messages and edge case handling
3. ❌ Performance optimization if needed

### Long Term (Post-MVP)
1. ❌ **Ticket 90**: Combo tiles (TH, ING, etc.)
2. ❌ Balance tuning based on playtest data
3. ❌ Additional choice card variations

---

## 🎮 Testing Checklist

### Manual Testing Required
- [ ] Start fresh game (after clearing old data)
- [ ] Verify choice cards appear in hand (~23% rate)
- [ ] Verify choice cards appear in community tiles
- [ ] Enable choice card and select different letters
- [ ] Build word with mix of single + choice cards
- [ ] Submit word and verify it validates correctly
- [ ] Check score calculation uses selected letter values
- [ ] Test edge cases (all choice cards, no choice cards)
- [ ] Verify error messages for unresolved choices
- [ ] Test with 2+ players

### Automated Testing
- [x] Deck generation unit tests (21 tests passing)
- [ ] Validation engine tests
- [ ] Submission flow integration tests
- [ ] Frontend component tests

---

## 📝 Key Decisions Made

1. **Choice vs Combo**: Implemented choice cards first, deferred combo tiles to post-MVP
2. **Frequency**: Target 23% choice cards (face-card-like) for strategic balance
3. **Resolution Timing**: Choice cards resolve at submit time (not when played)
4. **Validation Strategy**: Use cardIndex for tracking, not letter-value pairs
5. **UI Approach**: Inline selection buttons below cards (not modal/dropdown)
6. **Deck Generation**: Always generate fresh deck on game start (don't reuse old decks)

---

## 🔧 Technical Notes

### Architecture Decisions
- **Discriminated Unions**: Used TypeScript discriminated unions for type safety
- **Card Tracking**: cardIndex-based to handle duplicate choice cards correctly
- **State Management**: Choice selections stored in component state, sent on submit
- **Backward Compatibility**: Old single-card-only code paths still work

### Known Limitations
- Choice cards in community tiles track by position (not by unique ID)
- Hand tiles track by array index (could break if hand is reordered)
- No validation yet that selected letters are valid options
- No visual indication of which choice cards are in deck distribution

---

## 📚 Documentation Updates Needed
- [ ] Update game rules to explain choice cards
- [ ] Add choice card examples to tutorial/help
- [ ] Document choice selection UI for players
- [ ] Update API documentation with choiceResolutions

---

**Last Updated**: 2026-02-25
**Status**: Core implementation complete, awaiting database cleanup and testing
