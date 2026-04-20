import { describe, expect, it } from "vitest";
import {
  AI_DIFFICULTY,
  AI_PERSONALITIES,
  type AIDifficulty,
} from "./aiStrategy";
import {
  buildAvailableShowdownTiles,
  evaluateDeterministicShowdownHand,
  solveDeterministicShowdownWord,
  tryBuildWordFromAvailableTiles,
  type SolveShowdownCommunityTile,
  type SolveShowdownHandTile,
} from "./showdownSolver";

const fixtureOne = {
  handTiles: [
    { kind: "single", letter: "R", baseValue: 1 },
    { kind: "single", letter: "B", baseValue: 3 },
  ] satisfies SolveShowdownHandTile[],
  communityTiles: [
    { kind: "choice", options: ["A", "E"], baseValues: [1, 1], revealed: true },
    { kind: "single", letter: "C", baseValue: 3, revealed: true },
    { kind: "choice", options: ["L", "D"], baseValues: [1, 2], revealed: true },
    { kind: "single", letter: "O", baseValue: 1, revealed: true },
    { kind: "single", letter: "U", baseValue: 1, revealed: true },
  ] satisfies SolveShowdownCommunityTile[],
};

const fixtureTwo = {
  handTiles: [
    { kind: "single", letter: "E", baseValue: 1 },
    { kind: "single", letter: "O", baseValue: 1 },
  ] satisfies SolveShowdownHandTile[],
  communityTiles: [
    { kind: "choice", options: ["A", "E"], baseValues: [1, 1], revealed: true },
    { kind: "single", letter: "C", baseValue: 3, revealed: true },
    { kind: "choice", options: ["L", "D"], baseValues: [1, 2], revealed: true },
    { kind: "single", letter: "O", baseValue: 1, revealed: true },
    { kind: "single", letter: "U", baseValue: 1, revealed: true },
  ] satisfies SolveShowdownCommunityTile[],
};

describe("deterministic showdown solver", () => {
  it("reconstructs exact tiles and choice resolutions for a valid word", () => {
    const availableTiles = buildAvailableShowdownTiles(
      [
        { kind: "single", letter: "F", baseValue: 5 },
        { kind: "single", letter: "A", baseValue: 1 },
      ],
      [
        { kind: "choice", options: ["C", "D"], baseValues: [4, 3], revealed: true },
        { kind: "single", letter: "E", baseValue: 1, revealed: true },
      ],
    );

    const reconstruction = tryBuildWordFromAvailableTiles("FACE", availableTiles, [], {});

    expect(reconstruction).not.toBeNull();
    expect(reconstruction?.tiles.map((tile) => tile.letter).join("")).toBe("FACE");
    expect(reconstruction?.tiles.map((tile) => `${tile.source}:${tile.cardIndex}`)).toEqual([
      "hand:0",
      "hand:1",
      "community:0",
      "community:1",
    ]);
    expect(reconstruction?.choiceResolutions).toEqual({
      hand: {},
      community: { "0": "C" },
    });
  });

  it("rejects impossible logged words and words longer than available tiles", () => {
    const availableTiles = buildAvailableShowdownTiles(
      fixtureOne.handTiles,
      fixtureOne.communityTiles,
    );

    expect(tryBuildWordFromAvailableTiles("BROCCOLI", availableTiles, [], {})).toBeNull();
    expect(tryBuildWordFromAvailableTiles("COURBULA", availableTiles, [], {})).toBeNull();
  });

  it("returns no candidates when the rack cannot make any dictionary word", () => {
    const impossibleHandTiles: SolveShowdownHandTile[] = [
      { kind: "single", letter: "Q", baseValue: 10 },
      { kind: "single", letter: "Z", baseValue: 10 },
    ];
    const impossibleCommunityTiles: SolveShowdownCommunityTile[] = [
      { kind: "single", letter: "X", baseValue: 8, revealed: true },
      { kind: "single", letter: "J", baseValue: 8, revealed: true },
      { kind: "single", letter: "K", baseValue: 5, revealed: true },
      { kind: "single", letter: "V", baseValue: 5, revealed: true },
      { kind: "single", letter: "B", baseValue: 4, revealed: true },
    ];
    const evaluation = evaluateDeterministicShowdownHand({
      handTiles: impossibleHandTiles,
      communityTiles: impossibleCommunityTiles,
    });

    expect(evaluation.evaluation.bestWord).toBe("");
    expect(evaluation.evaluation.candidateCount).toBe(0);
    expect(solveDeterministicShowdownWord({
      difficulty: AI_DIFFICULTY.MEDIUM,
      personality: AI_PERSONALITIES.BALANCED,
      handTiles: impossibleHandTiles,
      communityTiles: impossibleCommunityTiles,
      randomFn: () => 0,
    })).toBeNull();
  });

  it("selects only from the allowed difficulty window", () => {
    const evaluation = evaluateDeterministicShowdownHand(fixtureOne);
    const rankedWords = evaluation.candidates.map((candidate) => candidate.word);
    const scenarios: Array<{ difficulty: AIDifficulty; maxIndex: number }> = [
      { difficulty: AI_DIFFICULTY.EASY, maxIndex: 12 },
      { difficulty: AI_DIFFICULTY.MEDIUM, maxIndex: 5 },
      { difficulty: AI_DIFFICULTY.HARD, maxIndex: 2 },
    ];

    for (const scenario of scenarios) {
      const selection = solveDeterministicShowdownWord({
        ...fixtureOne,
        difficulty: scenario.difficulty,
        personality: AI_PERSONALITIES.BALANCED,
        randomFn: () => 0.999999,
      });

      expect(selection).not.toBeNull();
      expect(rankedWords.slice(0, scenario.maxIndex)).toContain(selection!.word);
    }
  });

  it("lets cautious bots prefer steadier words inside the medium window", () => {
    const balanced = solveDeterministicShowdownWord({
      ...fixtureOne,
      difficulty: AI_DIFFICULTY.MEDIUM,
      personality: AI_PERSONALITIES.BALANCED,
      randomFn: () => 0,
    });
    const cautious = solveDeterministicShowdownWord({
      ...fixtureOne,
      difficulty: AI_DIFFICULTY.MEDIUM,
      personality: AI_PERSONALITIES.CAUTIOUS,
      randomFn: () => 0,
    });

    expect(balanced?.word).toBe("BUCARDO");
    expect(cautious?.word).toBe("BECURL");
    expect(cautious?.tiles.length).toBeLessThan(balanced!.tiles.length);
    expect(cautious?.estimatedScore).toBeLessThan(balanced!.estimatedScore);
  });

  it("lets creative bots prefer unusual valid alternatives inside the same window", () => {
    const balanced = solveDeterministicShowdownWord({
      ...fixtureTwo,
      difficulty: AI_DIFFICULTY.MEDIUM,
      personality: AI_PERSONALITIES.BALANCED,
      randomFn: () => 0,
    });
    const creative = solveDeterministicShowdownWord({
      ...fixtureTwo,
      difficulty: AI_DIFFICULTY.MEDIUM,
      personality: AI_PERSONALITIES.CREATIVE,
      randomFn: () => 0,
    });

    expect(balanced?.word).toBe("COOEED");
    expect(creative?.word).toBe("COULEE");
    expect(creative?.estimatedScore).toBeLessThanOrEqual(
      balanced?.estimatedScore ?? Number.POSITIVE_INFINITY,
    );
  });

  it("keeps aggressive bots anchored to the highest-ranked option", () => {
    const balanced = solveDeterministicShowdownWord({
      ...fixtureOne,
      difficulty: AI_DIFFICULTY.MEDIUM,
      personality: AI_PERSONALITIES.BALANCED,
      randomFn: () => 0,
    });
    const aggressive = solveDeterministicShowdownWord({
      ...fixtureOne,
      difficulty: AI_DIFFICULTY.MEDIUM,
      personality: AI_PERSONALITIES.AGGRESSIVE,
      randomFn: () => 0,
    });

    expect(aggressive?.word).toBe(balanced?.word);
    expect(aggressive?.estimatedScore).toBe(balanced?.estimatedScore);
  });
});
