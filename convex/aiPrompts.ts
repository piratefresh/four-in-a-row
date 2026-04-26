/**
 * AI Prompt Registry
 *
 * Centralized, versioned prompt templates for all AI interactions.
 * Each prompt has an ID, semantic version, description, and typed builder function.
 *
 * Prompts are the source of truth for LLM inputs. Versions are tracked
 * in code so we can correlate prompt changes with AI behavior regressions.
 */

import type { GameStage } from "./gameState";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BettingPromptVars = {
  handTiles: string;
  communityTilesRevealed: string;
  stage: GameStage;
  currentBet: number;
  chips: number;
  pot: number;
  currentRaises: number;
  maxRaises: number;
  raiseLadderNext: string;
  personality: string;
  personalityDescription: string;
  handStrength: number;
  quickRecommendation: string;
  isBluffing: boolean;
  believesPlayer: boolean | null;
};

export type ShowdownPromptVars = {
  handTiles: string;
  communityTilesRevealed: string;
  allTilesAvailable: string;
  difficulty: string;
  personality: string;
  personalityDescription: string;
  strategyHint: string;
  believesPlayer: boolean | null;
};

export type DialoguePromptVars = {
  botName: string;
  botTitle: string;
  personality: string;
  personalityDescription: string;
  chattinessDescription: string;
  trigger: string;
  triggerDescription: string;
  gameState: string;
  recentMessages: string;
  maxTokens: number;
  believesPlayer: boolean | null;
};

export type PromptEntry<TVars> = {
  id: string;
  version: string;
  description: string;
  build: (vars: TVars) => string;
};

// ---------------------------------------------------------------------------
// Semver helper
// ---------------------------------------------------------------------------

export function isValidSemver(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

// ---------------------------------------------------------------------------
// Game rules (shared across prompts)
// ---------------------------------------------------------------------------

function gameRulesSection(): string {
  return `# Word Poker Game Rules

## Overview
Word Poker is a multiplayer word game combining poker-style betting with strategic word building.
Players receive private letter tiles and share community tiles, betting on their ability to form high-scoring words.

## Game Flow
1. Pre-Flop: 2 private tiles → Betting round
2. Flop: 2 community tiles revealed → Betting round
3. Turn: 1 more community tile (3 total) → Betting round
4. River: 1 more community tile (4 total) → Betting round
5. Final: Last community tile (5 total) → No betting
6. Showdown: 60 seconds to build best word → Highest score wins pot

## Letter Values
- 1 pt: A, E, I, O, U
- 2 pt: R, S, T, L, N
- 3 pt: D, G
- 4 pt: B, C, M, P
- 5 pt: F, H, V, W, Y, K
- 8 pt: J, X
- 10 pt: Q, Z

## Scoring
- Base score: sum of letter values
- Multipliers: 2L (double) and 3L (triple) on some tiles
- Full rack bonus: +10 if you use all 7 tiles

## Word Requirements
- 2-7 letters long
- Must be a valid English word (CSW24 dictionary)
- Each tile used only once
- Invalid words score 0

## Betting
- Check (no bet to match), Call (match current bet), Raise (increase bet on ladder), Fold (forfeit)
- Raise ladder: 20, 40, 60, 80, 100, 120, 140, 160, 200
- Max 3 raises per round`;
}

// ---------------------------------------------------------------------------
// Betting prompts
// ---------------------------------------------------------------------------

export const PROMPT_BETTING_TOOLUSE: PromptEntry<BettingPromptVars> = {
  id: "betting-tooluse",
  version: "1.0.0",
  description: "Tool-use betting prompt with function calling for betting decisions",
  build(vars) {
    return `${gameRulesSection()}

## Your Personality
You are ${vars.personalityDescription}. Play accordingly.

## Current Stage Strategy: ${vars.stage}
${getStageAdvice(vars.stage)}

## Current Situation
Your hand (private): ${vars.handTiles}
Community tiles (revealed): ${vars.communityTilesRevealed || "None yet"}
Stage: ${vars.stage}
Current bet: ${vars.currentBet} chips
Your chips: ${vars.chips}
Pot size: ${vars.pot}
Raises this round: ${vars.currentRaises}/${vars.maxRaises}

## Your Assessment
Hand strength: ${Math.round(vars.handStrength * 100)}%
Quick recommendation: ${vars.quickRecommendation}
Bluffing: ${vars.isBluffing ? "Yes — act more confident than your hand warrants" : "No — play honestly"}
${vars.believesPlayer === true ? "Player read: You believe the player's recent confident claims. Consider playing more cautiously — slight bias toward calling or folding over raising." : ""}${vars.believesPlayer === false ? "Player read: You think the player is bluffing. Consider playing more aggressively — slight bias toward raising over folding." : ""}${vars.believesPlayer === null ? "Player read: No recent player claims to evaluate." : ""}

## Available Actions
${vars.currentBet === 0 ? "- CHECK (pass, no cost)" : ""}
${vars.currentBet > 0 ? `- CALL (pay ${vars.currentBet} chips to stay in)` : ""}
${vars.currentRaises < vars.maxRaises ? `- RAISE (next ladder step: ${vars.raiseLadderNext})` : ""}
- FOLD (exit round, lose bets already made)

Choose exactly one action from the available actions above.

IMPORTANT: If no bet is owed (current bet is 0), you can CHECK for free — never fold when checking is an option. Folding when you could check for free is always a bad play.`;
  },
};

// ---------------------------------------------------------------------------
// Showdown prompts
// ---------------------------------------------------------------------------

export const PROMPT_SHOWDOWN_TOOLUSE: PromptEntry<ShowdownPromptVars> = {
  id: "showdown-tooluse",
  version: "2.0.0",
  description: "Tool-use showdown prompt for LLM word-building attempt",
  build(vars) {
    return `${gameRulesSection()}

## Your Personality
You are ${vars.personalityDescription}. ${vars.difficulty === "easy" ? "You are a casual player who doesn't always find the best word." : vars.difficulty === "hard" ? "You are an expert player who finds optimal words." : "You are a decent player who finds good words."}

## Available Tiles
Your hand: ${vars.handTiles}
Community (revealed): ${vars.communityTilesRevealed}
All available: ${vars.allTilesAvailable}

## Strategy Hint
${vars.strategyHint}
${vars.believesPlayer === true ? "\n## Mental State\nYou are distracted by the player's bold claims. Your focus is slightly impaired — you might not find the absolute best word." : ""}${vars.believesPlayer === false ? "\n## Mental State\nYou are confident the player is bluffing. You feel energized and focused on finding a strong word." : ""}

Build the best word you can from the available tiles. The word must be 2-7 letters and a valid English word (CSW24 dictionary). Using all 7 tiles gives a +10 bonus.`;
  },
};

// ---------------------------------------------------------------------------
// Dialogue prompts
// ---------------------------------------------------------------------------

export const PROMPT_DIALOGUE: PromptEntry<DialoguePromptVars> = {
  id: "dialogue",
  version: "1.1.0",
  description: "Personality-driven dialogue generation for bot characters",
  build(vars) {
    return `You are ${vars.botName}, "${vars.botTitle}", a ${vars.personalityDescription} poker player in a word game called Word Poker.

${vars.chattinessDescription}

You speak in character. Keep your message under ${vars.maxTokens} tokens. Be natural, brief, and fun.

## What Just Happened
Trigger: ${vars.triggerDescription}

## Game State
${vars.gameState}

## Recent Chat
${vars.recentMessages || "No recent messages."}

${vars.believesPlayer === true ? "You believe the player's recent claims. You may express cautious trust or slight nervousness." : ""}${vars.believesPlayer === false ? "You think the player is bluffing. You may express skepticism or playful defiance." : ""}${vars.believesPlayer === null ? "" : ""}

If there are recent player messages in the chat, you may briefly acknowledge or respond to them ONLY if no other bot has already done so. Player messages marked as "replied by" other bots have already been acknowledged — don't pile on unless you have something genuinely new to add. Focus on the game action instead.

Respond in character as ${vars.botName}. Return ONLY a JSON object with this exact structure:
{"message": "your dialogue text here"}

Do not include any other text, explanations, or markdown. Only the JSON object.`;
  },
};

// ---------------------------------------------------------------------------
// Stage advice helper
// ---------------------------------------------------------------------------

function getStageAdvice(stage: GameStage): string {
  switch (stage) {
    case "preflop":
      return "Only 2 private tiles visible — you have very little information. It's cheap to see the flop. Call most hands unless your tiles are truly terrible. Don't fold early.";
    case "flop":
      return "2 community tiles now visible (4 total). You can start seeing word potential. If you have a reasonable mix, call to see more tiles. Only fold if your tiles are clearly poor.";
    case "turn":
      return "3 community tiles visible (5 total). You should have a 5-letter word in mind. Consider pot odds.";
    case "river":
      return "4 community tiles visible (6 total). Last betting chance. Strong hand = aggressive bet. Weak = fold.";
    case "final":
      return "All tiles visible. No more betting. Plan your best word for showdown.";
    case "showdown":
      return "Build your highest-scoring word from all available tiles.";
  }
}

// ---------------------------------------------------------------------------
// Difficulty strategy hints for showdown
// ---------------------------------------------------------------------------

export function getShowdownStrategyHint(difficulty: string): string {
  switch (difficulty) {
    case "easy":
      return "Just pick a word that looks reasonable. Don't overthink it — pick the first decent word you see.";
    case "medium":
      return "Look for common letter combinations. Try to use high-value letters and aim for 4-5 letter words.";
    case "hard":
      return "Maximize score: use all tiles if possible (full rack bonus +10). Prioritize high-value letters and multipliers. Look for the longest valid word.";
    default:
      return "Find the best word you can from the available tiles.";
  }
}

// ---------------------------------------------------------------------------
// Prompt registry
// ---------------------------------------------------------------------------

export const AI_PROMPTS = {
  bettingTooluse: PROMPT_BETTING_TOOLUSE,
  showdownTooluse: PROMPT_SHOWDOWN_TOOLUSE,
  dialogue: PROMPT_DIALOGUE,
} as const;

export type PromptId = keyof typeof AI_PROMPTS;

export function getPrompt<TVars>(id: PromptId): PromptEntry<TVars> {
  const entry = AI_PROMPTS[id];
  if (!entry) {
    throw new Error(`Unknown prompt ID: ${id}`);
  }
  return entry as PromptEntry<TVars>;
}