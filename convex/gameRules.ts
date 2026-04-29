/**
 * Game Rules for Word Poker - Convex-Compatible Version
 *
 * This provides game rule context for AI decision-making
 * Based on WORD_POKER_RULES.md
 */

import type { GameStage } from "./gameState";
import {
  AI_PERSONALITIES,
  getDifficultyModifiers,
  getPersonalityModifiers,
  type AIDifficulty,
  type AIPersonality,
} from "./aiStrategy";

export type HandStrengthBreakdown = {
  strength: number;
  vowelScore: number;
  commonScore: number;
  highValueScore: number;
  avgValue: number;
};

type BettingPercentages = { fold: number; call: number; raise: number };

export type ProbabilisticBetResult = {
  action: "fold" | "call" | "check" | "raise";
  raiseAmount?: number;
  reasoning: string;
  debug: {
    handStrength: number;
    potOdds: number;
    rateOfReturn: number;
    chipRisk: number;
    stackProtection: boolean;
    fcrBucket: string;
    basePct: BettingPercentages;
    personalityMod: BettingPercentages;
    difficultyMod: BettingPercentages;
    finalPct: BettingPercentages;
    roll: number;
  };
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function normalizePercentages(percentages: BettingPercentages): BettingPercentages {
  const clamped = {
    fold: clampPercent(percentages.fold),
    call: clampPercent(percentages.call),
    raise: clampPercent(percentages.raise),
  };
  const total = clamped.fold + clamped.call + clamped.raise;

  if (total <= 0) {
    return { fold: 0, call: 100, raise: 0 };
  }

  return {
    fold: (clamped.fold / total) * 100,
    call: (clamped.call / total) * 100,
    raise: (clamped.raise / total) * 100,
  };
}

/**
 * Get comprehensive game rules prompt for AI context
 */
export function getGameRulesForAI(): string {
  return `# Word Poker Game Rules

## Overview
Word Poker is a multiplayer word game combining poker-style betting with strategic word building.
Players receive private letter tiles and share community tiles, betting on their ability to form high-scoring words.

## Game Flow
1. **Blinds & Deal**: Small blind and big blind post forced bets; each player receives 2 private tiles
2. **Pre-Flop**: Betting round using only private tiles
3. **Flop**: 3 community tiles revealed (shared by all) -> Betting round
4. **Turn**: 1 additional community tile revealed (4 total) -> Betting round
5. **River**: 1 additional community tile revealed (5 total) -> Last betting round
6. **Reveal**: 60-second timer to build best word -> Highest score wins pot

## Tile System
- **Private tiles**: 2 tiles only visible to you
- **Community tiles**: 5 tiles shared by all players (revealed progressively)
- **Choice tiles**: Some tiles show exactly 2 letter options (e.g., "A/E" or "T/S")
  - You choose which letter to use when building your word
  - Each player's 2 private + 5 community tiles should include 2-3 choice tiles total
  - Preferred distribution: 1 private choice tile and 1-2 community choice tiles

## Letter Values (Point System)
- **1 point**: A, E, I, O, U
- **2 points**: R, S, T, L, N
- **3 points**: D, G
- **4 points**: B, C, M, P
- **5 points**: F, H, V, W, Y, K
- **8 points**: J, X
- **10 points**: Q, Z

## Word Scoring
1. **Base Score**: Sum all letter values
2. **Multipliers**: Some tiles have 2L (double letter) or 3L (triple letter) bonuses
3. **Full Rack Bonus**: Using all 7 tiles = +10 bonus points
4. **No timer bonus**: Speed does not change score

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
- **Small blind**: 10 chips
- **Big blind**: 20 chips
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
3. **Stage**: Pre-flop has only private-tile information. River has full information.
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
- Blinds are already posted, so decide whether your private tiles justify calling, raising, or folding
- Vowel/consonant balance matters more here because community tiles are still unknown`;

    case "flop":
      return `Flop Strategy (3 community tiles revealed):
- Now you see 5 total tiles (2 hand + 3 community)
- Can you form a valid 5-letter word?
- Evaluate synergy between your hand and community
- Fold if tiles don't work together
- Raise if you see a strong 5+ letter word forming`;

    case "turn":
      return `Turn Strategy (4 community tiles revealed):
- Now you see 6 total tiles (2 hand + 4 community)
- You should have a clear 5-letter word in mind
- Check if others are betting aggressively (they may have better words)
- Consider pot odds: Is it worth calling to see the river?
- Fold if you can't form a competitive word`;

    case "river":
      return `River Strategy (5 community tiles revealed):
- Now you see all 7 tiles (2 hand + 5 community)
- This is your last chance to bet before showdown
- You should know your best available word
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
- Prioritize high-value letters and multiplier tiles
- Use high-value letters strategically
- If you can use all 7 tiles, do it! (+10 bonus)
- Verify word is valid before submitting (0 points if invalid)`;
  }
}

/**
 * Calculate the portion of the final pot paid to continue.
 */
export function calculatePotOdds(currentBet: number, potSize: number): number {
  if (currentBet <= 0) {
    return 0;
  }

  return currentBet / (currentBet + potSize);
}

/**
 * Calculate rate of return for calling against the current pot odds.
 */
export function calculateRateOfReturn(handStrength: number, potOdds: number): number {
  if (potOdds <= 0) {
    return Infinity;
  }

  return handStrength / potOdds;
}

/**
 * Estimate hand strength and expose the score components for debugging/tests.
 */
export function estimateHandStrengthDetailed(
  tiles: Array<{ letter: string; baseValue: number }>,
  revealedCommunityTiles: Array<{ letter: string; baseValue: number }> = []
): HandStrengthBreakdown {
  const allTiles = [...tiles, ...revealedCommunityTiles];

  if (allTiles.length === 0) {
    return {
      strength: 0,
      vowelScore: 0,
      commonScore: 0,
      highValueScore: 0,
      avgValue: 0,
    };
  }

  // Count vowels and consonants
  const vowels = allTiles.filter(t => "AEIOU".includes(t.letter)).length;
  // Calculate average tile value
  const avgValue = allTiles.reduce((sum, t) => sum + t.baseValue, 0) / allTiles.length;

  // Ideal ratio: 2-3 vowels for 5-7 tiles
  const vowelRatio = vowels / allTiles.length;
  const idealVowelRatio = 0.35; // ~35% vowels
  const vowelScore = Math.max(0, Math.min(1, 1 - Math.abs(vowelRatio - idealVowelRatio) * 2));

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

  return {
    strength: Math.max(0, Math.min(1, strength)),
    vowelScore,
    commonScore,
    highValueScore,
    avgValue,
  };
}

/**
 * Estimate hand strength based on tile quality
 * Returns a value between 0 (very weak) and 1 (very strong)
 */
export function estimateHandStrength(
  tiles: Array<{ letter: string; baseValue: number }>,
  revealedCommunityTiles: Array<{ letter: string; baseValue: number }> = []
): number {
  return estimateHandStrengthDetailed(tiles, revealedCommunityTiles).strength;
}

function getFcrBucket(rateOfReturn: number): { bucket: string; percentages: BettingPercentages } {
  if (rateOfReturn < 0.8) {
    return { bucket: "RR < 0.8", percentages: { fold: 95, call: 0, raise: 5 } };
  }

  if (rateOfReturn < 1.0) {
    return { bucket: "RR < 1.0", percentages: { fold: 80, call: 5, raise: 15 } };
  }

  if (rateOfReturn < 1.3) {
    return { bucket: "RR < 1.3", percentages: { fold: 0, call: 60, raise: 40 } };
  }

  return { bucket: "RR >= 1.3", percentages: { fold: 0, call: 30, raise: 70 } };
}

function getBettingPersonalityModifiers(
  personality: AIPersonality,
  rateOfReturn: number,
): BettingPercentages {
  if (personality === AI_PERSONALITIES.CREATIVE && rateOfReturn < 1.0) {
    return { fold: 0, call: -10, raise: 10 };
  }

  return getPersonalityModifiers(personality);
}

function formatRateOfReturn(rateOfReturn: number): string {
  return rateOfReturn === Infinity ? "∞" : rateOfReturn.toFixed(2);
}

export function getProbabilisticBettingAction(
  handStrength: number,
  currentBet: number,
  chips: number,
  potSize: number,
  ante: number,
  _stage: GameStage,
  personality: AIPersonality,
  difficulty: AIDifficulty,
  raiseLadder: number[],
  randomFn: () => number = Math.random,
): ProbabilisticBetResult {
  const amountToCall = Math.max(0, currentBet);
  const potOdds = calculatePotOdds(amountToCall, potSize);
  const rateOfReturn = calculateRateOfReturn(handStrength, potOdds);
  const chipRisk = chips > 0 ? amountToCall / chips : 0;
  const { bucket: fcrBucket, percentages: basePct } = getFcrBucket(rateOfReturn);
  const personalityMod = getBettingPersonalityModifiers(personality, rateOfReturn);
  const difficultyMod = getDifficultyModifiers(difficulty);
  const finalPct = normalizePercentages({
    fold: basePct.fold + personalityMod.fold + difficultyMod.fold,
    call: basePct.call + personalityMod.call + difficultyMod.call,
    raise: basePct.raise + personalityMod.raise + difficultyMod.raise,
  });
  const roll = Math.max(0, Math.min(0.999999, randomFn()));
  const rollPct = roll * 100;
  let action: ProbabilisticBetResult["action"];
  let raiseAmount: number | undefined;
  let stackProtection = false;

  if (chips <= 0) {
    action = amountToCall <= 0 ? "check" : "fold";
  } else if (rollPct < finalPct.fold) {
    action = "fold";
  } else if (rollPct < finalPct.fold + finalPct.call) {
    action = "call";
  } else {
    action = "raise";
  }

  if (action === "fold" && amountToCall <= 0) {
    action = "check";
  }

  if (action === "call" && amountToCall <= 0) {
    action = "check";
  }

  if (chips > 0 && chips - amountToCall < ante * 4 && handStrength < 0.5) {
    stackProtection = true;
    action = amountToCall <= 0 ? "check" : "fold";
  }

  if (action === "raise") {
    const nextRaise = raiseLadder.find((step) => step > amountToCall);

    if (nextRaise === undefined) {
      action = amountToCall > 0 ? "call" : "check";
    } else {
      raiseAmount = nextRaise;
    }
  }

  const reasoning = [
    `RR=${formatRateOfReturn(rateOfReturn)} (${fcrBucket})`,
    `${personality} personality mod ${JSON.stringify(personalityMod)}`,
    `${difficulty} difficulty mod ${JSON.stringify(difficultyMod)}`,
    `roll ${roll.toFixed(2)} -> ${action}`,
  ].join(" | ");

  console.log("[ai:decision]", {
    handStrength: handStrength.toFixed(3),
    potOdds: potOdds.toFixed(3),
    rateOfReturn: rateOfReturn === Infinity ? "∞" : rateOfReturn.toFixed(3),
    chipRisk: chipRisk.toFixed(3),
    stackProtection,
    fcrBucket,
    basePct,
    personalityMod,
    difficultyMod,
    finalPct,
    roll: roll.toFixed(3),
    action,
    reason: reasoning,
  });

  return {
    action,
    raiseAmount,
    reasoning,
    debug: {
      handStrength,
      potOdds,
      rateOfReturn,
      chipRisk,
      stackProtection,
      fcrBucket,
      basePct,
      personalityMod,
      difficultyMod,
      finalPct,
      roll,
    },
  };
}

/**
 * Get quick strategic recommendation
 *
 * @deprecated Prefer getProbabilisticBettingAction for AI betting decisions.
 */
export function getQuickRecommendation(
  handStrength: number,
  currentBet: number,
  chips: number,
  potSize: number,
  _stage: GameStage
): "fold" | "call" | "raise" {
  // If no bet to call, always check (never fold for free)
  if (currentBet <= 0) {
    if (handStrength > 0.65) {
      return "raise";
    }
    return "call"; // checks when no bet
  }

  const potOdds = currentBet > 0 ? potSize / currentBet : 0;
  const chipRisk = currentBet / chips;

  // Only fold truly terrible hands when the bet is expensive relative to stack
  if (handStrength < 0.25 && chipRisk > 0.15) {
    return "fold";
  }

  // Raise strong hands with good pot odds
  if (handStrength > 0.65 && potOdds > 1.5) {
    return "raise";
  }

  // Call with decent or better hands - calling is cheap and preserves options
  if (handStrength >= 0.3) {
    return "call";
  }

  // Weak hand but bet is small relative to chips - still call, it's cheap to see more tiles
  if (chipRisk < 0.1) {
    return "call";
  }

  return "fold";
}
