import { v } from "convex/values";
import { gameDeckTileValidator, type GameDeckTile } from "./gameState";

export const RIVER_RUN_TARGET_CURVE = [30, 40, 55, 70, 90, 115, 145, 180] as const;
export const RIVER_RUN_INITIAL_CREDITS = 0;
export const RIVER_RUN_INITIAL_SCORE = 0;
export const RIVER_RUN_DRAFT_CANDIDATE_COUNT = 10;
export const RIVER_RUN_DRAFT_KEEP_COUNT = 4;
export const RIVER_RUN_EXPAND_NEW_TILE_COUNT = 2;
export const RIVER_RUN_FINALE_NEW_TILE_COUNT = 1;
export const RIVER_RUN_POST_DRAFT_TILE_COUNT =
  RIVER_RUN_DRAFT_KEEP_COUNT + RIVER_RUN_EXPAND_NEW_TILE_COUNT + RIVER_RUN_FINALE_NEW_TILE_COUNT;
export const RIVER_RUN_LENGTH_BONUS: Record<number, number> = {
  2: 0,
  3: 3,
  4: 6,
  5: 10,
  6: 15,
  7: 25,
};

export const RIVER_RUN_PHASES = ["draft", "expand", "finale"] as const;
export type RiverRunPhase = (typeof RIVER_RUN_PHASES)[number];
export const RIVER_RUN_REVEALED_TILE_COUNT_BY_PHASE: Record<
  RiverRunPhase,
  number
> = {
  draft: RIVER_RUN_DRAFT_CANDIDATE_COUNT,
  expand: RIVER_RUN_DRAFT_KEEP_COUNT + RIVER_RUN_EXPAND_NEW_TILE_COUNT,
  finale: RIVER_RUN_POST_DRAFT_TILE_COUNT,
};

export const RIVER_RUN_STATUSES = [
  "active",
  "shop",
  "failed",
  "completed",
] as const;
export type RiverRunStatus = (typeof RIVER_RUN_STATUSES)[number];

export const riverRunPhaseValidator = v.union(
  v.literal("draft"),
  v.literal("expand"),
  v.literal("finale"),
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
    revealed: index < RIVER_RUN_REVEALED_TILE_COUNT_BY_PHASE.draft,
  };
}

export function getNextRiverRunPhase(phase: RiverRunPhase): RiverRunPhase | null {
  switch (phase) {
    case "draft":
      return "expand";
    case "expand":
      return "finale";
    case "finale":
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
