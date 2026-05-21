import type { PlayerHand } from "./RoomGameTable.types";

export function getVisibleOpponents(
  opponents: PlayerHand[],
  options: { includeFolded?: boolean } = {},
) {
  if (options.includeFolded) return opponents;
  return opponents.filter((hand) => !hand.hasFolded);
}
