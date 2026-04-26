export const AI_DIFFICULTY = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;

export type AIDifficulty = (typeof AI_DIFFICULTY)[keyof typeof AI_DIFFICULTY];

export const AI_PERSONALITIES = {
  CAUTIOUS: "cautious",
  BALANCED: "balanced",
  AGGRESSIVE: "aggressive",
  CREATIVE: "creative",
} as const;

export type AIPersonality = (typeof AI_PERSONALITIES)[keyof typeof AI_PERSONALITIES];

export type DeterministicBettingPersonalityProfile = {
  aggression: number;
  bluffRate: number;
  foldThreshold: number;
  tiltChance: number;
  readsPotOdds: boolean;
  foolRate: number;
};

export type BettingModifiers = {
  fold: number;
  call: number;
  raise: number;
};

export const BETTING_PERSONALITY_PROFILES: Record<
  AIPersonality,
  DeterministicBettingPersonalityProfile
> = {
  [AI_PERSONALITIES.CAUTIOUS]: {
    aggression: 0.3,
    bluffRate: 0.08,
    foldThreshold: 0.4,
    tiltChance: 0.02,
    readsPotOdds: true,
    foolRate: 0.3,
  },
  [AI_PERSONALITIES.BALANCED]: {
    aggression: 0.45,
    bluffRate: 0.15,
    foldThreshold: 0.3,
    tiltChance: 0.05,
    readsPotOdds: true,
    foolRate: 0.5,
  },
  [AI_PERSONALITIES.AGGRESSIVE]: {
    aggression: 0.6,
    bluffRate: 0.2,
    foldThreshold: 0.22,
    tiltChance: 0.04,
    readsPotOdds: true,
    foolRate: 0.2,
  },
  [AI_PERSONALITIES.CREATIVE]: {
    aggression: 0.5,
    bluffRate: 0.18,
    foldThreshold: 0.28,
    tiltChance: 0.06,
    readsPotOdds: false,
    foolRate: 0.6,
  },
};

export const PERSONALITY_BETTING_MODIFIERS: Record<AIPersonality, BettingModifiers> = {
  [AI_PERSONALITIES.CAUTIOUS]: { fold: 15, call: -5, raise: -10 },
  [AI_PERSONALITIES.BALANCED]: { fold: 0, call: 0, raise: 0 },
  [AI_PERSONALITIES.AGGRESSIVE]: { fold: -10, call: 0, raise: 10 },
  [AI_PERSONALITIES.CREATIVE]: { fold: 0, call: -5, raise: 5 },
};

export const DIFFICULTY_BETTING_MODIFIERS: Record<AIDifficulty, BettingModifiers> = {
  [AI_DIFFICULTY.EASY]: { fold: 15, call: 0, raise: -10 },
  [AI_DIFFICULTY.MEDIUM]: { fold: 0, call: 0, raise: 0 },
  [AI_DIFFICULTY.HARD]: { fold: -5, call: 0, raise: 5 },
};
