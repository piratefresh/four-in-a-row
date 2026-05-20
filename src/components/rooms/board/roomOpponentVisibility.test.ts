import { describe, expect, it } from "vitest";
import { getVisibleOpponents } from "./roomOpponentVisibility";
import type { PlayerHand } from "./RoomGameTable.types";

function hand(playerId: string, hasFolded: boolean): PlayerHand {
  return {
    _id: `hand-${playerId}`,
    playerId,
    tiles: [],
    hasFolded,
  };
}

describe("getVisibleOpponents", () => {
  it("removes folded opponents from the table", () => {
    const visible = getVisibleOpponents([
      hand("player-a", false),
      hand("player-b", true),
      hand("player-c", false),
    ]);

    expect(visible.map((opponent) => opponent.playerId)).toEqual([
      "player-a",
      "player-c",
    ]);
  });
});
