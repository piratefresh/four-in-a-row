const FULL_RACK_TILE_COUNT = 7;
const FULL_RACK_BONUS = 10;

export type ShowdownPreviewTile = {
  baseValue: number;
  multiplier?: "2L" | "3L";
};

export type ShowdownPreviewScore = {
  basePoints: number;
  multiplierBonus: number;
  fullRackBonus: number;
  total: number;
};

function getMultiplierFactor(multiplier?: ShowdownPreviewTile["multiplier"]) {
  switch (multiplier) {
    case "3L":
      return 3;
    case "2L":
      return 2;
    default:
      return 1;
  }
}

export function calculateShowdownPreviewScore(
  tiles: ShowdownPreviewTile[],
): ShowdownPreviewScore {
  const basePoints = tiles.reduce((total, tile) => total + tile.baseValue, 0);
  const multiplierBonus = tiles.reduce((total, tile) => {
    const multiplierFactor = getMultiplierFactor(tile.multiplier);
    return total + tile.baseValue * (multiplierFactor - 1);
  }, 0);
  const fullRackBonus =
    tiles.length === FULL_RACK_TILE_COUNT ? FULL_RACK_BONUS : 0;

  return {
    basePoints,
    multiplierBonus,
    fullRackBonus,
    total: basePoints + multiplierBonus + fullRackBonus,
  };
}
