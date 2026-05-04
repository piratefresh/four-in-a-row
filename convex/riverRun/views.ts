import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { getSoloRunAccessForViewer } from "./access";

export function toSoloRunView(room: Doc<"rooms">, run: Doc<"riverRunRuns">) {
  const revealedTiles = run.tiles
    .map((entry, index) => ({ index, ...entry }))
    .filter((entry) => entry.revealed);
  const terminalState =
    run.status === "failed" || run.status === "completed" ? run.status : null;

  return {
    id: run._id,
    roomId: room._id,
    roomCode: room.code,
    playerId: run.playerId,
    target: run.currentTarget,
    targetCurve: run.targetCurve,
    targetIndex: run.targetIndex,
    phase: run.phase,
    status: run.status,
    terminalState,
    tiles: run.tiles.map((entry, index) => ({ index, ...entry })),
    revealedTiles,
    credits: run.credits,
    submissions: run.submissions ?? [],
    handTotal: run.handScore,
    totalScore: run.totalScore,
    canSubmit: run.status === "active",
    canShop: run.status === "shop",
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

export async function getSoloRunForViewer(
  ctx: QueryCtx,
  args: { code?: string; runId?: Doc<"riverRunRuns">["_id"] },
) {
  const accessResult = await getSoloRunAccessForViewer(ctx, args);
  if (accessResult.result !== "ok") {
    return accessResult;
  }

  return {
    result: "ok" as const,
    run: toSoloRunView(accessResult.access.room, accessResult.access.run),
  };
}
