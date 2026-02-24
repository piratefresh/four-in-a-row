# Ticket 13: Betting Rounds

## Overview
Add poker-style betting to the game. Players bet chips before seeing community tiles revealed.

## How Betting Works

### Game Flow
1. **Hand starts** - Each player gets their private letter tiles, no community tiles visible yet
2. **Preflop betting** - Players bet before seeing any community tiles
3. **Flop** - 2 community tiles revealed → betting round
4. **Turn** - 1 more community tile revealed → betting round
5. **River** - 1 more community tile revealed → betting round
6. **Final** - Last community tile revealed → betting round
7. **Showdown** - Players submit words, winner determined

### Betting Actions

**Check** - Pass with no bet
- Only allowed if no one has bet yet, or you already matched the current bet

**Call** - Match the current bet
- You pay chips to match what others have bet
- Example: Current bet is 50, you've bet 20, calling costs you 30 more chips

**Raise** - Increase the bet
- Forces all other players to act again
- Example: Current bet is 50, you raise to 100, now everyone must call 100 or fold

**Fold** - Give up this hand
- You lose any chips you've already bet this hand
- You're out until the next hand starts

### When Does a Betting Round End?

A betting round ends when **both** of these are true:
1. Every player still in the hand has acted
2. Everyone's bet amounts match

**Examples:**

✅ **Round ends:**
- Player A checks, Player B checks → both acted, both bet 0

✅ **Round ends:**
- Player A bets 50, Player B calls 50 → both acted, both bet 50

❌ **Round continues:**
- Player A bets 50, Player B hasn't acted yet → Player B needs to act

❌ **Round continues:**
- Player A bets 50, Player B calls 50, Player C raises to 100 → Player A and B must act again (their bets don't match anymore)

### The Raise "Reopens" Rule

**This is critical:** When someone raises, all other players must act again, even if they already checked or called.

Example flow:
1. Player A checks (hasActed = true)
2. Player B checks (hasActed = true)
3. Player C raises to 50 (hasActed = true, BUT resets A and B's hasActed to false)
4. Now Player A must act again (call/raise/fold)
5. Then Player B must act again
6. Round only ends when all three have acted AND all match 50 (or fold)

### Stage Advancement

**Automatic** - No manual "next stage" button.

When betting round completes:
- Reveal next community tiles (2→1→1→1→0)
- Reset everyone's "acted this round" to false
- Reset everyone's "bet this round" to 0
- Start new betting round
- Turn goes back to first player

## What Needs to Be Built

### Backend (Convex)
- Add chip tracking (each player starts with 1000 chips)
- Track current bet amount (the number everyone must match)
- Track each player's bet this round vs. total bet
- Track if each player has acted this round
- Create check/call/raise/fold mutations
- Auto-advance stage when betting round completes
- Remove manual "advance stage" button/mutation

### Frontend (UI)
- Show 4 buttons when it's your turn: Check/Call/Raise/Fold
- Check button only shows if you can check (no bet to call)
- Call button shows amount needed: "Call 50"
- Raise input to enter amount
- Show your chips, pot size, current bet
- Show what other players did: "Alice: raised to 100"

## Example Full Hand

```
START HAND
├─ Deal private tiles to Player 1 and Player 2
├─ Stage: Preflop (0 community tiles visible)
│
PREFLOP BETTING
├─ Player 1's turn: Raises to 50
│  ├─ Player 1: -50 chips, bet=50, hasActed=true
│  ├─ Player 2: hasActed=false (must respond to raise)
│  └─ Current bet: 50
├─ Player 2's turn: Calls 50
│  ├─ Player 2: -50 chips, bet=50, hasActed=true
│  └─ Betting round complete ✓ (both acted, both bet 50)
│
AUTO-ADVANCE TO FLOP
├─ Reveal 2 community tiles
├─ Reset: hasActed=false, betThisRound=0 for both
├─ Stage: Flop (2 community tiles)
│
FLOP BETTING
├─ Player 1's turn: Checks
│  └─ hasActed=true, betThisRound=0
├─ Player 2's turn: Checks
│  └─ hasActed=true, betThisRound=0
│  └─ Betting round complete ✓ (both acted, both bet 0)
│
AUTO-ADVANCE TO TURN
├─ Reveal 1 community tile
├─ Stage: Turn (3 community tiles)
│
[... continues through River, Final, Showdown]
```

## Current vs. New Flow

**Currently:**
1. Players can only "skip round" (fold with penalty)
2. Manual "Advance Stage" button reveals tiles
3. No chip betting

**After this ticket:**
1. Players bet chips with check/call/raise/fold
2. Stage advances **automatically** when betting completes
3. Full poker betting experience before word submission

## Dependencies
- Tickets 1-2 (schema and game creation already done)
- Word submission will come AFTER all betting rounds complete (Ticket 8)
