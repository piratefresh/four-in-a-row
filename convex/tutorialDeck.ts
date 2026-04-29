import {
  INITIAL_HAND_SIZE,
  COMMUNITY_TILE_COUNT,
  type GameDeckTile,
  type GameTile,
} from "./gameState";
import { type ResolvedGameConfig } from "./gameConfig";

export const TUTORIAL_TARGET_WORD = "STRONG";

export const TUTORIAL_PLAYER_HAND: GameDeckTile[] = [
  { kind: "single", letter: "T", baseValue: 1 },
  { kind: "single", letter: "R", baseValue: 1, multiplier: "2L" },
];

export const TUTORIAL_BOT_HANDS: GameDeckTile[][] = [
  [
    { kind: "single", letter: "J", baseValue: 8 },
    { kind: "single", letter: "D", baseValue: 2 },
  ],
  [
    { kind: "single", letter: "F", baseValue: 4 },
    { kind: "single", letter: "X", baseValue: 8 },
  ],
  [
    { kind: "single", letter: "Z", baseValue: 10 },
    { kind: "single", letter: "V", baseValue: 5 },
  ],
];

export const TUTORIAL_COMMUNITY_ORDERED: GameDeckTile[] = [
  { kind: "single", letter: "S", baseValue: 1 },
  { kind: "single", letter: "O", baseValue: 1 },
  { kind: "single", letter: "N", baseValue: 1 },
  { kind: "single", letter: "G", baseValue: 2 },
  { kind: "single", letter: "L", baseValue: 1 },
];

function toCommunityTile(tile: GameDeckTile): GameTile {
  return {
    ...tile,
    revealed: false,
  };
}

function buildFillerDeck(): GameDeckTile[] {
  const fillerLetters = [
    { letter: "A", baseValue: 1 },
    { letter: "E", baseValue: 1 },
    { letter: "I", baseValue: 1 },
    { letter: "D", baseValue: 2 },
    { letter: "B", baseValue: 3 },
    { letter: "M", baseValue: 3 },
    { letter: "P", baseValue: 3 },
    { letter: "U", baseValue: 1 },
    { letter: "H", baseValue: 4 },
    { letter: "Y", baseValue: 4 },
  ];

  const filler: GameDeckTile[] = [];
  const totalPlayers = TUTORIAL_BOT_HANDS.length + 1;
  const tilesNeeded =
    totalPlayers * INITIAL_HAND_SIZE + COMMUNITY_TILE_COUNT;

  let idx = 0;
  while (filler.length < tilesNeeded + 20) {
    const entry = fillerLetters[idx % fillerLetters.length]!;
    filler.push({ kind: "single", letter: entry.letter, baseValue: entry.baseValue });
    idx++;
  }

  return filler;
}

export type TutorialDealResult = {
  hands: GameDeckTile[][];
  communityTiles: GameTile[];
  deck: GameDeckTile[];
  communityChoiceTileCount: number;
  handChoiceTileCounts: number[];
};

export function createTutorialDeal(
  participantCount: number,
  _config?: ResolvedGameConfig,
): TutorialDealResult {
  const totalBots = Math.max(0, participantCount - 1);

  const hands: GameDeckTile[][] = [];

  hands.push([...TUTORIAL_PLAYER_HAND]);

  for (let i = 0; i < totalBots; i++) {
    if (i < TUTORIAL_BOT_HANDS.length) {
      hands.push([...TUTORIAL_BOT_HANDS[i]!]);
    } else {
      hands.push([
        { kind: "single", letter: "Q", baseValue: 10 },
        { kind: "single", letter: "J", baseValue: 8 },
      ]);
    }
  }

  const communityTiles = TUTORIAL_COMMUNITY_ORDERED.map(toCommunityTile);

  const usedHandTiles = hands.flat().length;
  const usedCommunityTiles = TUTORIAL_COMMUNITY_ORDERED.length;

  const filler = buildFillerDeck();
  const remainingDeck = filler.slice(
    0,
    Math.max(0, filler.length - (usedHandTiles + usedCommunityTiles)),
  );

  const handChoiceTileCounts = hands.map((hand) =>
    hand.filter((t) => t.kind === "choice").length,
  );

  return {
    hands,
    communityTiles,
    deck: remainingDeck,
    communityChoiceTileCount: 0,
    handChoiceTileCounts,
  };
}

export const TUTORIAL_COMMUNITY_REVEAL_COUNTS: Record<string, number> = {
  preflop: 0,
  flop: 3,
  turn: 1,
  river: 1,
  final: 0,
  showdown: 0,
};