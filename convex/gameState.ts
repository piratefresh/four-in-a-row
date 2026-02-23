import { v } from "convex/values";

export const GAME_STAGES = [
  "preflop",
  "flop",
  "turn",
  "river",
  "final",
  "showdown",
] as const;

export type GameStage = (typeof GAME_STAGES)[number];

export const GAME_STATUSES = ["waiting", "active", "completed"] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];

export type GameMultiplier = "2L" | "3L";

export type GameTile = {
  letter: string;
  baseValue: number;
  multiplier?: GameMultiplier;
  revealed: boolean;
};

export type GameDeckTile = {
  letter: string;
  baseValue: number;
};

export const INITIAL_HAND_SIZE = 2;

export const gameStageValidator = v.union(
  v.literal("preflop"),
  v.literal("flop"),
  v.literal("turn"),
  v.literal("river"),
  v.literal("final"),
  v.literal("showdown"),
);

export const gameStatusValidator = v.union(
  v.literal("waiting"),
  v.literal("active"),
  v.literal("completed"),
);

export const gameTileValidator = v.object({
  letter: v.string(),
  baseValue: v.number(),
  multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
  revealed: v.boolean(),
});

export const gameDeckTileValidator = v.object({
  letter: v.string(),
  baseValue: v.number(),
});

export function createInitialGameDocument(
  roomId: string,
  deck: GameDeckTile[] = [],
) {
  const now = Date.now();
  return {
    roomId,
    stage: "preflop" as const,
    communityTiles: [] as GameTile[],
    deck,
    pot: 0,
    currentPlayerIndex: 0,
    status: "waiting" as const,
    createdAt: now,
    updatedAt: now,
  };
}

const LETTER_DISTRIBUTION: Array<{
  letter: string;
  baseValue: number;
  count: number;
}> = [
  { letter: "A", baseValue: 1, count: 9 },
  { letter: "B", baseValue: 3, count: 2 },
  { letter: "C", baseValue: 3, count: 2 },
  { letter: "D", baseValue: 2, count: 4 },
  { letter: "E", baseValue: 1, count: 12 },
  { letter: "F", baseValue: 4, count: 2 },
  { letter: "G", baseValue: 2, count: 3 },
  { letter: "H", baseValue: 4, count: 2 },
  { letter: "I", baseValue: 1, count: 9 },
  { letter: "J", baseValue: 8, count: 1 },
  { letter: "K", baseValue: 5, count: 1 },
  { letter: "L", baseValue: 1, count: 4 },
  { letter: "M", baseValue: 3, count: 2 },
  { letter: "N", baseValue: 1, count: 6 },
  { letter: "O", baseValue: 1, count: 8 },
  { letter: "P", baseValue: 3, count: 2 },
  { letter: "Q", baseValue: 10, count: 1 },
  { letter: "R", baseValue: 1, count: 6 },
  { letter: "S", baseValue: 1, count: 4 },
  { letter: "T", baseValue: 1, count: 6 },
  { letter: "U", baseValue: 1, count: 4 },
  { letter: "V", baseValue: 4, count: 2 },
  { letter: "W", baseValue: 4, count: 2 },
  { letter: "X", baseValue: 8, count: 1 },
  { letter: "Y", baseValue: 4, count: 2 },
  { letter: "Z", baseValue: 10, count: 1 },
];

function randomIndex(maxExclusive: number) {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % maxExclusive;
}

export function createShuffledDeck(): GameDeckTile[] {
  const deck: GameDeckTile[] = [];
  for (const { letter, baseValue, count } of LETTER_DISTRIBUTION) {
    for (let i = 0; i < count; i++) {
      deck.push({ letter, baseValue });
    }
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function getNextStage(stage: GameStage): GameStage | null {
  switch (stage) {
    case "preflop":
      return "flop";
    case "flop":
      return "turn";
    case "turn":
      return "river";
    case "river":
      return "final";
    case "final":
      return "showdown";
    case "showdown":
      return null;
  }
}
