import type { GameMultiplier } from "../gameState";

const FULL_RACK_TILE_COUNT = 7;
const FULL_RACK_BONUS = 10;

export type ShowdownScoringTile = {
  baseValue: number;
  multiplier?: GameMultiplier;
};

export type ShowdownScoreBreakdown = {
  basePoints: number;
  multiplierBonus: number;
  fullRackBonus: number;
};

function getMultiplierFactor(multiplier?: GameMultiplier) {
  switch (multiplier) {
    case "3L":
      return 3;
    case "2L":
      return 2;
    default:
      return 1;
  }
}

export function getEffectiveTileScore(tile: ShowdownScoringTile) {
  return tile.baseValue * getMultiplierFactor(tile.multiplier);
}

export function getHighestScoringTileValue(tiles: ShowdownScoringTile[]) {
  return tiles.reduce(
    (highest, tile) => Math.max(highest, getEffectiveTileScore(tile)),
    0,
  );
}

function calculateScoreBreakdown(
  tiles: ShowdownScoringTile[],
  options?: { fullRackBonus?: number },
): ShowdownScoreBreakdown {
  const basePoints = tiles.reduce((total, tile) => total + tile.baseValue, 0);
  const multiplierBonus = tiles.reduce((total, tile) => {
    const multiplierFactor = getMultiplierFactor(tile.multiplier);
    return total + tile.baseValue * (multiplierFactor - 1);
  }, 0);
  const fullRackBonus =
    tiles.length === FULL_RACK_TILE_COUNT
      ? (options?.fullRackBonus ?? FULL_RACK_BONUS)
      : 0;

  return {
    basePoints,
    multiplierBonus,
    fullRackBonus,
  };
}

export function calculateScore(
  tiles: ShowdownScoringTile[],
  options?: { fullRackBonus?: number },
) {
  const breakdown = calculateScoreBreakdown(tiles, options);

  return {
    ...breakdown,
    total:
      breakdown.basePoints +
      breakdown.multiplierBonus +
      breakdown.fullRackBonus,
  };
}

export function calculateStaticShowdownScore(tiles: ShowdownScoringTile[]) {
  return calculateScore(tiles);
}
