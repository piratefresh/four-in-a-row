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
  "noLimit",
  "potLimit",
  "fixedLimit",
  "standard",
  "speed",
] as const;

export type BettingStructure = (typeof BETTING_STRUCTURES)[number];

export const bettingStructureValidator = v.union(
  v.literal("noLimit"),
  v.literal("potLimit"),
  v.literal("fixedLimit"),
  // Legacy values kept so existing room and game documents continue to validate.
  v.literal("speed"),
  v.literal("standard"),
);

// ============================================================================
// Choice Tile Frequency
// ============================================================================

export const CHOICE_TILE_FREQUENCIES = [
  "low",
  "high",
  "standard",
] as const;

export type ChoiceTileFrequency = (typeof CHOICE_TILE_FREQUENCIES)[number];

export const choiceTileFrequencyValidator = v.union(
  v.literal("low"),
  v.literal("high"),
  v.literal("standard"),
);

// ============================================================================
// Bonus Structure
// ============================================================================

export const BONUS_STRUCTURES = [
  "classic",
  "noRackBonus",
  "bigRackBonus",
  "standard",
] as const;

export type BonusStructure = (typeof BONUS_STRUCTURES)[number];

export const bonusStructureValidator = v.union(
  v.literal("classic"),
  v.literal("noRackBonus"),
  v.literal("bigRackBonus"),
  // Legacy/default room configs used this concept under gameMode only.
  v.literal("standard"),
);

// ============================================================================
// Room Config (stored on rooms table)
// ============================================================================

export type RoomConfig = {
  gameMode?: GameMode;
  bettingStructure?: BettingStructure;
  choiceTileFrequency?: ChoiceTileFrequency;
  showdownTimer?: number;
  bonusStructure?: BonusStructure;
};

export const roomConfigValidator = v.object({
  gameMode: v.optional(gameModeValidator),
  bettingStructure: v.optional(bettingStructureValidator),
  choiceTileFrequency: v.optional(choiceTileFrequencyValidator),
  showdownTimer: v.optional(v.number()),
  bonusStructure: v.optional(bonusStructureValidator),
});

// ============================================================================
// Resolved Game Config (effective values for game logic)
// ============================================================================

export type ResolvedGameConfig = {
  gameMode: GameMode;
  bettingStructure: BettingStructure;
  choiceTileFrequency: ChoiceTileFrequency;
  bonusStructure: BonusStructure;
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  raiseLadder: number[];
  maxRaisesPerRound: number;
  turnClockGraceMs: number;
  turnClockCalledDurationMs: number;
  showdownTimerMs: number;
  fullRackBonus: number;
  initialHandSize: number;
  communityTileCount: number;
};

export const resolvedGameConfigValidator = v.object({
  gameMode: gameModeValidator,
  bettingStructure: bettingStructureValidator,
  choiceTileFrequency: choiceTileFrequencyValidator,
  bonusStructure: v.optional(bonusStructureValidator),
  smallBlind: v.number(),
  bigBlind: v.number(),
  startingChips: v.number(),
  raiseLadder: v.array(v.number()),
  maxRaisesPerRound: v.number(),
  turnClockGraceMs: v.number(),
  turnClockCalledDurationMs: v.number(),
  showdownTimerMs: v.number(),
  fullRackBonus: v.optional(v.number()),
  initialHandSize: v.number(),
  communityTileCount: v.number(),
});

// ============================================================================
// Defaults (match current hardcoded constants exactly)
// ============================================================================

const DEFAULTS = {
  gameMode: "standard" as const,
  bettingStructure: "noLimit" as const,
  choiceTileFrequency: "high" as const,
  bonusStructure: "classic" as const,
  smallBlind: 10,
  bigBlind: 20,
  startingChips: 1000,
  raiseLadder: [20, 40, 60, 80, 100, 120, 140, 160, 200, 300, 500, 1000],
  maxRaisesPerRound: 99,
  turnClockGraceMs: 30_000,
  turnClockCalledDurationMs: 30_000,
  showdownTimerMs: 60_000,
  fullRackBonus: 10,
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

function normalizeBettingStructure(
  structure: RoomConfig["bettingStructure"],
): BettingStructure {
  if (structure === "standard") return "noLimit";
  return structure ?? DEFAULTS.bettingStructure;
}

function normalizeChoiceTileFrequency(
  frequency: RoomConfig["choiceTileFrequency"],
): ChoiceTileFrequency {
  if (frequency === "standard") return "high";
  return frequency ?? DEFAULTS.choiceTileFrequency;
}

function normalizeBonusStructure(
  structure: RoomConfig["bonusStructure"],
): BonusStructure {
  if (structure === "standard") return "classic";
  return structure ?? DEFAULTS.bonusStructure;
}

// ============================================================================
// resolveConfig
// ============================================================================

export function resolveConfig(config?: RoomConfig): ResolvedGameConfig {
  const bettingStructure = normalizeBettingStructure(config?.bettingStructure);
  const choiceTileFrequency = normalizeChoiceTileFrequency(
    config?.choiceTileFrequency,
  );
  const bonusStructure = normalizeBonusStructure(config?.bonusStructure);
  const isSpeed = bettingStructure === "speed";
  const isFixedLimit = bettingStructure === "fixedLimit";
  const isPotLimit = bettingStructure === "potLimit";

  return {
    gameMode: config?.gameMode ?? DEFAULTS.gameMode,
    bettingStructure,
    choiceTileFrequency,
    bonusStructure,
    smallBlind: isSpeed ? SPEED_OVERRIDES.smallBlind : DEFAULTS.smallBlind,
    bigBlind: isSpeed ? SPEED_OVERRIDES.bigBlind : DEFAULTS.bigBlind,
    startingChips: isSpeed ? SPEED_OVERRIDES.startingChips : DEFAULTS.startingChips,
    raiseLadder: isSpeed
      ? SPEED_OVERRIDES.raiseLadder
      : isFixedLimit
        ? [20, 40, 60, 80]
        : isPotLimit
          ? [20, 40, 60, 80, 100, 120, 160]
          : DEFAULTS.raiseLadder,
    maxRaisesPerRound: isSpeed || isFixedLimit ? 3 : DEFAULTS.maxRaisesPerRound,
    turnClockGraceMs: isSpeed ? SPEED_OVERRIDES.turnClockGraceMs : DEFAULTS.turnClockGraceMs,
    turnClockCalledDurationMs: isSpeed
      ? SPEED_OVERRIDES.turnClockCalledDurationMs
      : DEFAULTS.turnClockCalledDurationMs,
    showdownTimerMs: config?.showdownTimer ?? (isSpeed
      ? SPEED_OVERRIDES.showdownTimerMs
      : DEFAULTS.showdownTimerMs),
    fullRackBonus:
      bonusStructure === "noRackBonus"
        ? 0
        : bonusStructure === "bigRackBonus"
          ? 20
          : DEFAULTS.fullRackBonus,
    initialHandSize: DEFAULTS.initialHandSize,
    communityTileCount: DEFAULTS.communityTileCount,
  };
}

export function completeResolvedConfig(
  config?: Partial<ResolvedGameConfig>,
): ResolvedGameConfig {
  const defaults = resolveConfig();
  return {
    ...defaults,
    ...config,
    bettingStructure: normalizeBettingStructure(config?.bettingStructure),
    choiceTileFrequency: normalizeChoiceTileFrequency(config?.choiceTileFrequency),
    bonusStructure: normalizeBonusStructure(config?.bonusStructure),
    fullRackBonus: config?.fullRackBonus ?? defaults.fullRackBonus,
  };
}
