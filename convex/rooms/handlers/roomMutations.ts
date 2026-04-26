import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import {
  normalizeName,
  normalizeRoomCode,
  isTutorialRoom,
  getAuthenticatedUserId,
  getAnyActiveAuthedPlayer,
  getActiveAuthedPlayerInRoom,
  getHistoricalAuthedPlayersInRoom,
  getRoomByCode,
} from "../helpers";
import {
  reapInactivePlayersForRoom,
  createOpenRoom,
  findContinuationRoom,
} from "../lifecycle";
import {
  leavePlayer,
  joinAuthenticatedUserToRoom,
  syncOfflineBotsToRoom,
  createRoomWithHost,
  rejoinRoomMember,
} from "../players";
import { PLAYER_NAME_MAX_LENGTH } from "../../constants";
import { requireVerifiedUser } from "../../verifyUser";
import { AI_DIFFICULTY, type AIDifficulty } from "../../aiBettingConstants";

export const createRoom = mutation({
  args: {
    name: v.string(),
    difficulty: v.optional(v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    )),
  },
  handler: async (ctx, args) => {
    await requireVerifiedUser(ctx);
    return createRoomWithHost(
      ctx,
      args.name,
      (args.difficulty as AIDifficulty | undefined) ?? AI_DIFFICULTY.MEDIUM,
    );
  },
});

export const joinRoom = mutation({
  args: { code: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const name = normalizeName(args.name);
    if (name.length === 0 || name.length > PLAYER_NAME_MAX_LENGTH) {
      throw new ConvexError({
        code: "INVALID_NAME",
        message: `Name must be between 1 and ${PLAYER_NAME_MAX_LENGTH} characters.`,
      });
    }

    const { authUserId } = await requireVerifiedUser(ctx);

    let room = await getRoomByCode(ctx, args.code);
    await reapInactivePlayersForRoom(ctx, room, Date.now());
    const refreshedRoom = await ctx.db.get(room._id);
    if (!refreshedRoom) {
      throw new ConvexError({ code: "ROOM_NOT_FOUND", message: "Room does not exist." });
    }
    room = refreshedRoom;

    if (room.status !== "open") {
      throw new ConvexError({ code: "ROOM_CLOSED", message: "Room is closed." });
    }

    if (isTutorialRoom(room)) {
      const historicalPlayers = await getHistoricalAuthedPlayersInRoom(
        ctx, room._id, authUserId,
      );
      if (historicalPlayers.length === 0) {
        throw new ConvexError({
          code: "TUTORIAL_ROOM_PRIVATE",
          message: "This tutorial table is reserved for its original player.",
        });
      }
    }

    const existingAuthedPlayer = await getAnyActiveAuthedPlayer(ctx, authUserId);
    if (existingAuthedPlayer) {
      if (existingAuthedPlayer.roomId !== room._id) {
        await leavePlayer(ctx, existingAuthedPlayer);
      } else {
        const existingRoom = await ctx.db.get(existingAuthedPlayer.roomId);
        if (existingRoom) {
          return {
            roomId: existingRoom._id,
            code: existingRoom.code,
            playerId: existingAuthedPlayer._id,
            seatIndex: existingAuthedPlayer.seatIndex,
            maxPlayers: existingRoom.maxPlayers,
          };
        }
      }
    }
    return await joinAuthenticatedUserToRoom(ctx, room, authUserId, name);
  },
});

export const leaveRoom = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "Authentication required." });
    }

    const player = await getAnyActiveAuthedPlayer(ctx, authUserId);
    if (!player) {
      return { ok: true, roomId: null, wasAlreadyLeft: true, roomStatus: null };
    }

    return leavePlayer(ctx, player);
  },
});

export const leaveRoomByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = normalizeRoomCode(args.code);
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "Authentication required." });
    }

    const room = await ctx.db.query("rooms").withIndex("code", (q) => q.eq("code", code)).unique();
    if (!room) {
      throw new ConvexError({ code: "ROOM_NOT_FOUND", message: "Room does not exist." });
    }

    const player = await getActiveAuthedPlayerInRoom(ctx, room._id, authUserId);
    if (!player) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You are not an active member of this room.",
      });
    }

    return leavePlayer(ctx, player);
  },
});

export const leaveCurrentRoom = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "Authentication required." });
    }

    const player = await getAnyActiveAuthedPlayer(ctx, authUserId);
    if (!player) {
      return { ok: true, roomId: null, wasAlreadyLeft: true, roomStatus: null };
    }

    return leavePlayer(ctx, player);
  },
});

export const archiveRoomByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = normalizeRoomCode(args.code);
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "Authentication required." });
    }

    const room = await ctx.db.query("rooms").withIndex("code", (q) => q.eq("code", code)).unique();
    if (!room) {
      throw new ConvexError({ code: "ROOM_NOT_FOUND", message: "Room does not exist." });
    }

    const player = await getActiveAuthedPlayerInRoom(ctx, room._id, authUserId);
    if (!player) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You are not an active member of this room.",
      });
    }

    const latestGame = await ctx.db
      .query("games")
      .withIndex("by_room", (q) => q.eq("roomId", String(room._id)))
      .order("desc")
      .first();

    if (latestGame && latestGame.status !== "completed") {
      throw new ConvexError({
        code: "GAME_NOT_COMPLETED",
        message: "Only completed rooms can be archived for a new hand.",
      });
    }

    await ctx.db.patch(room._id, { status: "closed", lastActiveAt: Date.now() });

    return { ok: true, roomId: room._id, code: room.code, status: "closed" as const };
  },
});

export const continueToNextRoom = mutation({
  args: { code: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const name = normalizeName(args.name);
    if (name.length === 0 || name.length > PLAYER_NAME_MAX_LENGTH) {
      throw new ConvexError({
        code: "INVALID_NAME",
        message: `Name must be between 1 and ${PLAYER_NAME_MAX_LENGTH} characters.`,
      });
    }

    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "Authentication required." });
    }

    const room = await getRoomByCode(ctx, args.code);
    const latestGame = await ctx.db
      .query("games")
      .withIndex("by_room", (q) => q.eq("roomId", String(room._id)))
      .order("desc")
      .first();

    if (!latestGame || latestGame.status !== "completed") {
      throw new ConvexError({
        code: "GAME_NOT_COMPLETED",
        message: "The room must have a completed game before continuing.",
      });
    }

    const activePlayer = await getActiveAuthedPlayerInRoom(ctx, room._id, authUserId);
    if (!activePlayer) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You are not an active member of this room.",
      });
    }

    let nextRoom = await findContinuationRoom(ctx, room);

    if (!nextRoom || nextRoom.status !== "open") {
      const { roomId: nextRoomId } = await createOpenRoom(ctx, {
        sourceRoomId: room._id,
        isBotGame: room.isBotGame,
        difficulty: room.difficulty as AIDifficulty | undefined,
      });
      await ctx.db.patch(room._id, { status: "closed", nextRoomId, lastActiveAt: Date.now() });
      nextRoom = await ctx.db.get(nextRoomId);
    } else if (room.nextRoomId !== nextRoom._id) {
      await ctx.db.patch(room._id, { status: "closed", nextRoomId: nextRoom._id, lastActiveAt: Date.now() });
    }

    if (!nextRoom || nextRoom.status !== "open") {
      throw new ConvexError({ code: "NEXT_ROOM_UNAVAILABLE", message: "The next room is not available." });
    }

    const now = Date.now();
    await ctx.db.patch(room._id, { status: "closed", nextRoomId: nextRoom._id, lastActiveAt: now });
    await syncOfflineBotsToRoom(ctx, room._id, nextRoom, now);

    return await joinAuthenticatedUserToRoom(ctx, nextRoom, authUserId, name, activePlayer.seatIndex);
  },
});

export const rejoinRoomByCode = mutation({
  args: { code: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await rejoinRoomMember(ctx, { ...args, defaultName: "Player" });
  },
});
