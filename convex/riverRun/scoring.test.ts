import { describe, expect, it } from "vitest";
import type { Doc, Id } from "../_generated/dataModel";
import type {
  RiverRunPhase,
  RiverRunSubmission,
  RiverRunTile,
} from "../riverRunState";
import { scorePhaseWord, scoreRiverRunPhase } from "./scoring";

function singleTile(
  letter: string,
  baseValue: number,
  multiplier?: "2L" | "3L",
): RiverRunTile {
  return {
    tile: {
      kind: "single",
      letter,
      baseValue,
      multiplier,
    },
    revealed: true,
  };
}

function hiddenSingleTile(letter: string, baseValue: number): RiverRunTile {
  return {
    tile: {
      kind: "single",
      letter,
      baseValue,
    },
    revealed: false,
  };
}

function submission(phase: RiverRunPhase, score: number): RiverRunSubmission {
  return {
    phase,
    word: phase.toUpperCase(),
    score,
    valid: true,
    tiles: [],
    scoreBreakdown: {
      letterPoints: score,
      multiplierBonus: 0,
      lengthBonus: 0,
    },
    submittedAt: 1,
  };
}

function runFixture(
  phase: RiverRunPhase,
  tiles: RiverRunTile[],
  submissions: RiverRunSubmission[],
): Doc<"riverRunRuns"> {
  return {
    _id: "run-id" as Id<"riverRunRuns">,
    _creationTime: 1,
    roomId: "room-id" as Id<"rooms">,
    playerId: "player-id" as Id<"players">,
    authUserId: "auth-user-id",
    targetCurve: [45],
    targetIndex: 0,
    currentTarget: 45,
    phase,
    tiles,
    submissions,
    credits: 0,
    handScore: 0,
    totalScore: 0,
    status: "active",
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("River Run scoring", () => {
  it("scores a valid phase word with letter, multiplier, and length points", () => {
    const scored = scorePhaseWord("ace", [
      singleTile("A", 1),
      singleTile("C", 3, "3L"),
      singleTile("E", 1),
    ]);

    expect(scored).toMatchObject({
      word: "ACE",
      valid: true,
      score: 14,
      scoreBreakdown: {
        letterPoints: 5,
        multiplierBonus: 6,
        lengthBonus: 3,
      },
    });
  });

  it("requires submitted words to be buildable from revealed tiles", () => {
    const scored = scoreRiverRunPhase({
      run: runFixture(
        "deal",
        [singleTile("A", 1), singleTile("C", 3), hiddenSingleTile("E", 1)],
        [],
      ),
      word: "ace",
      submittedAt: 2,
    }).submission;

    expect(scored).toMatchObject({
      valid: false,
      score: 0,
      invalidReason: "Word cannot be built from revealed tiles.",
      tiles: [],
    });
  });

  it("replaces the current phase submission and returns the hand total", () => {
    const result = scoreRiverRunPhase({
      run: runFixture(
        "turn",
        [singleTile("A", 1), singleTile("C", 3, "3L"), singleTile("E", 1)],
        [submission("deal", 8), submission("turn", 5)],
      ),
      word: "ace",
      submittedAt: 2,
    });

    expect(result.phase).toBe("turn");
    expect(result.submission.score).toBe(14);
    expect(result.submissions.map((entry) => [entry.phase, entry.score]))
      .toEqual([
        ["deal", 8],
        ["turn", 14],
      ]);
    expect(result.handScore).toBe(22);
  });
});
