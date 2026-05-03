import { v } from "convex/values";
import { gameDeckTileValidator, type GameDeckTile } from "./gameState";

export const RIVER_RUN_TARGET_CURVE = [45, 55, 70, 85, 105, 130, 160, 195] as const;
export const RIVER_RUN_INITIAL_CREDITS = 0;
export const RIVER_RUN_INITIAL_SCORE = 0;
export const RIVER_RUN_TILE_COUNT = 7;

export const RIVER_RUN_PHASES = ["deal", "turn", "river"] as const;
export type RiverRunPhase = (typeof RIVER_RUN_PHASES)[number];

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

export type RiverRunTile = {
  tile: GameDeckTile;
  revealed: boolean;
  flippedThisHand?: boolean;
};

export function createRiverRunTile(
  tile: GameDeckTile,
  index: number,
): RiverRunTile {
  return {
    tile,
    revealed: index < 4,
  };
}
