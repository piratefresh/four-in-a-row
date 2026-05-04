import type { GameMultiplier } from "../gameState";
import type { Doc } from "../_generated/dataModel";
import { isValidCsw24Word, normalizeCsw24Word } from "../csw24";
import {
  RIVER_RUN_LENGTH_BONUS,
  type RiverRunPhase,
  type RiverRunSubmission,
  type RiverRunTile,
} from "../riverRunState";

type SelectedRiverRunTile = RiverRunSubmission["tiles"][number];

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

function scoreSelectedTiles(tiles: SelectedRiverRunTile[]) {
  const letterPoints = tiles.reduce((total, tile) => total + tile.baseValue, 0);
  const multiplierBonus = tiles.reduce(
    (total, tile) =>
      total + tile.baseValue * (getMultiplierFactor(tile.multiplier) - 1),
    0,
  );
  const lengthBonus = RIVER_RUN_LENGTH_BONUS[tiles.length] ?? 0;
  return {
    letterPoints,
    multiplierBonus,
    lengthBonus,
    total: letterPoints + multiplierBonus + lengthBonus,
  };
}

function getTileOptions(
  entry: RiverRunTile,
  index: number,
): SelectedRiverRunTile[] {
  const { tile } = entry;
  if (tile.kind === "single") {
    return [
      {
        index,
        letter: tile.letter.toUpperCase(),
        baseValue: tile.baseValue,
        multiplier: tile.multiplier,
        wasChoice: false,
      },
    ];
  }

  return tile.options.map((letter, optionIndex) => ({
    index,
    letter: letter.toUpperCase(),
    baseValue: tile.baseValues[optionIndex] ?? 1,
    multiplier: tile.multiplier,
    wasChoice: true,
  }));
}

function findBestTileSelectionForWord(
  word: string,
  revealedTiles: RiverRunTile[],
) {
  const letters = word.split("");
  const usedIndexes = new Set<number>();
  let bestSelection: SelectedRiverRunTile[] | null = null;
  let bestScore = -1;

  function visit(letterIndex: number, selection: SelectedRiverRunTile[]) {
    if (letterIndex === letters.length) {
      const score = scoreSelectedTiles(selection).total;
      if (score > bestScore) {
        bestScore = score;
        bestSelection = selection;
      }
      return;
    }

    const targetLetter = letters[letterIndex]!;
    for (let tileIndex = 0; tileIndex < revealedTiles.length; tileIndex += 1) {
      if (usedIndexes.has(tileIndex)) continue;

      const options = getTileOptions(revealedTiles[tileIndex]!, tileIndex)
        .filter((option) => option.letter === targetLetter);
      for (const option of options) {
        usedIndexes.add(tileIndex);
        visit(letterIndex + 1, [...selection, option]);
        usedIndexes.delete(tileIndex);
      }
    }
  }

  visit(0, []);
  return bestSelection;
}

function normalizeSubmissionWord(word: string) {
  return normalizeCsw24Word(word);
}

function zeroScoreBreakdown() {
  return {
    letterPoints: 0,
    multiplierBonus: 0,
    lengthBonus: 0,
  };
}

export function scorePhaseWord(
  word: string,
  revealedTiles: RiverRunTile[],
): Omit<RiverRunSubmission, "phase" | "submittedAt"> {
  const normalizedWord = normalizeSubmissionWord(word);

  if (!/^[A-Z]{2,7}$/.test(normalizedWord)) {
    return {
      word: normalizedWord,
      score: 0,
      valid: false,
      invalidReason: "Word must be 2-7 letters.",
      tiles: [],
      scoreBreakdown: zeroScoreBreakdown(),
    };
  }

  const selectedTiles = findBestTileSelectionForWord(
    normalizedWord,
    revealedTiles,
  );
  if (!selectedTiles) {
    return {
      word: normalizedWord,
      score: 0,
      valid: false,
      invalidReason: "Word cannot be built from revealed tiles.",
      tiles: [],
      scoreBreakdown: zeroScoreBreakdown(),
    };
  }

  if (!isValidCsw24Word(normalizedWord)) {
    return {
      word: normalizedWord,
      score: 0,
      valid: false,
      invalidReason: "Word is not in the dictionary.",
      tiles: selectedTiles,
      scoreBreakdown: zeroScoreBreakdown(),
    };
  }

  const score = scoreSelectedTiles(selectedTiles);
  return {
    word: normalizedWord,
    score: score.total,
    valid: true,
    tiles: selectedTiles,
    scoreBreakdown: {
      letterPoints: score.letterPoints,
      multiplierBonus: score.multiplierBonus,
      lengthBonus: score.lengthBonus,
    },
  };
}

export type RiverRunPhaseScoringInput = {
  run: Doc<"riverRunRuns">;
  word: string;
  submittedAt: number;
};

export type RiverRunPhaseScoringResult = {
  phase: RiverRunPhase;
  submission: RiverRunSubmission;
  submissions: RiverRunSubmission[];
  handScore: number;
};

export function calculateRiverRunHandScore(
  submissions: readonly RiverRunSubmission[],
) {
  return submissions.reduce((total, entry) => total + entry.score, 0);
}

export function scoreRiverRunPhase({
  run,
  word,
  submittedAt,
}: RiverRunPhaseScoringInput): RiverRunPhaseScoringResult {
  const phase = run.phase;
  const revealedTiles = run.tiles.filter((tile) => tile.revealed);
  const scored = scorePhaseWord(word, revealedTiles);
  const submission: RiverRunSubmission = {
    phase,
    ...scored,
    submittedAt,
  };
  const submissions = [
    ...(run.submissions ?? []).filter((entry) => entry.phase !== phase),
    submission,
  ];

  return {
    phase,
    submission,
    submissions,
    handScore: calculateRiverRunHandScore(submissions),
  };
}
