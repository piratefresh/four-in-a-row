/**
 * Game Rules for Word Poker - Convex-Compatible Version
 *
 * This provides game rule context for AI decision-making
 * Based on WORD_POKER_RULES.md
 */

import type { GameStage } from "./gameState";

/**
 * Get comprehensive game rules prompt for AI context
 */
export function getGameRulesForAI(): string {
  return `# Word Poker Game Rules

## Overview
Word Poker is a multiplayer word game combining poker-style betting with strategic word building.
Players receive private letter tiles and share community tiles, betting on their ability to form high-scoring words.

## Game Flow
1. **Pre-Flop**: Players receive 2 private tiles (hidden from others) → Betting round
2. **Flop**: 2 community tiles revealed (shared by all) → Betting round
3. **Turn**: 1 additional community tile revealed (3 total) → Betting round
4. **River**: 1 additional community tile revealed (4 total) → Betting round
5. **Final**: Last community tile revealed (5 total) → No betting, moves to showdown
6. **Showdown**: 60-second timer to build best word → Highest score wins pot

## Tile System
- **Private tiles**: 2 tiles only visible to you
- **Community tiles**: 5 tiles shared by all players (revealed progressively)
- **Choice tiles**: Some tiles show 2-4 letter options (e.g., "A/E" or "S/T/R")
  - You choose which letter to use when building your word
  - Maximum 2-3 choice tiles per round across all tiles

## Letter Values (Point System)
- **1 point**: A, E, I, O, U (vowels), R, S, T, L, N
- **2 points**: D, G
- **3 points**: B, C, M, P
- **4 points**: F, H, V, W, Y
- **5 points**: K
- **8 points**: J, X
- **10 points**: Q, Z

## Word Scoring
1. **Base Score**: Sum all letter values
2. **Multipliers**: Some tiles have 2L (double letter) or 3L (triple letter) bonuses
3. **Full Rack Bonus**: Using all 7 tiles = +10 bonus points
4. **Speed Bonus** (Showdown only):
   - Submit within 10 seconds: +10 points
   - Submit within 20 seconds: +5 points
   - After 20 seconds: 0 bonus
5. **Valid Word Bonus**: +5 points for dictionary-valid word

## Word Requirements
- Must be 2-7 letters long
- Must be in English dictionary (validated via API)
- Can use any combination of private + community tiles
- Each tile can only be used once
- Invalid words score 0 points

## Betting Actions
- **Fold**: Exit round, forfeit all bets made
- **Check**: Pass (only if no bet to match)
- **Call**: Match current bet amount
- **Raise**: Increase bet (follows fixed ladder: 20, 40, 60, 80, 100, 120, 140, 160, 200)
  - Maximum 3 raises per betting round
- **All-In**: Bet all remaining chips

## Betting Constants
- **Ante**: 20 chips (forced bet before each round)
- **Starting chips**: 1000
- **Raise ladder**: Fixed increments (20 → 40 → 60 → 80 → 100 → 120 → 140 → 160 → 200)

## Winning & Tie-Breakers
1. Highest scoring valid word wins pot
2. If tied on score:
   - Longest word wins
   - If still tied: Highest single letter value wins
   - If still tied: Random high-value tile draw

## Strategic Considerations
- **Hand Strength**: Evaluate potential word combinations
- **Pot Odds**: Compare bet cost vs. potential pot winnings
- **Position**: Later position = more information about opponents
- **Bluffing**: Can bet strong even with weak tiles (risky!)
- **Community Tiles**: More revealed = better word prediction
- **Choice Tiles**: Provide flexibility but require strategic selection

## AI Decision Factors
When deciding whether to bet, call, raise, or fold:
1. **Tile Quality**: Do you have high-value letters? Good vowel-consonant balance?
2. **Word Potential**: Can you form a valid 5+ letter word? Any 7-letter possibilities?
3. **Stage**: Pre-flop is riskier (less info). River has full information.
4. **Pot Size**: Is the pot worth competing for?
5. **Opponent Count**: More opponents = lower win probability
6. **Chip Stack**: Don't risk too much early if you have limited chips
`;
}

/**
 * Get strategic advice for AI based on game stage
 */
export function getStageStrategy(stage: GameStage): string {
  switch (stage) {
    case "preflop":
      return `Pre-Flop Strategy:
- Only 2 private tiles visible, no community tiles yet
- Evaluate: Do you have strong letters (E, A, I, R, S, T)?
- High-value letters (Q, Z, X, J) are risky without support
- Fold weak hands (no vowels or all consonants)
- Call/raise if you have good vowel-consonant mix`;

    case "flop":
      return `Flop Strategy (2 community tiles revealed):
- Now you see 4 total tiles (2 hand + 2 community)
- Can you form a valid 4-letter word?
- Evaluate synergy between your hand and community
- Fold if tiles don't work together
- Raise if you see a strong 5+ letter word forming`;

    case "turn":
      return `Turn Strategy (3 community tiles revealed):
- Now you see 5 total tiles (2 hand + 3 community)
- You should have a clear 5-letter word in mind
- Check if others are betting aggressively (they may have better words)
- Consider pot odds: Is it worth calling to see the river?
- Fold if you can't form a competitive word`;

    case "river":
      return `River Strategy (4 community tiles revealed):
- Now you see 6 total tiles (2 hand + 4 community)
- This is your last chance to bet before final tile
- You should know if you can make a strong 6-letter word
- Evaluate: Can you potentially use all 7 tiles? (+10 bonus)
- Aggressive betting signals strong hands`;

    case "final":
      return `Final Stage (5 community tiles revealed):
- All tiles now visible (2 hand + 5 community = 7 total)
- No betting at this stage - moves directly to showdown
- Start planning your best word combination
- Consider using all 7 tiles for +10 bonus if possible`;

    case "showdown":
      return `Showdown Strategy (60-second timer):
- Build the highest-scoring valid word possible
- Prioritize longer words (more base points)
- Use high-value letters strategically
- If you can use all 7 tiles, do it! (+10 bonus)
- Submit quickly for speed bonus (+10 within 10s, +5 within 20s)
- Verify word is valid before submitting (0 points if invalid)`;
  }
}

/**
 * Estimate hand strength based on tile quality
 * Returns a value between 0 (very weak) and 1 (very strong)
 */
export function estimateHandStrength(
  tiles: Array<{ letter: string; baseValue: number }>,
  revealedCommunityTiles: Array<{ letter: string; baseValue: number }> = []
): number {
  const allTiles = [...tiles, ...revealedCommunityTiles];

  // Count vowels and consonants
  const vowels = allTiles.filter(t => "AEIOU".includes(t.letter)).length;
  const consonants = allTiles.length - vowels;

  // Calculate average tile value
  const avgValue = allTiles.reduce((sum, t) => sum + t.baseValue, 0) / allTiles.length;

  // Ideal ratio: 2-3 vowels for 5-7 tiles
  const vowelRatio = vowels / allTiles.length;
  const idealVowelRatio = 0.35; // ~35% vowels
  const vowelScore = 1 - Math.abs(vowelRatio - idealVowelRatio) * 2;

  // High-value letters are good but need support
  const highValueCount = allTiles.filter(t => t.baseValue >= 5).length;
  const highValueScore = Math.min(highValueCount / allTiles.length, 0.3);

  // Common letters (E, A, I, R, S, T, L, N) are valuable
  const commonLetters = "EARSTLIN";
  const commonCount = allTiles.filter(t => commonLetters.includes(t.letter)).length;
  const commonScore = commonCount / allTiles.length;

  // Combine scores
  const strength = (
    vowelScore * 0.4 +
    commonScore * 0.4 +
    highValueScore * 0.2 +
    (avgValue / 5) * 0.1
  );

  return Math.max(0, Math.min(1, strength));
}

/**
 * Get quick strategic recommendation
 */
export function getQuickRecommendation(
  handStrength: number,
  currentBet: number,
  chips: number,
  potSize: number,
  stage: GameStage
): "fold" | "call" | "raise" {
  const potOdds = currentBet > 0 ? potSize / currentBet : 0;
  const chipRisk = currentBet / chips;

  // Early stages (preflop, flop) - be more conservative
  const earlyStage = stage === "preflop" || stage === "flop";
  const threshold = earlyStage ? 0.5 : 0.4;

  // Fold if hand is weak and bet is significant
  if (handStrength < threshold && chipRisk > 0.2) {
    return "fold";
  }

  // Raise if hand is strong and pot odds are good
  if (handStrength > 0.7 && potOdds > 2) {
    return "raise";
  }

  // Call if hand is decent
  if (handStrength > threshold) {
    return "call";
  }

  // Default: fold weak hands
  return "fold";
}
