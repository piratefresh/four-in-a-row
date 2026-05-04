import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { PLAYER_NAME_MAX_LENGTH } from "../constants";
import {
  generateUniqueRoomCode,
  getAnyActiveAuthedPlayer,
  normalizeName,
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
} from "../rooms/helpers";
import { leavePlayer } from "../rooms/players";

type RiverRunReadCtx = QueryCtx | MutationCtx;

export type CreatedRunContainer = {
  roomId: Doc<"rooms">["_id"];
  code: string;
  playerId: Doc<"players">["_id"];
};

function normalizeRunContainerCode(rawCode: string) {
  const code = normalizeRoomCode(rawCode);
  if (!/^[A-Z0-9]+$/.test(code) || code.length !== ROOM_CODE_LENGTH) {
    throw new ConvexError({
      code: "INVALID_CODE",
      message: `Room code must be ${ROOM_CODE_LENGTH} alphanumeric characters.`,
    });
  }
  return code;
}

function normalizeRunContainerPlayerName(rawName: string | undefined) {
  const name = normalizeName(rawName ?? "Player");
  if (name.length === 0 || name.length > PLAYER_NAME_MAX_LENGTH) {
    throw new ConvexError({
      code: "INVALID_NAME",
      message: `Name must be between 1 and ${PLAYER_NAME_MAX_LENGTH} characters.`,
    });
  }
  return name;
}

export async function createRunContainerForCurrentUser(
  ctx: MutationCtx,
  args: {
    authUserId: string;
    name?: string;
    now: number;
  },
): Promise<CreatedRunContainer> {
  const name = normalizeRunContainerPlayerName(args.name);
  const existingAuthedPlayer = await getAnyActiveAuthedPlayer(
    ctx,
    args.authUserId,
  );
  if (existingAuthedPlayer) {
    await leavePlayer(ctx, existingAuthedPlayer);
  }

  const code = await generateUniqueRoomCode(ctx);
  const roomId = await ctx.db.insert("rooms", {
    code,
    title: "River Run",
    status: "open",
    mode: "riverRunSolo",
    maxPlayers: 1,
    createdAt: args.now,
    lastActiveAt: args.now,
  });
  const playerId = await ctx.db.insert("players", {
    roomId,
    authUserId: args.authUserId,
    name,
    seatIndex: 0,
    isHost: true,
    status: "active",
    readyStatus: true,
    lastSeenAt: args.now,
  });

  await ctx.db.patch(roomId, { hostPlayerId: playerId });

  return { roomId, code, playerId };
}

export async function getRunContainerByCode(
  ctx: RiverRunReadCtx,
  rawCode: string,
): Promise<Doc<"rooms"> | null> {
  const code = normalizeRunContainerCode(rawCode);
  const room = await ctx.db
    .query("rooms")
    .withIndex("code", (q) => q.eq("code", code))
    .unique();

  if (!room || room.mode !== "riverRunSolo") {
    return null;
  }

  return room;
}

export async function getRunContainerForRun(
  ctx: RiverRunReadCtx,
  run: Doc<"riverRunRuns">,
): Promise<Doc<"rooms"> | null> {
  const room = await ctx.db.get(run.roomId);
  if (!room || room.mode !== "riverRunSolo") {
    return null;
  }

  return room;
}
