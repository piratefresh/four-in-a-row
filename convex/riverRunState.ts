import { v } from "convex/values";
import { gameDeckTileValidator, type GameDeckTile } from "./gameState";

export const RIVER_RUN_TARGET_CURVE = [45, 55, 70, 85, 105, 130, 160, 195] as const;
export const RIVER_RUN_INITIAL_CREDITS = 0;
export const RIVER_RUN_INITIAL_SCORE = 0;
export const RIVER_RUN_TILE_COUNT = 7;
export const RIVER_RUN_LENGTH_BONUS: Record<number, number> = {
  2: 0,
  3: 3,
  4: 6,
  5: 10,
  6: 15,
  7: 25,
};

export const RIVER_RUN_PHASES = ["deal", "turn", "river"] as const;
export type RiverRunPhase = (typeof RIVER_RUN_PHASES)[number];
export const RIVER_RUN_REVEALED_TILE_COUNT_BY_PHASE: Record<
  RiverRunPhase,
  number
> = {
  deal: 4,
  turn: 6,
  river: 7,
};

export const RIVER_RUN_STATUSES = [
  "active",
  "shop",
  "failed",
  "completed",
] as const;
export type RiverRunStatus = (typeof RIVER_RUN_STATUSES)[number];

export const riverRunPhaseValidator = v.union(
  v.literal("deal"),
  v.literal("turn"),
  v.literal("river"),
);

export const riverRunStatusValidator = v.union(
  v.literal("active"),
  v.literal("shop"),
  v.literal("failed"),
  v.literal("completed"),
);

export const riverRunTileValidator = v.object({
  tile: gameDeckTileValidator,
  revealed: v.boolean(),
  flippedThisHand: v.optional(v.boolean()),
});

export const riverRunSubmissionValidator = v.object({
  phase: riverRunPhaseValidator,
  word: v.string(),
  score: v.number(),
  valid: v.boolean(),
  invalidReason: v.optional(v.string()),
  tiles: v.array(
    v.object({
      index: v.number(),
      letter: v.string(),
      baseValue: v.number(),
      multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
      wasChoice: v.boolean(),
    }),
  ),
  scoreBreakdown: v.object({
    letterPoints: v.number(),
    multiplierBonus: v.number(),
    lengthBonus: v.number(),
  }),
  submittedAt: v.number(),
});

export type RiverRunTile = {
  tile: GameDeckTile;
  revealed: boolean;
  flippedThisHand?: boolean;
};

export type RiverRunSubmission = {
  phase: RiverRunPhase;
  word: string;
  score: number;
  valid: boolean;
  invalidReason?: string;
  tiles: Array<{
    index: number;
    letter: string;
    baseValue: number;
    multiplier?: "2L" | "3L";
    wasChoice: boolean;
  }>;
  scoreBreakdown: {
    letterPoints: number;
    multiplierBonus: number;
    lengthBonus: number;
  };
  submittedAt: number;
};

export function createRiverRunTile(
  tile: GameDeckTile,
  index: number,
): RiverRunTile {
  return {
    tile,
    revealed: index < RIVER_RUN_REVEALED_TILE_COUNT_BY_PHASE.deal,
  };
}

export function getNextRiverRunPhase(phase: RiverRunPhase): RiverRunPhase | null {
  switch (phase) {
    case "deal":
      return "turn";
    case "turn":
      return "river";
    case "river":
      return null;
  }
}

export function revealRiverRunTilesForPhase(
  tiles: RiverRunTile[],
  phase: RiverRunPhase,
) {
  const revealCount = RIVER_RUN_REVEALED_TILE_COUNT_BY_PHASE[phase];
  return tiles.map((entry, index) => ({
    ...entry,
    revealed: index < revealCount,
  }));
}
