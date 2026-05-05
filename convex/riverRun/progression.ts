import type { Doc } from "../_generated/dataModel";
import {
  getNextRiverRunPhase,
  revealRiverRunTilesForPhase,
  type RiverRunPhase,
} from "../riverRunState";

export function getProgressionPatch(
  run: Doc<"riverRunRuns">,
  handScore: number,
) {
  const phase = run.phase as RiverRunPhase;
  const nextPhase = getNextRiverRunPhase(phase);
  if (nextPhase) {
    return {
      phase: nextPhase,
      tiles: revealRiverRunTilesForPhase(run.tiles, nextPhase),
      status: "active" as const,
      currentTarget: run.currentTarget,
      targetIndex: run.targetIndex,
      totalScore: run.totalScore,
    };
  }

  const totalScore = run.totalScore + handScore;
  const passedTarget = handScore >= run.currentTarget;
  if (!passedTarget) {
    return {
      phase,
      tiles: run.tiles,
      status: "failed" as const,
      currentTarget: run.currentTarget,
      targetIndex: run.targetIndex,
      totalScore,
    };
  }

  const nextTargetIndex = run.targetIndex + 1;
  const completed = nextTargetIndex >= run.targetCurve.length;
  if (completed) {
    return {
      phase,
      tiles: run.tiles,
      status: "completed" as const,
      currentTarget: run.currentTarget,
      targetIndex: run.targetIndex,
      totalScore,
    };
  }

  return {
    phase,
    tiles: run.tiles,
    status: "shop" as const,
    currentTarget: run.targetCurve[nextTargetIndex]!,
    targetIndex: nextTargetIndex,
    totalScore,
  };
}
