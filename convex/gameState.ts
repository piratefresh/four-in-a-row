import { v } from "convex/values";

export const GAME_STAGES = [
  "preflop",
  "flop",
  "turn",
  "river",
  "final",
  "showdown",
] as const;

export type GameStage = (typeof GAME_STAGES)[number];

export const GAME_STATUSES = ["waiting", "active", "completed"] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];

export type GameMultiplier = "2L" | "3L";

// Community tile type - extends GameDeckTile with reveal and multiplier info
export type GameTile =
  | {
      kind: "single";
      letter: string;
      baseValue: number;
      multiplier?: GameMultiplier;
      revealed: boolean;
    }
  | {
      kind: "choice";
      options: string[];
      baseValues: number[];
      multiplier?: GameMultiplier;
      revealed: boolean;
    };

// Card types for multi-letter deck
export type CardKind = "single" | "choice";

export type GameDeckTile =
  | {
      kind: "single";
      letter: string;
      baseValue: number;
    }
  | {
      kind: "choice";
      options: string[]; // exactly 2 letters
      baseValues: number[]; // corresponding values for each option
    };

export const INITIAL_HAND_SIZE = 2;
export const COMMUNITY_TILE_COUNT = 5;
export const MIN_CHOICE_TILES_PER_PLAYER_ROUND = 2;
export const MAX_CHOICE_TILES_PER_PLAYER_ROUND = 3;
export const PREFERRED_PRIVATE_CHOICE_TILE_COUNT = 1;
export const MIN_COMMUNITY_CHOICE_TILE_COUNT = 1;
export const MAX_COMMUNITY_CHOICE_TILE_COUNT = 2;

// Multi-letter deck configuration (MVP defaults)
export const DECK_SIZE = 60;
export const CHOICE_TILE_COUNT = 14;
export const CHOICE_TOTAL = CHOICE_TILE_COUNT;
export const SINGLE_TOTAL = DECK_SIZE - CHOICE_TOTAL; // 46

// Two-letter choice tile options aligned with the current rules.
export const CHOICE_TILE_OPTIONS: Array<[string, string]> = [
  ["A", "E"], // Common vowels
  ["A", "E"],
  ["E", "I"],
  ["O", "U"],
  ["A", "I"],
  ["S", "T"], // Common consonants
  ["R", "N"],
  ["D", "T"],
  ["S", "L"],
  ["Q", "K"], // High value pairs
  ["Z", "X"],
  ["J", "H"],
  ["L", "D"],
  ["C", "H"],
];

// Betting constants
export const SMALL_BLIND = 10;
export const BIG_BLIND = 20;
export const ANTE_AMOUNT = 20; // Kept for backwards compatibility
export const RAISE_LADDER = [20, 40, 60, 80, 100, 120, 140, 160, 200];
export const MAX_RAISES_PER_ROUND = 3;

// Showdown timer (1 minute)
export const SHOWDOWN_TIMER_MS = 60000;

// Speed bonus thresholds (aligned with 1-minute showdown timer)
export const SPEED_BONUS_TIER_1_SECONDS = 10; // +10 points
export const SPEED_BONUS_TIER_2_SECONDS = 20; // +5 points
// After 20 seconds: 0 points

export const gameStageValidator = v.union(
  v.literal("preflop"),
  v.literal("flop"),
  v.literal("turn"),
  v.literal("river"),
  v.literal("final"),
  v.literal("showdown"),
);

export const gameStatusValidator = v.union(
  v.literal("waiting"),
  v.literal("active"),
  v.literal("completed"),
);

export const gameTileValidator = v.union(
  v.object({
    kind: v.literal("single"),
    letter: v.string(),
    baseValue: v.number(),
    multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
    revealed: v.boolean(),
  }),
  v.object({
    kind: v.literal("choice"),
    options: v.array(v.string()),
    baseValues: v.array(v.number()),
    multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
    revealed: v.boolean(),
  }),
);

export const gameDeckTileValidator = v.union(
  v.object({
    kind: v.literal("single"),
    letter: v.string(),
    baseValue: v.number(),
  }),
  v.object({
    kind: v.literal("choice"),
    options: v.array(v.string()),
    baseValues: v.array(v.number()),
  }),
);

export function createInitialGameDocument(
  roomId: string,
  deck: GameDeckTile[] = [],
) {
  const now = Date.now();
  return {
    roomId,
    stage: "preflop" as const,
    communityTiles: [] as GameTile[],
    deck,
    pot: 0,
    currentBet: 0,
    currentPlayerIndex: 0,
    dealerButtonIndex: 0,
    smallBlindIndex: 1,
    bigBlindIndex: 2,
    raisesThisRound: 0,
    status: "waiting" as const,
    createdAt: now,
    updatedAt: now,
  };
}

const LETTER_DISTRIBUTION: Array<{
  letter: string;
  baseValue: number;
  count: number;
}> = [
  { letter: "A", baseValue: 1, count: 9 },
  { letter: "B", baseValue: 3, count: 2 },
  { letter: "C", baseValue: 3, count: 2 },
  { letter: "D", baseValue: 2, count: 4 },
  { letter: "E", baseValue: 1, count: 12 },
  { letter: "F", baseValue: 4, count: 2 },
  { letter: "G", baseValue: 2, count: 3 },
  { letter: "H", baseValue: 4, count: 2 },
  { letter: "I", baseValue: 1, count: 9 },
  { letter: "J", baseValue: 8, count: 1 },
  { letter: "K", baseValue: 5, count: 1 },
  { letter: "L", baseValue: 1, count: 4 },
  { letter: "M", baseValue: 3, count: 2 },
  { letter: "N", baseValue: 1, count: 6 },
  { letter: "O", baseValue: 1, count: 8 },
  { letter: "P", baseValue: 3, count: 2 },
  { letter: "Q", baseValue: 10, count: 1 },
  { letter: "R", baseValue: 1, count: 6 },
  { letter: "S", baseValue: 1, count: 4 },
  { letter: "T", baseValue: 1, count: 6 },
  { letter: "U", baseValue: 1, count: 4 },
  { letter: "V", baseValue: 4, count: 2 },
  { letter: "W", baseValue: 4, count: 2 },
  { letter: "X", baseValue: 8, count: 1 },
  { letter: "Y", baseValue: 4, count: 2 },
  { letter: "Z", baseValue: 10, count: 1 },
];

function randomIndex(maxExclusive: number) {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % maxExclusive;
}

// Helper function to get base value for a letter
function getLetterBaseValue(letter: string): number {
  const entry = LETTER_DISTRIBUTION.find((e) => e.letter === letter);
  return entry?.baseValue ?? 1;
}

/**
 * Validates deck configuration
 * Throws error if configuration is invalid
 */
export function validateDeckConfig(config: {
  deckSize: number;
  choiceTileCount: number;
}): void {
  const { deckSize, choiceTileCount } = config;
  const choiceTotal = choiceTileCount;
  const singleTotal = deckSize - choiceTotal;

  if (deckSize <= 0) {
    throw new Error("Deck size must be positive");
  }

  if (choiceTileCount < 0) {
    throw new Error("Choice tile count cannot be negative");
  }

  if (choiceTotal > deckSize) {
    throw new Error(
      `Choice card total (${choiceTotal}) exceeds deck size (${deckSize})`
    );
  }

  if (singleTotal < 0) {
    throw new Error(
      `Invalid configuration: single card count would be negative (${singleTotal})`
    );
  }

  if (choiceTileCount > CHOICE_TILE_OPTIONS.length) {
    throw new Error(
      `Choice tile count (${choiceTileCount}) exceeds options array length (${CHOICE_TILE_OPTIONS.length})`
    );
  }
}

/**
 * Creates a shuffled deck with configurable single and choice cards
 * Defaults to MVP configuration (60 cards, 14 choice cards ~23%)
 */
export function createShuffledDeck(config?: {
  deckSize?: number;
  choiceTileCount?: number;
}): GameDeckTile[] {
  const deckSize = config?.deckSize ?? DECK_SIZE;
  const choiceTileCount = config?.choiceTileCount ?? CHOICE_TILE_COUNT;

  // Validate configuration
  validateDeckConfig({ deckSize, choiceTileCount });

  const choiceTotal = choiceTileCount;
  const singleTotal = deckSize - choiceTotal;

  const deck: GameDeckTile[] = [];

  for (let i = 0; i < choiceTileCount; i++) {
    const options = CHOICE_TILE_OPTIONS[i];
    deck.push({
      kind: "choice",
      options: [...options],
      baseValues: options.map(getLetterBaseValue),
    });
  }

  // Add single-letter cards from the standard distribution
  // Scale the distribution proportionally to fill remaining slots
  const distributionTotal = LETTER_DISTRIBUTION.reduce(
    (sum, entry) => sum + entry.count,
    0
  );
  const scaleFactor = singleTotal / distributionTotal;

  let addedSingleCards = 0;
  for (const { letter, baseValue, count } of LETTER_DISTRIBUTION) {
    const scaledCount = Math.round(count * scaleFactor);
    for (let i = 0; i < scaledCount; i++) {
      if (addedSingleCards >= singleTotal) break;
      deck.push({ kind: "single", letter, baseValue });
      addedSingleCards++;
    }
  }

  // If we're still short, add more high-frequency letters
  while (addedSingleCards < singleTotal) {
    const highFreqLetters = ["E", "A", "I", "O", "N", "R", "T", "S"];
    const letter =
      highFreqLetters[addedSingleCards % highFreqLetters.length] ?? "E";
    const baseValue = getLetterBaseValue(letter);
    deck.push({ kind: "single", letter, baseValue });
    addedSingleCards++;
  }

  // Shuffle the deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function getNextStage(stage: GameStage): GameStage | null {
  switch (stage) {
    case "preflop":
      return "flop";
    case "flop":
      return "turn";
    case "turn":
      return "river";
    case "river":
      return "final";
    case "final":
      return "showdown";
    case "showdown":
      return null;
  }
}

// Canonical reveal counts per stage (cumulative total)
export function getRevealCountForStage(stage: GameStage): number {
  switch (stage) {
    case "preflop":
      return 0;
    case "flop":
      return 2;
    case "turn":
      return 3;
    case "river":
      return 4;
    case "final":
      return 5;
    case "showdown":
      return 5;
  }
}

// How many new tiles to reveal when transitioning TO this stage
export function getNewRevealCountForStage(stage: GameStage): number {
  switch (stage) {
    case "preflop":
      return 0;
    case "flop":
      return 2; // 0 -> 2
    case "turn":
      return 1; // 2 -> 3
    case "river":
      return 1; // 3 -> 4
    case "final":
      return 1; // 4 -> 5
    case "showdown":
      return 0;
  }
}
