import {
  AI_DIFFICULTY,
  AI_PERSONALITIES,
  type AIDifficulty,
  type AIPersonality,
  getShowdownSelectionWindow,
} from "./aiStrategy";
import { buildWordSignature, getWordsForSignature } from "./csw24";
import { calculateStaticShowdownScore } from "./games/gamesScoring";

export type SolverWordTile = {
  letter: string;
  baseValue: number;
  multiplier?: "2L" | "3L";
  source: "hand" | "community";
  cardIndex?: number;
  wasChoice?: boolean;
};

export type SolverChoiceResolutions = {
  hand?: Record<string, string>;
  community?: Record<string, string>;
};

export type SolveShowdownHandTile =
  | {
      kind: "single";
      letter: string;
      baseValue: number;
      multiplier?: "2L" | "3L";
    }
  | {
      kind: "choice";
      options: string[];
      baseValues: number[];
      multiplier?: "2L" | "3L";
    };

export type SolveShowdownCommunityTile =
  | {
      kind: "single";
      letter: string;
      baseValue: number;
      multiplier?: "2L" | "3L";
      revealed: boolean;
    }
  | {
      kind: "choice";
      options: string[];
      baseValues: number[];
      multiplier?: "2L" | "3L";
      revealed: boolean;
    };

export type AvailableShowdownTile = {
  ref: string;
  source: "hand" | "community";
  cardIndex: number;
  wasChoice: boolean;
  choices: Array<{
    letter: string;
    baseValue: number;
    multiplier?: "2L" | "3L";
  }>;
};

export type DeterministicShowdownCandidate = {
  word: string;
  tiles: SolverWordTile[];
  choiceResolutions?: SolverChoiceResolutions;
  staticScore: ReturnType<typeof calculateStaticShowdownScore>;
  tileCount: number;
  baseValueSum: number;
  highestTileScore: number;
  commonLetterScore: number;
  unusualLetterScore: number;
  uniqueLetterCount: number;
};

export type DeterministicHandEvaluation = {
  bestWord: string;
  bestScore: number;
  candidateCount: number;
  topCandidates: Array<{
    word: string;
    score: number;
    tileCount: number;
  }>;
  percentileEstimate: number;
  potentialEstimate: number;
};

export type DeterministicShowdownSelection = {
  word: string;
  tiles: SolverWordTile[];
  choiceResolutions?: SolverChoiceResolutions;
  estimatedScore: number;
  reasoning: string;
  personality: AIPersonality;
  evaluation: DeterministicHandEvaluation;
};

const COMMON_LETTERS = new Set("EARSTLINOU".split(""));
const LETTER_RARITY_SCORE: Record<string, number> = {
  A: 1,
  B: 4,
  C: 4,
  D: 2,
  E: 1,
  F: 5,
  G: 3,
  H: 5,
  I: 1,
  J: 8,
  K: 6,
  L: 2,
  M: 4,
  N: 2,
  O: 1,
  P: 4,
  Q: 10,
  R: 2,
  S: 2,
  T: 2,
  U: 1,
  V: 5,
  W: 5,
  X: 8,
  Y: 5,
  Z: 10,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function defaultRandom(): number {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] / 0xffffffff;
}

function sortCandidatesByStrength(
  left: DeterministicShowdownCandidate,
  right: DeterministicShowdownCandidate,
): number {
  if (right.staticScore.total !== left.staticScore.total) {
    return right.staticScore.total - left.staticScore.total;
  }
  if (right.tileCount !== left.tileCount) {
    return right.tileCount - left.tileCount;
  }
  if (right.highestTileScore !== left.highestTileScore) {
    return right.highestTileScore - left.highestTileScore;
  }
  if (right.baseValueSum !== left.baseValueSum) {
    return right.baseValueSum - left.baseValueSum;
  }
  return left.word.localeCompare(right.word);
}

function scoreCandidateCommonLetters(word: string): number {
  return word.split("").reduce((total, letter) => total + (COMMON_LETTERS.has(letter) ? 1 : 0), 0);
}

function scoreCandidateUnusualLetters(word: string): number {
  return word.split("").reduce((total, letter) => total + (LETTER_RARITY_SCORE[letter] ?? 0), 0);
}

function buildCandidate(
  word: string,
  tiles: SolverWordTile[],
  choiceResolutions?: SolverChoiceResolutions,
): DeterministicShowdownCandidate {
  return {
    word,
    tiles,
    choiceResolutions,
    staticScore: calculateStaticShowdownScore(tiles),
    tileCount: tiles.length,
    baseValueSum: tiles.reduce((total, tile) => total + tile.baseValue, 0),
    highestTileScore: Math.max(
      0,
      ...tiles.map((tile) =>
        tile.baseValue *
        (tile.multiplier === "3L" ? 3 : tile.multiplier === "2L" ? 2 : 1),
      ),
    ),
    commonLetterScore: scoreCandidateCommonLetters(word),
    unusualLetterScore: scoreCandidateUnusualLetters(word),
    uniqueLetterCount: new Set(word.split("")).size,
  };
}

export function serializeAvailableShowdownTiles(
  availableTiles: AvailableShowdownTile[],
): Array<{
  ref: string;
  source: "hand" | "community";
  cardIndex: number;
  wasChoice: boolean;
  choices: Array<{ letter: string; baseValue: number; multiplier?: "2L" | "3L" }>;
}> {
  return availableTiles.map((tile) => ({
    ref: tile.ref,
    source: tile.source,
    cardIndex: tile.cardIndex,
    wasChoice: tile.wasChoice,
    choices: tile.choices.map((choice) => ({
      letter: choice.letter,
      baseValue: choice.baseValue,
      multiplier: choice.multiplier,
    })),
  }));
}

export function buildAvailableShowdownTiles(
  handTiles: SolveShowdownHandTile[],
  communityTiles: SolveShowdownCommunityTile[],
): AvailableShowdownTile[] {
  const availableTiles: AvailableShowdownTile[] = [];

  handTiles.forEach((tile, index) => {
    if (tile.kind === "single") {
      availableTiles.push({
        ref: `H${index}`,
        source: "hand",
        cardIndex: index,
        wasChoice: false,
        choices: [{
          letter: tile.letter.toUpperCase(),
          baseValue: tile.baseValue,
          multiplier: tile.multiplier,
        }],
      });
      return;
    }

    availableTiles.push({
      ref: `H${index}`,
      source: "hand",
      cardIndex: index,
      wasChoice: true,
      choices: tile.options.map((letter, optionIndex) => ({
        letter: letter.toUpperCase(),
        baseValue: tile.baseValues[optionIndex] ?? tile.baseValues[0] ?? 0,
        multiplier: tile.multiplier,
      })),
    });
  });

  communityTiles
    .filter((tile) => tile.revealed)
    .forEach((tile, index) => {
      if (tile.kind === "single") {
        availableTiles.push({
          ref: `C${index}`,
          source: "community",
          cardIndex: index,
          wasChoice: false,
          choices: [{
            letter: tile.letter.toUpperCase(),
            baseValue: tile.baseValue,
            multiplier: tile.multiplier,
          }],
        });
        return;
      }

      availableTiles.push({
        ref: `C${index}`,
        source: "community",
        cardIndex: index,
        wasChoice: true,
        choices: tile.options.map((letter, optionIndex) => ({
          letter: letter.toUpperCase(),
          baseValue: tile.baseValues[optionIndex] ?? tile.baseValues[0] ?? 0,
          multiplier: tile.multiplier,
        })),
      });
    });

  return availableTiles;
}

export function buildChoiceResolutionsFromTiles(
  tiles: SolverWordTile[],
): SolverChoiceResolutions | undefined {
  const choiceResolutions: {
    hand: Record<string, string>;
    community: Record<string, string>;
  } = {
    hand: {},
    community: {},
  };

  for (const tile of tiles) {
    if (!tile.wasChoice || tile.cardIndex === undefined) {
      continue;
    }

    if (tile.source === "hand") {
      choiceResolutions.hand[tile.cardIndex.toString()] = tile.letter;
    } else {
      choiceResolutions.community[tile.cardIndex.toString()] = tile.letter;
    }
  }

  return Object.keys(choiceResolutions.hand).length > 0 ||
    Object.keys(choiceResolutions.community).length > 0
    ? choiceResolutions
    : undefined;
}

function materializeShowdownTile(
  tile: AvailableShowdownTile,
  letter: string,
  explicitChoice: string | undefined,
  respectExplicitChoice: boolean,
): SolverWordTile | null {
  const normalizedLetter = letter.toUpperCase();
  const normalizedExplicitChoice = explicitChoice?.toUpperCase();

  if (
    tile.wasChoice &&
    respectExplicitChoice &&
    normalizedExplicitChoice &&
    normalizedExplicitChoice !== normalizedLetter
  ) {
    return null;
  }

  const matchingChoice = tile.choices.find((choice) => choice.letter === normalizedLetter);
  if (!matchingChoice) {
    return null;
  }

  return {
    letter: matchingChoice.letter,
    baseValue: matchingChoice.baseValue,
    multiplier: matchingChoice.multiplier,
    source: tile.source,
    cardIndex: tile.cardIndex,
    wasChoice: tile.wasChoice,
  };
}

export function tryBuildWordFromAvailableTiles(
  word: string,
  availableTiles: AvailableShowdownTile[],
  preferredTileRefs: string[],
  explicitChoices: Record<string, string>,
): {
  tiles: SolverWordTile[];
  choiceResolutions?: SolverChoiceResolutions;
} | null {
  const normalizedWord = word.trim().toUpperCase();
  if (!normalizedWord || normalizedWord.length > availableTiles.length) {
    return null;
  }

  const wordLetters = normalizedWord.split("");
  const preferredRefIndex = new Map<string, number>();
  preferredTileRefs.forEach((ref, index) => {
    const normalizedRef = ref.toUpperCase();
    if (!preferredRefIndex.has(normalizedRef)) {
      preferredRefIndex.set(normalizedRef, index);
    }
  });

  const tryAssemble = (respectExplicitChoice: boolean) => {
    const used = new Set<number>();
    const assembledTiles: SolverWordTile[] = [];

    const search = (position: number): boolean => {
      if (position >= wordLetters.length) {
        return true;
      }

      const targetLetter = wordLetters[position];
      const candidateIndexes = availableTiles
        .map((tile, index) => ({ tile, index }))
        .filter(({ tile, index }) => {
          if (used.has(index)) {
            return false;
          }

          return materializeShowdownTile(
            tile,
            targetLetter,
            explicitChoices[tile.ref],
            respectExplicitChoice,
          ) !== null;
        })
        .sort((left, right) => {
          const leftExactMatch = preferredTileRefs[position]?.toUpperCase() === left.tile.ref ? 0 : 1;
          const rightExactMatch = preferredTileRefs[position]?.toUpperCase() === right.tile.ref ? 0 : 1;
          if (leftExactMatch !== rightExactMatch) {
            return leftExactMatch - rightExactMatch;
          }

          const leftOrder = preferredRefIndex.get(left.tile.ref) ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = preferredRefIndex.get(right.tile.ref) ?? Number.MAX_SAFE_INTEGER;
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }

          if (left.tile.wasChoice !== right.tile.wasChoice) {
            return Number(left.tile.wasChoice) - Number(right.tile.wasChoice);
          }

          return left.index - right.index;
        });

      for (const { tile, index } of candidateIndexes) {
        const materializedTile = materializeShowdownTile(
          tile,
          targetLetter,
          explicitChoices[tile.ref],
          respectExplicitChoice,
        );
        if (!materializedTile) {
          continue;
        }

        used.add(index);
        assembledTiles.push(materializedTile);

        if (search(position + 1)) {
          return true;
        }

        assembledTiles.pop();
        used.delete(index);
      }

      return false;
    };

    return search(0) ? assembledTiles : null;
  };

  const assembledTiles = tryAssemble(true) ?? tryAssemble(false);

  if (!assembledTiles) {
    return null;
  }

  return {
    tiles: assembledTiles,
    choiceResolutions: buildChoiceResolutionsFromTiles(assembledTiles),
  };
}

function collectPossibleSignatures(availableTiles: AvailableShowdownTile[]): string[] {
  const signatures = new Set<string>();

  const visit = (index: number, letters: string[]) => {
    if (letters.length > 7) {
      return;
    }

    if (letters.length >= 2) {
      signatures.add(buildWordSignature(letters));
    }

    if (index >= availableTiles.length) {
      return;
    }

    visit(index + 1, letters);

    const uniqueChoices = new Map<string, { letter: string }>();
    for (const choice of availableTiles[index].choices) {
      if (!uniqueChoices.has(choice.letter)) {
        uniqueChoices.set(choice.letter, { letter: choice.letter });
      }
    }

    for (const choice of uniqueChoices.values()) {
      letters.push(choice.letter);
      visit(index + 1, letters);
      letters.pop();
    }
  };

  visit(0, []);

  return [...signatures];
}

function buildEvaluation(
  candidates: DeterministicShowdownCandidate[],
): DeterministicHandEvaluation {
  const bestCandidate = candidates[0];
  if (!bestCandidate) {
    return {
      bestWord: "",
      bestScore: 0,
      candidateCount: 0,
      topCandidates: [],
      percentileEstimate: 0,
      potentialEstimate: 0,
    };
  }

  const nearBestCount = candidates.filter(
    (candidate) => candidate.staticScore.total >= bestCandidate.staticScore.total - 3,
  ).length;

  return {
    bestWord: bestCandidate.word,
    bestScore: bestCandidate.staticScore.total,
    candidateCount: candidates.length,
    topCandidates: candidates.slice(0, 5).map((candidate) => ({
      word: candidate.word,
      score: candidate.staticScore.total,
      tileCount: candidate.tileCount,
    })),
    percentileEstimate: clamp((bestCandidate.staticScore.total - 11) / 15, 0, 1),
    potentialEstimate: clamp(nearBestCount / Math.min(5, candidates.length || 1), 0, 1),
  };
}

function sortCandidatesForPersonality(
  candidates: DeterministicShowdownCandidate[],
  personality: AIPersonality,
): DeterministicShowdownCandidate[] {
  const sorted = [...candidates];

  sorted.sort((left, right) => {
    switch (personality) {
      case AI_PERSONALITIES.CAUTIOUS:
        if (right.commonLetterScore !== left.commonLetterScore) {
          return right.commonLetterScore - left.commonLetterScore;
        }
        if (left.tileCount !== right.tileCount) {
          return left.tileCount - right.tileCount;
        }
        break;
      case AI_PERSONALITIES.AGGRESSIVE:
        if (right.staticScore.total !== left.staticScore.total) {
          return right.staticScore.total - left.staticScore.total;
        }
        if (right.tileCount !== left.tileCount) {
          return right.tileCount - left.tileCount;
        }
        if (right.highestTileScore !== left.highestTileScore) {
          return right.highestTileScore - left.highestTileScore;
        }
        if (right.baseValueSum !== left.baseValueSum) {
          return right.baseValueSum - left.baseValueSum;
        }
        break;
      case AI_PERSONALITIES.CREATIVE:
        if (right.unusualLetterScore !== left.unusualLetterScore) {
          return right.unusualLetterScore - left.unusualLetterScore;
        }
        if (right.uniqueLetterCount !== left.uniqueLetterCount) {
          return right.uniqueLetterCount - left.uniqueLetterCount;
        }
        break;
      case AI_PERSONALITIES.BALANCED:
      default:
        break;
    }

    return sortCandidatesByStrength(left, right);
  });

  return sorted;
}

function selectCandidate(
  candidates: DeterministicShowdownCandidate[],
  difficulty: AIDifficulty,
  personality: AIPersonality,
  randomFn: () => number,
): DeterministicShowdownCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  const windowSize = Math.min(getShowdownSelectionWindow(difficulty), candidates.length);
  const shortlist = sortCandidatesForPersonality(candidates.slice(0, windowSize), personality);

  const weights = shortlist.map((_, index) => {
    const rankWeight = windowSize - index;
    switch (personality) {
      case AI_PERSONALITIES.AGGRESSIVE:
        return rankWeight * rankWeight;
      case AI_PERSONALITIES.CAUTIOUS:
        return Math.max(1, Math.ceil(rankWeight / 2));
      case AI_PERSONALITIES.CREATIVE:
        return Math.max(1, rankWeight);
      case AI_PERSONALITIES.BALANCED:
      default:
        return rankWeight;
    }
  });

  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  let cursor = randomFn() * totalWeight;

  for (let index = 0; index < shortlist.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) {
      return shortlist[index];
    }
  }

  return shortlist[shortlist.length - 1] ?? null;
}

export function evaluateDeterministicShowdownHand(args: {
  difficulty?: AIDifficulty;
  handTiles: SolveShowdownHandTile[];
  communityTiles: SolveShowdownCommunityTile[];
}): {
  availableTiles: AvailableShowdownTile[];
  candidates: DeterministicShowdownCandidate[];
  evaluation: DeterministicHandEvaluation;
} {
  const availableTiles = buildAvailableShowdownTiles(args.handTiles, args.communityTiles);
  const signatures = collectPossibleSignatures(availableTiles);
  const candidates: DeterministicShowdownCandidate[] = [];

  for (const signature of signatures) {
    for (const word of getWordsForSignature(signature)) {
      if (word.length > availableTiles.length) {
        continue;
      }

      const reconstruction = tryBuildWordFromAvailableTiles(word, availableTiles, [], {});
      if (!reconstruction) {
        continue;
      }

      candidates.push(
        buildCandidate(word, reconstruction.tiles, reconstruction.choiceResolutions),
      );
    }
  }

  candidates.sort(sortCandidatesByStrength);

  return {
    availableTiles,
    candidates,
    evaluation: buildEvaluation(candidates),
  };
}

export function solveDeterministicShowdownWord(args: {
  difficulty?: AIDifficulty;
  personality?: AIPersonality;
  handTiles: SolveShowdownHandTile[];
  communityTiles: SolveShowdownCommunityTile[];
  randomFn?: () => number;
}): DeterministicShowdownSelection | null {
  const difficulty = args.difficulty ?? AI_DIFFICULTY.MEDIUM;
  const personality = args.personality ?? AI_PERSONALITIES.BALANCED;
  const randomFn = args.randomFn ?? defaultRandom;
  const { candidates, evaluation } = evaluateDeterministicShowdownHand({
    difficulty,
    handTiles: args.handTiles,
    communityTiles: args.communityTiles,
  });

  const selectedCandidate = selectCandidate(candidates, difficulty, personality, randomFn);
  if (!selectedCandidate) {
    return null;
  }

  return {
    word: selectedCandidate.word,
    tiles: selectedCandidate.tiles,
    choiceResolutions: selectedCandidate.choiceResolutions,
    estimatedScore: selectedCandidate.staticScore.total,
    reasoning: `Deterministic ${personality} bot selected ${selectedCandidate.word} from ${candidates.length} valid candidates using a top-${Math.min(
      getShowdownSelectionWindow(difficulty),
      candidates.length,
    )} ${difficulty} window.`,
    personality,
    evaluation,
  };
}
