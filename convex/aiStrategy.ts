/**
 * AI Strategy Configuration for Word Poker
 *
 * Defines AI difficulty levels, model selection, and strategic behavior
 */

// AI Difficulty Levels
export const AI_DIFFICULTY = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;

export type AIDifficulty = (typeof AI_DIFFICULTY)[keyof typeof AI_DIFFICULTY];

// Model selection per difficulty level
export const AI_MODELS = {
  [AI_DIFFICULTY.EASY]: "google/gemma-4-31b-it:free",
  [AI_DIFFICULTY.MEDIUM]: "google/gemma-4-31b-it:free",
  [AI_DIFFICULTY.HARD]: "google/gemma-4-31b-it:free",
} as const;

// Betting strategy profiles
export const BETTING_PROFILES = {
  [AI_DIFFICULTY.EASY]: {
    name: "Conservative",
    foldThreshold: 0.3, // Fold if hand strength < 30%
    raiseThreshold: 0.8, // Raise if hand strength > 80%
    bluffFrequency: 0.05, // 5% chance to bluff
    maxRaiseRatio: 0.5, // Max raise = 50% of pot
    riskTolerance: 0.3,
  },
  [AI_DIFFICULTY.MEDIUM]: {
    name: "Balanced",
    foldThreshold: 0.25,
    raiseThreshold: 0.7,
    bluffFrequency: 0.15, // 15% chance to bluff
    maxRaiseRatio: 0.75,
    riskTolerance: 0.5,
  },
  [AI_DIFFICULTY.HARD]: {
    name: "Aggressive",
    foldThreshold: 0.2,
    raiseThreshold: 0.6,
    bluffFrequency: 0.25, // 25% chance to bluff
    maxRaiseRatio: 1.0, // Can raise full pot
    riskTolerance: 0.7,
  },
} as const;

// Decision timing (milliseconds) - randomized for realism
export const AI_DECISION_TIMING = {
  [AI_DIFFICULTY.EASY]: {
    minDelay: 1000,
    maxDelay: 3000,
  },
  [AI_DIFFICULTY.MEDIUM]: {
    minDelay: 800,
    maxDelay: 2500,
  },
  [AI_DIFFICULTY.HARD]: {
    minDelay: 500,
    maxDelay: 2000,
  },
} as const;

/**
 * Get random delay for AI decision based on difficulty
 */
export function getAIDecisionDelay(difficulty: AIDifficulty): number {
  const timing = AI_DECISION_TIMING[difficulty];
  const range = timing.maxDelay - timing.minDelay;
  return timing.minDelay + Math.floor(Math.random() * range);
}

/**
 * Get model identifier for AI difficulty level
 */
export function getModelForDifficulty(difficulty: AIDifficulty): string {
  return AI_MODELS[difficulty];
}

/**
 * Get betting profile for AI difficulty level
 */
export function getBettingProfile(difficulty: AIDifficulty) {
  return BETTING_PROFILES[difficulty];
}

/**
 * Determine if AI should bluff based on difficulty
 */
export function shouldBluff(difficulty: AIDifficulty): boolean {
  const profile = BETTING_PROFILES[difficulty];
  return Math.random() < profile.bluffFrequency;
}

/**
 * AI Personality Traits (for future expansion)
 */
export const AI_PERSONALITIES = {
  CAUTIOUS: "cautious",
  BALANCED: "balanced",
  AGGRESSIVE: "aggressive",
  UNPREDICTABLE: "unpredictable",
} as const;

export type AIPersonality = (typeof AI_PERSONALITIES)[keyof typeof AI_PERSONALITIES];

/**
 * Default AI configuration for bots
 */
export const DEFAULT_AI_CONFIG = {
  difficulty: AI_DIFFICULTY.MEDIUM,
  personality: AI_PERSONALITIES.BALANCED,
  enableBluffing: true,
  adaptiveStrategy: false, // Future: learn from player behavior
} as const;
