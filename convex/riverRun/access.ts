import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getAuthenticatedUserId } from "../rooms/helpers";
import {
  getRunContainerByCode,
  getRunContainerForRun,
} from "./container";

type RiverRunReadCtx = QueryCtx | MutationCtx;

type SoloRunLookup = {
  code?: string;
  runId?: Doc<"riverRunRuns">["_id"];
};

export type AuthorizedSoloRun = {
  room: Doc<"rooms">;
  run: Doc<"riverRunRuns">;
};

export async function getSoloRunDocumentByCode(
  ctx: RiverRunReadCtx,
  rawCode: string,
): Promise<Doc<"riverRunRuns"> | null> {
  const container = await getRunContainerByCode(ctx, rawCode);
  if (!container) {
    return null;
  }

  return await ctx.db
    .query("riverRunRuns")
    .withIndex("by_roomId", (q) => q.eq("roomId", container._id))
    .unique();
}

async function loadSoloRun(
  ctx: RiverRunReadCtx,
  args: SoloRunLookup,
): Promise<AuthorizedSoloRun | null> {
  let room: Doc<"rooms"> | null = null;
  let run: Doc<"riverRunRuns"> | null = null;

  if (args.runId) {
    run = await ctx.db.get(args.runId);
    room = run ? await getRunContainerForRun(ctx, run) : null;
  } else if (args.code) {
    run = await getSoloRunDocumentByCode(ctx, args.code);
    room = run ? await getRunContainerForRun(ctx, run) : null;
  } else {
    throw new ConvexError({
      code: "MISSING_LOOKUP",
      message: "Provide a room code or run id.",
    });
  }

  if (!room || !run) {
    return null;
  }

  return { room, run };
}

export async function getSoloRunAccessForViewer(
  ctx: QueryCtx,
  args: SoloRunLookup,
) {
  const authUserId = await getAuthenticatedUserId(ctx);
  if (!authUserId) {
    return { result: "unauthorized" as const };
  }

  const access = await loadSoloRun(ctx, args);
  if (!access || access.run.authUserId !== authUserId) {
    return { result: "notFound" as const };
  }

  return { result: "ok" as const, access };
}

export async function requireSoloRunForCurrentUser(
  ctx: MutationCtx,
  args: SoloRunLookup,
) {
  const authUserId = await getAuthenticatedUserId(ctx);
  if (!authUserId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }

  const access = await loadSoloRun(ctx, args);
  if (!access || access.run.authUserId !== authUserId) {
    throw new ConvexError({
      code: "RUN_NOT_FOUND",
      message: "River Run run does not exist.",
    });
  }

  return access;
}
