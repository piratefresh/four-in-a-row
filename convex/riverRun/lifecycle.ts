import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  RIVER_RUN_INITIAL_CREDITS,
  RIVER_RUN_INITIAL_SCORE,
  RIVER_RUN_TARGET_CURVE,
  RIVER_RUN_TILE_COUNT,
  createRiverRunTile,
} from "../riverRunState";
import { createShuffledDeck } from "../gameState";
import { requireVerifiedUser } from "../verifyUser";
import { getProgressionPatch } from "./progression";
import { scoreRiverRunPhase } from "./scoring";
import { requireSoloRunForCurrentUser } from "./access";
import { createRunContainerForCurrentUser } from "./container";

export async function createSoloRunForCurrentUser(
  ctx: MutationCtx,
  args: { name?: string },
) {
  const { authUserId } = await requireVerifiedUser(ctx);
  const now = Date.now();
  const container = await createRunContainerForCurrentUser(ctx, {
    authUserId,
    name: args.name,
    now,
  });

  const deck = createShuffledDeck();
  const tiles = deck
    .slice(0, RIVER_RUN_TILE_COUNT)
    .map((tile, index) => createRiverRunTile(tile, index));
  const runId = await ctx.db.insert("riverRunRuns", {
    roomId: container.roomId,
    playerId: container.playerId,
    authUserId,
    targetCurve: [...RIVER_RUN_TARGET_CURVE],
    targetIndex: 0,
    currentTarget: RIVER_RUN_TARGET_CURVE[0],
    phase: "deal",
    tiles,
    submissions: [],
    credits: RIVER_RUN_INITIAL_CREDITS,
    handScore: RIVER_RUN_INITIAL_SCORE,
    totalScore: RIVER_RUN_INITIAL_SCORE,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  return {
    ok: true,
    roomId: container.roomId,
    code: container.code,
    playerId: container.playerId,
    runId,
    target: RIVER_RUN_TARGET_CURVE[0],
    phase: "deal" as const,
    status: "active" as const,
  };
}

export async function submitPhaseWordForCurrentUser(
  ctx: MutationCtx,
  args: {
    code?: string;
    runId?: Doc<"riverRunRuns">["_id"];
    word: string;
  },
) {
  const { run } = await requireSoloRunForCurrentUser(ctx, {
    code: args.code,
    runId: args.runId,
  });

  if (run.status !== "active") {
    throw new ConvexError({
      code: "INVALID_RUN_STATUS",
      message: "Words can only be submitted for active runs.",
    });
  }

  const submittedAt = Date.now();
  const scoring = scoreRiverRunPhase({
    run,
    word: args.word,
    submittedAt,
  });
  const progression = getProgressionPatch(run, scoring.handScore);

  await ctx.db.patch(run._id, {
    submissions: scoring.submissions,
    handScore: scoring.handScore,
    phase: progression.phase,
    tiles: progression.tiles,
    status: progression.status,
    targetIndex: progression.targetIndex,
    currentTarget: progression.currentTarget,
    totalScore: progression.totalScore,
    updatedAt: submittedAt,
  });

  return {
    ok: true,
    submission: scoring.submission,
    handScore: scoring.handScore,
    phase: progression.phase,
    status: progression.status,
    target: progression.currentTarget,
    totalScore: progression.totalScore,
  };
}
