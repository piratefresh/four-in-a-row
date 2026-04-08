# WORD POKER - COMPLETE GAME RULES

**A strategic word-building poker game combining letter tiles, betting mechanics, and vocabulary skills**

---

## TABLE OF CONTENTS
1. [Game Overview](#game-overview)
2. [Letter Values & Scoring System](#letter-values--scoring-system)
3. [Two-Letter Choice Tiles](#two-letter-choice-tiles)
4. [Game Setup](#game-setup)
5. [Round Phases](#round-phases)
6. [Betting Actions](#betting-actions)
7. [Word Building Rules](#word-building-rules)
8. [Winning & Tie-Breakers](#winning--tie-breakers)
9. [UI Features](#ui-features)
10. [Game Variations](#game-variations)
11. [Tournament & Cash Games](#tournament--cash-games)

---

## GAME OVERVIEW

Word Poker is a multiplayer word game that combines poker-style betting with strategic word building. Players receive private letter tiles and share community tiles, betting on their ability to form high-scoring words. The highest-scoring valid word wins the pot.

**Core Concept:**
- 4-6 players compete each round
- Poker-style betting phases (Pre-Flop, Flop, Turn, River)
- Build words using private + community tiles
- Highest scoring word wins all chips in the pot

---

## LETTER VALUES & SCORING SYSTEM

### Letter Point Values

| Points | Letters |
|--------|---------|
| **1**  | A, E, I, O, U |
| **2**  | R, S, T, L, N |
| **3**  | D, G |
| **4**  | B, C, M, P |
| **5**  | F, H, V, W, Y, K |
| **8**  | J, X |
| **10** | Q, Z |

### How to Calculate Score

**Step 1: Base Score**
- Add up all letter values in the word
- Example: **MARKET** = M(4) + A(1) + R(2) + K(5) + E(1) + T(2) = **15 points**

**Step 2: Double Letter Multipliers**
- 15% chance any tile is "doubled" (2L multiplier)
- Favors high-value letters (5+ points)
- When a letter has a 2L multiplier, that letter's value is doubled
- Example: **MUSE** with S doubled = M(4) + U(1) + S(2×2) + E(1) = **9 points**

**Step 3: Triple Letter Multipliers**
- Some tiles may have "tripled" (3L multiplier)
- That letter's value is tripled
- Example: **CAT** with C tripled = C(3×3) + A(1) + T(2) = **12 points**

**Step 4: Full Rack Bonus**
- Use all 7 tiles = **+10 bonus points**
- Example: **MONSTER** (7 letters) = base score + 10

### Complete Scoring Example: MONSTER

**Word:** MONSTER (7 letters)

**Letter Values:**
- M = 4 points
- O = 1 point
- N = 2 points
- S = 2 points
- T = 2 points
- E = 1 point
- R = 2 points

**Step 1:** Base Score (no bonuses)
- M(4) + O(1) + N(2) + S(2) + T(2) + E(1) + R(2) = **14 points**

**Step 2:** Apply Double Letter Bonus (M is doubled)
- M = 4 × 2 = 8 points (instead of 4)
- M(8) + O(1) + N(2) + S(2) + T(2) + E(1) + R(2) = **18 points**

**Step 3:** Apply Full Rack Bonus (all 7 tiles used)
- 18 points + 10 bonus = **28 points FINAL**

### Word Validation

✓ **Valid Words:**
- Must be 2-7 letters
- Must be in Scrabble dictionary (TWL or SOWPODS)

✗ **Invalid Words = 0 Points:**
- Not in dictionary
- Timeout (no word submitted)
- Less than 2 letters or more than 7 letters

**Note:** There is **NO TIMER BONUS** for this game.

---

## TWO-LETTER CHOICE TILES

### What Are Choice Tiles?

Choice tiles display **2 letters on a single tile** (e.g., "A/E", "T/H", "R/N"). The player chooses which letter to use when building their word.

**Key Points:**
- Counts as **1 tile** but gives you **2 letter options**
- Both letters are clearly visible
- Player selects which letter to use at word submission
- Can only use ONE of the two letters per tile

### Scoring Choice Tiles

- Each letter scores independently based on point values
- Example: "T/H" tile = choose either T(2) or H(5)
- If you choose H, you score 5 points for that tile
- Multipliers apply to whichever letter you choose

### Frequency Rules

- **Maximum 2-3 choice tiles per round** across all tiles
- Can appear in:
  - Private tiles (your 2 pocket tiles)
  - Community tiles (the 5 shared tiles)
  - Or a mix of both
- **Preferred distribution:** 1 in private tiles, 1-2 in community tiles
- **No 3-letter or 4-letter tiles**

### Example Common Letter Pairs on Choice Tiles

**Vowel Pairs:**
- A/E, E/I, O/U, A/I

**Consonant Pairs:**
- T/S, R/N, D/T, S/L

**High-Value Pairs:**
- Q/K (10/5 points)
- Z/X (10/8 points)
- J/H (8/5 points)

**Visual Design:** Choice tiles should stand out with a distinct color or animation to make them feel special and exciting.

---

## GAME SETUP

### Players
- **4-6 players** per table
- Everyone starts with the same chip count (example: 1,000 chips)
- **House dealer** manages the game

### Blinds System
- **Small Blind** and **Big Blind** post forced bets before each round
- Blinds rotate clockwise after each round
- Ensures action and builds the pot

---

## ROUND PHASES

### PHASE 1: BLINDS & DEAL
1. Small blind and big blind post forced bets
2. Each player receives **2 private tiles** (only visible to that player)
   - May include 0-2 choice tiles

---

### PHASE 2: PRE-FLOP
- Players bet based on their 2 private tiles **only**
- No community tiles revealed yet
- **Betting Actions:** Fold, Call, or Raise
- Players assess potential word-building strength

---

### PHASE 3: THE FLOP
- **3 community tiles revealed** (visible to all players)
  - May include 0-2 choice tiles
- All players can use these tiles to build words
- **Betting Round:** Check, Bet, Call, Raise, or Fold

---

### PHASE 4: THE TURN
- **1 more community tile revealed** (4 community tiles total)
  - May include a choice tile
- **Betting Round:** Check, Bet, Call, Raise, or Fold

---

### PHASE 5: THE RIVER
- **Final community tile revealed** (5 community tiles total)
  - May include a choice tile
- **Maximum 2-3 choice tiles total** across all 7 tiles (2 private + 5 community)
- **Final Betting Round:** Check, Bet, Call, Raise, or Fold

---

### PHASE 6: REVEAL (60 Seconds)
- **60-second timer** to build your best word
- Use **any combination** of tiles:
  - Just your 2 private tiles
  - Just community tiles (2-5 tiles)
  - Mix of private and community tiles
- **Total word length:** 2-7 letters
- For choice tiles, select which letter option to use
- Shuffle tiles freely to visualize different words

---

### PHASE 7: SHOWDOWN
- All remaining players reveal their submitted words
- **Highest scoring word wins** all chips in the pot
- Tie-breaker rules applied if needed (see below)
- **Next round starts immediately** after scores are awarded

**Important:** When the round ends, scores are awarded without interrupting flow. The next hand should start automatically or with minimal prompting.

---

## BETTING ACTIONS

| Action | Description |
|--------|-------------|
| **Fold** | Exit the round, forfeit all bets made this round |
| **Check** | Pass action (only available if no bet has been made) |
| **Call** | Match the current bet amount |
| **Raise** | Increase the current bet |
| **All-In** | Bet all remaining chips |

**Pre-Selection Feature:** Players can pre-select actions (Fold, Check, Call, Raise) before their turn. Pre-selected actions execute automatically when it's their turn, speeding up gameplay.

---

## WORD BUILDING RULES

### Valid Word Requirements
✓ Must be **2-7 letters long**
✓ Must be in the **Scrabble dictionary** (TWL or SOWPODS)
✓ Must use only available tiles (private + community)
✓ Each tile can only be used **once**

### Using Tiles
- You can use **any combination** of your private and community tiles
- Minimum: 2 letters
- Maximum: 7 letters (2 private + 5 community)
- For choice tiles, you must select which letter to use

### Invalid Submissions
✗ Not in dictionary = **0 points**
✗ Timeout (no word submitted) = **0 points**
✗ Using tiles you don't have = **rejected**
✗ Using same tile twice = **rejected**

---

## WINNING & TIE-BREAKERS

### Determining the Winner
The player with the **highest scoring valid word** wins the entire pot.

### Tie-Breaker Rules (Applied in Order)
1. **Longest word wins**
   - If one word is longer, that player wins

2. **Highest single letter value wins**
   - If still tied, the word with the highest individual letter value wins

3. **High Point Tile Draw**
   - Each tied player draws 1 random tile from the deck
   - Highest value tile wins
   - Discard tiles after draw
   - Repeat if still tied

---

## UI FEATURES

### Shuffle Button
- **Unlimited uses** per round
- Rearranges tile display order only (visual only)
- Helps visualize different word combinations
- Does **not** change which tiles you have

### Anonymity (BetRivers Style)
- Hidden usernames/avatars during play
- Prevents player targeting and bias
- Similar to anonymous poker tables

### Design Reference
- Use **BetRivers Poker UI** as visual inspiration
- Clean, professional poker interface

### Floating Chips / Pot Animation
- When a player folds or disconnects mid-round, their chips visually float toward the pot
- When the round ends, chips float from the pot to the winner's avatar
- Chips land on winner's avatar head with a subtle bounce effect
- Enhances live gameplay feel and keeps pot dynamics visible

### Idle / Auto-Kick Handling
- Players are **automatically kicked** if:
  - Table becomes empty
  - Player remains idle for a preset period
- Ensures smooth gameplay for remaining active players

### Pre-Selection of Actions
- Players can **pre-select betting actions** (Fold, Check, Call, Raise) before their turn
- Pre-selected actions execute automatically when it's the player's turn
- Prevents stalling and supports fast-paced gameplay

---

## ACCESSIBILITY (ADA COMPLIANCE)

### Text-to-Speech
- Reads letter tiles aloud
- Announces submitted words
- Full screen reader support

### Visual Settings
- Bigger tile size option
- High contrast mode
- Adjustable font sizes
- Colorblind-friendly palette options

### Audio/Motion Settings
- Disable animations (reduce motion)
- Disable sound effects
- Silent mode (visual indicators only)

---

## GAME VARIATIONS

The platform features **different room types** with variations in:

### Timing Variations
- **30-second rounds** (fast-paced)
- **60-second rounds** (standard)

### Betting Structures
- **No Limit** - Bet any amount up to your stack
- **Pot Limit** - Bet up to the current pot size
- **Fixed Limit** - Predetermined bet/raise amounts

### Choice Tile Frequency
- **0-1 choice tiles per round** (simpler gameplay)
- **2-3 choice tiles per round** (more strategic options)

### Rule Variations
- Different bonus structures
- Alternative scoring systems
- Special tournament formats

**A/B Testing:** The platform will test different formats to optimize player engagement and determine the most popular gameplay styles.

---

## TOURNAMENT & CASH GAMES

### Tournament Buy-Ins
- **Freeroll** - $0 (practice/promotional)
- **Micro** - $1-$5
- **Low** - $10-$50
- **Mid** - $100-$500
- **High Roller** - $1,000+

### Tournament Types

**SNG (Sit-N-Go):**
- 4-6 players
- Duration: 15-30 minutes
- Starts when table fills

**MTT (Multi-Table Tournament):**
- 50-500 players
- Duration: 1-3 hours
- Scheduled start times

### Cash Game Stakes

| Stakes Level | Blinds |
|--------------|--------|
| **Micro** | $0.25/$0.50 |
| **Low** | $1/$2 |
| **Mid** | $5/$10 |
| **High** | $25/$50+ |

---

## COLOR PALETTE & VISUAL DESIGN

### Background & Table
- **Main background:** Dark navy blue (#1a2332)
- **Poker table felt:** Forest green (#2d5016) with subtle fabric texture
- **Table border:** Dark wood brown with gold accent trim

### Tiles & UI Elements
- **Letter tiles background:** Cream/tan (#f4e4c1) - Scrabble-style
- **Letter text:** Dark brown/black (#2b1810)
- **Point values:** Small dark text in corner
- **Doubled tiles (2L):** Gold border glow (#d4af37)
- **Tripled tiles (3L):** Platinum/silver border glow
- **Choice tiles:** Special color/animation to stand out
- **Community tile area:** Green felt (matches table)

### Text & Buttons
- **Primary text:** White (#ffffff)
- **Secondary text:** Light grey (#b8c5d6)
- **Gold accent buttons:** (#d4af37)
- **Action buttons:** Dark with light border

### Chips
- Standard poker chip colors:
  - White, Red, Blue, Green, Black
  - Each representing different denominations

---

## QUICK REFERENCE SUMMARY

**Setup:** 4-6 players, equal starting chips, house dealer

**Tiles:** 2 private + 5 community = 7 tiles max (2-3 may be choice tiles)

**Phases:** Blinds → Pre-Flop → Flop (3 tiles) → Turn (4 tiles) → River (5 tiles) → Reveal (60s) → Showdown

**Scoring:** Letter values + multipliers (2L/3L) + Full Rack Bonus (+10 for using all 7 tiles)

**Winner:** Highest scoring valid word (2-7 letters, Scrabble dictionary)

**Tie-Breaker:** Longest word → Highest single letter → High tile draw

---

*This document serves as the complete rulebook for Word Poker. Players should familiarize themselves with scoring, betting actions, and word-building rules before playing.*
