/**
 * AI Strategy Configuration for Word Poker
 *
 * Defines deterministic bot difficulty, personalities, named bot characters,
 * and betting behavior.
 */

import { DEV_BOT_AUTH_PREFIX } from "./games/gamesShared";

// AI Provider Selection
export const AI_PROVIDER = {
  NVIDIA_NIM: "nvidia_nim",
  OPENROUTER: "openrouter",
} as const;

export type AIProvider = (typeof AI_PROVIDER)[keyof typeof AI_PROVIDER];

/**
 * Get the configured AI provider from environment
 * Defaults to OpenRouter if not specified
 */
export function getConfiguredAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (provider === "nvidia_nim") {
    return AI_PROVIDER.NVIDIA_NIM;
  }
  return AI_PROVIDER.OPENROUTER; // Default to OpenRouter
}

// AI Difficulty Levels
export const AI_DIFFICULTY = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;

export type AIDifficulty = (typeof AI_DIFFICULTY)[keyof typeof AI_DIFFICULTY];

// Model selection for NVIDIA NIM
export const NVIDIA_NIM_MODELS = {
  [AI_DIFFICULTY.EASY]: "google/gemma-3-27b-it",
  [AI_DIFFICULTY.MEDIUM]: "google/gemma-3-27b-it",
  [AI_DIFFICULTY.HARD]: "google/gemma-3-27b-it",
} as const;

// Model selection for OpenRouter
export const OPENROUTER_MODELS = {
  [AI_DIFFICULTY.EASY]: "z-ai/glm-4.5-air:free",
  [AI_DIFFICULTY.MEDIUM]: "z-ai/glm-4.5-air:free",
  [AI_DIFFICULTY.HARD]: "z-ai/glm-4.5-air:free",
} as const;

// Legacy export for backwards compatibility
export const AI_MODELS = NVIDIA_NIM_MODELS;

export const SHOWDOWN_SELECTION_WINDOWS = {
  [AI_DIFFICULTY.EASY]: 12,
  [AI_DIFFICULTY.MEDIUM]: 5,
  [AI_DIFFICULTY.HARD]: 2,
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
 * Routes to correct provider based on configuration
 */
export function getModelForDifficulty(difficulty: AIDifficulty, provider?: AIProvider): string {
  const activeProvider = provider || getConfiguredAIProvider();

  if (activeProvider === AI_PROVIDER.OPENROUTER) {
    return OPENROUTER_MODELS[difficulty];
  }

  return NVIDIA_NIM_MODELS[difficulty];
}

/**
 * Get betting profile for AI difficulty level
 */
export function getBettingProfile(difficulty: AIDifficulty) {
  return BETTING_PROFILES[difficulty];
}

export function getShowdownSelectionWindow(difficulty: AIDifficulty): number {
  return SHOWDOWN_SELECTION_WINDOWS[difficulty];
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
  CREATIVE: "creative",
} as const;

export type AIPersonality = (typeof AI_PERSONALITIES)[keyof typeof AI_PERSONALITIES];

export type BotCharacterProfile = {
  id: string;
  name: string;
  title: string;
  personality: AIPersonality;
  notes: string;
};

export const BOT_CHARACTERS = [
  {
    id: "nora",
    name: "Nora Vale",
    title: "The Anchor",
    personality: AI_PERSONALITIES.CAUTIOUS,
    notes: "Prefers safer, clearer showdown words.",
  },
  {
    id: "ellis",
    name: "Ellis March",
    title: "The Ledger",
    personality: AI_PERSONALITIES.BALANCED,
    notes: "Sticks close to the board's highest-ranked candidates.",
  },
  {
    id: "jax",
    name: "Jax Rook",
    title: "The Blade",
    personality: AI_PERSONALITIES.AGGRESSIVE,
    notes: "Pushes toward the strongest scoring words available.",
  },
  {
    id: "mira",
    name: "Mira Quill",
    title: "The Wildcard",
    personality: AI_PERSONALITIES.CREATIVE,
    notes: "Likes stranger valid words when they stay competitive.",
  },
] as const satisfies readonly BotCharacterProfile[];

export type BotCharacterId = (typeof BOT_CHARACTERS)[number]["id"];

export const SHOWDOWN_PERSONALITY_PROFILES = {
  [AI_PERSONALITIES.CAUTIOUS]: {
    shortlistBias: "reliable",
  },
  [AI_PERSONALITIES.BALANCED]: {
    shortlistBias: "rank",
  },
  [AI_PERSONALITIES.AGGRESSIVE]: {
    shortlistBias: "high-score",
  },
  [AI_PERSONALITIES.CREATIVE]: {
    shortlistBias: "unusual",
  },
} as const;

export type DeterministicBettingPersonalityProfile = {
  aggression: number;
  bluffRate: number;
  foldThreshold: number;
  tiltChance: number;
  readsPotOdds: boolean;
};

export const FUTURE_BETTING_PERSONALITY_PROFILES: Record<
  AIPersonality,
  DeterministicBettingPersonalityProfile
> = {
  [AI_PERSONALITIES.CAUTIOUS]: {
    aggression: 0.3,
    bluffRate: 0.08,
    foldThreshold: 0.4,
    tiltChance: 0.02,
    readsPotOdds: true,
  },
  [AI_PERSONALITIES.BALANCED]: {
    aggression: 0.45,
    bluffRate: 0.15,
    foldThreshold: 0.3,
    tiltChance: 0.05,
    readsPotOdds: true,
  },
  [AI_PERSONALITIES.AGGRESSIVE]: {
    aggression: 0.6,
    bluffRate: 0.2,
    foldThreshold: 0.22,
    tiltChance: 0.04,
    readsPotOdds: true,
  },
  [AI_PERSONALITIES.CREATIVE]: {
    aggression: 0.5,
    bluffRate: 0.18,
    foldThreshold: 0.28,
    tiltChance: 0.06,
    readsPotOdds: false,
  },
};

const BOT_CHARACTER_BY_ID: Record<BotCharacterId, BotCharacterProfile> =
  Object.fromEntries(BOT_CHARACTERS.map((character) => [character.id, character])) as Record<
    BotCharacterId,
    BotCharacterProfile
  >;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getBotCharacterForSeatIndex(seatIndex: number): BotCharacterProfile {
  return BOT_CHARACTERS[((seatIndex % BOT_CHARACTERS.length) + BOT_CHARACTERS.length) % BOT_CHARACTERS.length]!;
}

export function getBotCharacterForSeed(seed: string): BotCharacterProfile {
  return BOT_CHARACTERS[hashString(seed) % BOT_CHARACTERS.length]!;
}

export function buildDevBotAuthUserId(roomId: string, seatIndex: number): string {
  const character = getBotCharacterForSeatIndex(seatIndex);
  return `${DEV_BOT_AUTH_PREFIX}${character.id}:${roomId}:${seatIndex}`;
}

export function getBotCharacterForAuthUserId(
  authUserId: string | null | undefined,
): BotCharacterProfile | null {
  if (!authUserId?.startsWith(DEV_BOT_AUTH_PREFIX)) {
    return null;
  }

  const encoded = authUserId.slice(DEV_BOT_AUTH_PREFIX.length);
  const [characterId] = encoded.split(":");
  if (characterId && characterId in BOT_CHARACTER_BY_ID) {
    return BOT_CHARACTER_BY_ID[characterId as BotCharacterId];
  }

  return getBotCharacterForSeed(authUserId);
}

export function getPersonalityForSeed(seed: string): AIPersonality {
  return getBotCharacterForSeed(seed).personality;
}

/**
 * Default AI configuration for bots
 */
export const DEFAULT_AI_CONFIG = {
  difficulty: AI_DIFFICULTY.MEDIUM,
  personality: AI_PERSONALITIES.BALANCED,
  enableBluffing: true,
  adaptiveStrategy: false, // Future: learn from player behavior
} as const;
