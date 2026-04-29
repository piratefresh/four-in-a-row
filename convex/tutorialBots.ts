import type { GameDeckTile, GameTile } from "./gameState";
import { TUTORIAL_BOT_HANDS } from "./tutorialDeck";

const TUTORIAL_BOT_WORDS: string[] = ["DOGS", "FOG", "VOL"];

function buildTutorialBotTiles(
  botIndex: number,
  handTiles: GameDeckTile[],
  communityTiles: GameTile[],
) {
  const word = TUTORIAL_BOT_WORDS[botIndex] ?? "ON";
  const letterPool = [
    ...handTiles.map((t, i) => ({
      letter: t.kind === "single" ? t.letter : t.options[0]!,
      baseValue: t.kind === "single" ? t.baseValue : t.baseValues[0]!,
      multiplier: t.multiplier,
      source: "hand" as const,
      cardIndex: i,
    })),
    ...communityTiles.filter((t) => t.revealed).map((t, i) => ({
      letter: t.kind === "single" ? t.letter : t.options[0]!,
      baseValue: t.kind === "single" ? t.baseValue : t.baseValues[0]!,
      multiplier: t.multiplier,
      source: "community" as const,
      cardIndex: i,
    })),
  ];

  const used = new Set<number>();
  const tiles: Array<{
    letter: string;
    baseValue: number;
    multiplier?: "2L" | "3L";
    source: "hand" | "community";
    cardIndex?: number;
  }> = [];

  for (const ch of word) {
    const idx = letterPool.findIndex(
      (t, i) => !used.has(i) && t.letter === ch,
    );
    if (idx === -1) return null;
    used.add(idx);
    const t = letterPool[idx]!;
    tiles.push({
      letter: t.letter,
      baseValue: t.baseValue,
      multiplier: t.multiplier,
      source: t.source,
      cardIndex: t.cardIndex,
    });
  }

  return { word, tiles, score: tiles.reduce((s, t) => s + t.baseValue * (t.multiplier === "3L" ? 3 : t.multiplier === "2L" ? 2 : 1), 0) };
}

export type TutorialBettingAction = {
  action: "check" | "call";
  reasoning: string;
};

export function tutorialBotBettingDecision(args: {
  currentBet: number;
  betThisRound: number;
  chips: number;
}): TutorialBettingAction {
  const amountToCall = Math.max(0, args.currentBet - args.betThisRound);

  if (amountToCall <= 0) {
    return {
      action: "check",
      reasoning: "Tutorial bot: checking (no bet to match)",
    };
  }

  if (args.chips >= amountToCall) {
    return {
      action: "call",
      reasoning: `Tutorial bot: calling ${amountToCall}`,
    };
  }

  return {
    action: "check",
    reasoning: "Tutorial bot: insufficient chips, checking",
  };
}

export type TutorialShowdownResult = {
  word: string;
  tiles: Array<{
    letter: string;
    baseValue: number;
    multiplier?: "2L" | "3L";
    source: "hand" | "community";
    cardIndex?: number;
  }>;
  choiceResolutions?: Record<string, string>;
  estimatedScore: number;
  reasoning: string;
} | null;

export function tutorialBotShowdownWord(args: {
  handTiles: GameDeckTile[];
  communityTiles: GameTile[];
}): TutorialShowdownResult {
  const botIndex = TUTORIAL_BOT_HANDS.findIndex((hand) => {
    if (hand.length !== args.handTiles.length) return false;
    return hand.every((tile, i) => {
      const other = args.handTiles[i]!;
      if (tile.kind !== other.kind) return false;
      if (tile.kind === "single" && other.kind === "single") {
        return tile.letter === other.letter && tile.baseValue === other.baseValue;
      }
      return true;
    });
  });

  if (botIndex >= 0) {
    const result = buildTutorialBotTiles(botIndex, args.handTiles, args.communityTiles);
    if (result) {
      return {
        word: result.word,
        tiles: result.tiles,
        estimatedScore: result.score,
        reasoning: `Tutorial bot plays "${result.word}" (${result.score} pts)`,
      };
    }
  }

  return {
    word: "ON",
    tiles: [
      { letter: "O", baseValue: 1, source: "community", cardIndex: 1 },
      { letter: "N", baseValue: 1, source: "community", cardIndex: 2 },
    ],
    estimatedScore: 2,
    reasoning: "Tutorial bot fallback word",
  };
}