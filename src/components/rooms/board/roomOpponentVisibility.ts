import type { PlayerHand } from "./RoomGameTable.types";

export function getVisibleOpponents(opponents: PlayerHand[]) {
  return opponents.filter((hand) => !hand.hasFolded);
}
