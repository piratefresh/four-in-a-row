import { v } from "convex/values";

// ============================================================================
// Game Mode
// ============================================================================

export const GAME_MODES = [
  "standard",
  "verbs",
  "adjectives",
  "lowball",
] as const;

export type GameMode = (typeof GAME_MODES)[number];

export const gameModeValidator = v.union(
  v.literal("standard"),
  v.literal("verbs"),
  v.literal("adjectives"),
  v.literal("lowball"),
);

// ============================================================================
// Betting Structure
// ============================================================================

export const BETTING_STRUCTURES = [
  "standard",
  "speed",
] as const;

export type BettingStructure = (typeof BETTING_STRUCTURES)[number];

export const bettingStructureValidator = v.union(
  v.literal("standard"),
  v.literal("speed"),
);

// ============================================================================
// Choice Tile Frequency
// ============================================================================

export const CHOICE_TILE_FREQUENCIES = [
  "standard",
  "low",
  "high",
] as const;

export type ChoiceTileFrequency = (typeof CHOICE_TILE_FREQUENCIES)[number];

export const choiceTileFrequencyValidator = v.union(
  v.literal("standard"),
  v.literal("low"),
  v.literal("high"),
);

// ============================================================================
// Room Config (stored on rooms table)
// ============================================================================

export type RoomConfig = {
  gameMode?: GameMode;
  bettingStructure?: BettingStructure;
  choiceTileFrequency?: ChoiceTileFrequency;
  showdownTimer?: number;
};

export const roomConfigValidator = v.object({
  gameMode: v.optional(gameModeValidator),
  bettingStructure: v.optional(bettingStructureValidator),
  choiceTileFrequency: v.optional(choiceTileFrequencyValidator),
  showdownTimer: v.optional(v.number()),
});

// ============================================================================
// Resolved Game Config (effective values for game logic)
// ============================================================================

export type ResolvedGameConfig = {
  gameMode: GameMode;
  bettingStructure: BettingStructure;
  choiceTileFrequency: ChoiceTileFrequency;
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  raiseLadder: number[];
  maxRaisesPerRound: number;
  turnClockGraceMs: number;
  turnClockCalledDurationMs: number;
  showdownTimerMs: number;
  initialHandSize: number;
  communityTileCount: number;
};

export const resolvedGameConfigValidator = v.object({
  gameMode: gameModeValidator,
  bettingStructure: bettingStructureValidator,
  choiceTileFrequency: choiceTileFrequencyValidator,
  smallBlind: v.number(),
  bigBlind: v.number(),
  startingChips: v.number(),
  raiseLadder: v.array(v.number()),
  maxRaisesPerRound: v.number(),
  turnClockGraceMs: v.number(),
  turnClockCalledDurationMs: v.number(),
  showdownTimerMs: v.number(),
  initialHandSize: v.number(),
  communityTileCount: v.number(),
});

// ============================================================================
// Defaults (match current hardcoded constants exactly)
// ============================================================================

const DEFAULTS = {
  gameMode: "standard" as const,
  bettingStructure: "standard" as const,
  choiceTileFrequency: "standard" as const,
  smallBlind: 10,
  bigBlind: 20,
  startingChips: 1000,
  raiseLadder: [20, 40, 60, 80, 100, 120, 140, 160, 200],
  maxRaisesPerRound: 3,
  turnClockGraceMs: 60_000,
  turnClockCalledDurationMs: 30_000,
  showdownTimerMs: 60_000,
  initialHandSize: 2,
  communityTileCount: 5,
};

const SPEED_OVERRIDES = {
  smallBlind: 5,
  bigBlind: 10,
  startingChips: 500,
  raiseLadder: [10, 20, 30, 40, 50, 60, 70, 80, 100],
  turnClockGraceMs: 10_000,
  turnClockCalledDurationMs: 15_000,
  showdownTimerMs: 30_000,
};

// ============================================================================
// resolveConfig
// ============================================================================

export function resolveConfig(config?: RoomConfig): ResolvedGameConfig {
  const bettingStructure = config?.bettingStructure ?? DEFAULTS.bettingStructure;
  const isSpeed = bettingStructure === "speed";

  return {
    gameMode: config?.gameMode ?? DEFAULTS.gameMode,
    bettingStructure,
    choiceTileFrequency: config?.choiceTileFrequency ?? DEFAULTS.choiceTileFrequency,
    smallBlind: isSpeed ? SPEED_OVERRIDES.smallBlind : DEFAULTS.smallBlind,
    bigBlind: isSpeed ? SPEED_OVERRIDES.bigBlind : DEFAULTS.bigBlind,
    startingChips: isSpeed ? SPEED_OVERRIDES.startingChips : DEFAULTS.startingChips,
    raiseLadder: isSpeed ? SPEED_OVERRIDES.raiseLadder : DEFAULTS.raiseLadder,
    maxRaisesPerRound: DEFAULTS.maxRaisesPerRound,
    turnClockGraceMs: isSpeed ? SPEED_OVERRIDES.turnClockGraceMs : DEFAULTS.turnClockGraceMs,
    turnClockCalledDurationMs: isSpeed
      ? SPEED_OVERRIDES.turnClockCalledDurationMs
      : DEFAULTS.turnClockCalledDurationMs,
    showdownTimerMs: config?.showdownTimer ?? (isSpeed
      ? SPEED_OVERRIDES.showdownTimerMs
      : DEFAULTS.showdownTimerMs),
    initialHandSize: DEFAULTS.initialHandSize,
    communityTileCount: DEFAULTS.communityTileCount,
  };
}
