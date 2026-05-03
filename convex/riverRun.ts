import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  RIVER_RUN_INITIAL_CREDITS,
  RIVER_RUN_INITIAL_SCORE,
  RIVER_RUN_TARGET_CURVE,
  RIVER_RUN_TILE_COUNT,
  createRiverRunTile,
} from "./riverRunState";
import { createShuffledDeck } from "./gameState";
import { PLAYER_NAME_MAX_LENGTH } from "./constants";
import { requireVerifiedUser } from "./verifyUser";
import {
  generateUniqueRoomCode,
  getAuthenticatedUserId,
  getAnyActiveAuthedPlayer,
  normalizeName,
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
} from "./rooms/helpers";
import { leavePlayer } from "./rooms/players";

export const createSoloRun = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { authUserId } = await requireVerifiedUser(ctx);
    const name = normalizeName(args.name ?? "Player");
    if (name.length === 0 || name.length > PLAYER_NAME_MAX_LENGTH) {
      throw new ConvexError({
        code: "INVALID_NAME",
        message: `Name must be between 1 and ${PLAYER_NAME_MAX_LENGTH} characters.`,
      });
    }

    const existingAuthedPlayer = await getAnyActiveAuthedPlayer(ctx, authUserId);
    if (existingAuthedPlayer) {
      await leavePlayer(ctx, existingAuthedPlayer);
    }

    const now = Date.now();
    const code = await generateUniqueRoomCode(ctx);
    const roomId = await ctx.db.insert("rooms", {
      code,
      title: "River Run",
      status: "open",
      mode: "riverRunSolo",
      maxPlayers: 1,
      createdAt: now,
      lastActiveAt: now,
    });
    const playerId = await ctx.db.insert("players", {
      roomId,
      authUserId,
      name,
      seatIndex: 0,
      isHost: true,
      status: "active",
      readyStatus: true,
      lastSeenAt: now,
    });

    await ctx.db.patch(roomId, { hostPlayerId: playerId });

    const deck = createShuffledDeck();
    const tiles = deck
      .slice(0, RIVER_RUN_TILE_COUNT)
      .map((tile, index) => createRiverRunTile(tile, index));
    const runId = await ctx.db.insert("riverRunRuns", {
      roomId,
      playerId,
      authUserId,
      targetCurve: [...RIVER_RUN_TARGET_CURVE],
      targetIndex: 0,
      currentTarget: RIVER_RUN_TARGET_CURVE[0],
      phase: "deal",
      tiles,
      credits: RIVER_RUN_INITIAL_CREDITS,
      handScore: RIVER_RUN_INITIAL_SCORE,
      totalScore: RIVER_RUN_INITIAL_SCORE,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return {
      ok: true,
      roomId,
      code,
      playerId,
      runId,
      target: RIVER_RUN_TARGET_CURVE[0],
      phase: "deal" as const,
      status: "active" as const,
    };
  },
});

export const getSoloRunByCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      return null;
    }

    const code = normalizeRoomCode(args.code);
    if (!/^[A-Z0-9]+$/.test(code) || code.length !== ROOM_CODE_LENGTH) {
      throw new ConvexError({
        code: "INVALID_CODE",
        message: `Room code must be ${ROOM_CODE_LENGTH} alphanumeric characters.`,
      });
    }

    const room = await ctx.db
      .query("rooms")
      .withIndex("code", (q) => q.eq("code", code))
      .unique();
    if (!room || room.mode !== "riverRunSolo") {
      return null;
    }

    const run = await ctx.db
      .query("riverRunRuns")
      .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
      .unique();
    if (!run || run.authUserId !== authUserId) {
      return null;
    }

    return {
      room: {
        _id: room._id,
        code: room.code,
        status: room.status,
        maxPlayers: room.maxPlayers,
        hostPlayerId: room.hostPlayerId ?? null,
      },
      run,
    };
  },
});
