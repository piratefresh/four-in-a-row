import { describe, expect, it } from "vitest";
import { buildRoomHandLog } from "./roomHandLog";
import type { PlayerHand, Tile } from "./RoomGameTable.types";

const hands: PlayerHand[] = [
  {
    _id: "h1",
    playerId: "you",
    tiles: [],
    chips: 980,
    betThisRound: 20,
    lastAction: "call",
  },
  {
    _id: "h2",
    playerId: "ellis",
    tiles: [],
    chips: 990,
    betThisRound: 10,
  },
  {
    _id: "h3",
    playerId: "jax",
    tiles: [],
    chips: 980,
    betThisRound: 20,
  },
  {
    _id: "h4",
    playerId: "mira",
    tiles: [],
    chips: 1000,
    hasFolded: true,
  },
];

const names: Record<string, string> = {
  you: "Magnus",
  ellis: "Ellis",
  jax: "Jax",
  mira: "Mira",
};

const getPlayerName = (playerId: string) => names[playerId] ?? playerId;

describe("buildRoomHandLog", () => {
  it("summarizes blinds and active turn", () => {
    const log = buildRoomHandLog({
      gameStage: "preflop",
      communityTiles: [],
      hands,
      currentTurnPlayerId: "ellis",
      dealerButtonIndex: 0,
      smallBlindIndex: 1,
      bigBlindIndex: 2,
      pot: 30,
      getPlayerName,
    });

    expect(log.map((entry) => entry.message)).toEqual(
      expect.arrayContaining([
        "Magnus has the dealer button",
        "Ellis posted small blind",
        "Jax posted big blind",
        "Ellis is on turn",
        "Pot is $30",
      ]),
    );
  });

  it("summarizes revealed community letters and folded players", () => {
    const communityTiles: Tile[] = [
      { kind: "choice", options: ["A", "E"], baseValues: [1, 1], revealed: true },
      { kind: "single", letter: "N", baseValue: 2, revealed: true },
      { kind: "single", letter: "O", baseValue: 1, revealed: true },
      { kind: "single", letter: "T", baseValue: 1, revealed: false },
    ];

    const log = buildRoomHandLog({
      gameStage: "flop",
      communityTiles,
      hands,
      currentTurnPlayerId: "you",
      pot: 80,
      builtWord: "ROW",
      currentRackScore: 8,
      getPlayerName,
    });

    expect(log.map((entry) => entry.message)).toEqual(
      expect.arrayContaining([
        "3 community letters / A/E / N / O",
        "Mira folded",
        "Current rack ROW / 8pts",
      ]),
    );
  });
});
