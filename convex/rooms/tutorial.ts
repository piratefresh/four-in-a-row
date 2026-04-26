import type { MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import {
  FIRST_BOT_GAME_TUTORIAL_ID,
  getAuthenticatedUserId,
  getActiveAuthedPlayerInRoom,
  getRoomByCode,
} from "./helpers";
import { addDevBotsToRoom, createRoomWithHostOptions } from "./players";
import { createGameForRoomHandler, resetTutorialGameForRoomHandler } from "../games/gamesSetup";
import { scheduleBotTurnIfNeeded } from "../games/gamesProgression";
import { requireVerifiedUser } from "../verifyUser";
import { AI_DIFFICULTY } from "../aiBettingConstants";

// ==================== Create Tutorial Bot Room ====================

export async function createTutorialBotRoomHandler(ctx: MutationCtx, args: { name: string }) {
  await requireVerifiedUser(ctx);
  const room = await createRoomWithHostOptions(ctx, args.name, {
    tutorialId: FIRST_BOT_GAME_TUTORIAL_ID,
    difficulty: AI_DIFFICULTY.EASY,
  });
  const roomDoc = await ctx.db.get(room.roomId);
  if (!roomDoc) {
    throw new ConvexError({
      code: "ROOM_NOT_FOUND",
      message: "Tutorial room could not be created.",
    });
  }

  await addDevBotsToRoom(ctx, roomDoc, 3);
  await createGameForRoomHandler(ctx, { roomId: String(room.roomId) });

  return room;
}

// ==================== Restart Tutorial Room ====================

export async function restartTutorialRoomHandler(ctx: MutationCtx, args: { code: string }) {
  const authUserId = await getAuthenticatedUserId(ctx);
  if (!authUserId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }

  const room = await getRoomByCode(ctx, args.code);
  if (room.tutorialId !== FIRST_BOT_GAME_TUTORIAL_ID) {
    throw new ConvexError({
      code: "NOT_TUTORIAL_ROOM",
      message: "This room is not a tutorial table.",
    });
  }

  const activePlayer = await getActiveAuthedPlayerInRoom(ctx, room._id, authUserId);
  if (!activePlayer) {
    throw new ConvexError({
      code: "PLAYER_NOT_FOUND",
      message: "You must be seated in this tutorial room to restart it.",
    });
  }

  const reset = await resetTutorialGameForRoomHandler(ctx, {
    roomId: room._id,
  });

  await ctx.db.patch(room._id, {
    status: "open",
    lastActiveAt: Date.now(),
    hostPlayerId: room.hostPlayerId ?? activePlayer._id,
  });

  return {
    ok: reset.ok,
    code: room.code,
    roomId: room._id,
    gameId: reset.gameId,
    status: reset.status,
  };
}

// ==================== Start Tutorial Showdown ====================

export async function startTutorialShowdownHandler(ctx: MutationCtx, args: { code: string }) {
  const authUserId = await getAuthenticatedUserId(ctx);
  if (!authUserId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }

  const room = await getRoomByCode(ctx, args.code);
  if (room.tutorialId !== FIRST_BOT_GAME_TUTORIAL_ID) {
    throw new ConvexError({
      code: "NOT_TUTORIAL_ROOM",
      message: "This room is not a tutorial table.",
    });
  }

  const activePlayer = await getActiveAuthedPlayerInRoom(
    ctx,
    room._id,
    authUserId,
  );
  if (!activePlayer) {
    throw new ConvexError({
      code: "PLAYER_NOT_FOUND",
      message: "You must be seated in this tutorial room to start showdown.",
    });
  }

  const game = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", String(room._id)).eq("status", "active"),
    )
    .unique();

  if (!game) {
    throw new ConvexError({
      code: "GAME_NOT_FOUND",
      message: "No active tutorial game was found.",
    });
  }

  if (game.stage !== "showdown") {
    throw new ConvexError({
      code: "INVALID_GAME_STAGE",
      message: "Tutorial showdown can only be started during showdown.",
    });
  }

  if (game.showdownStartedAt !== undefined) {
    return {
      ok: true,
      gameId: game._id,
      showdownStartedAt: game.showdownStartedAt,
      alreadyStarted: true,
    };
  }

  const now = Date.now();
  await ctx.db.patch(game._id, {
    showdownStartedAt: now,
    updatedAt: now,
  });
  await scheduleBotTurnIfNeeded(ctx, game._id);

  return {
    ok: true,
    gameId: game._id,
    showdownStartedAt: now,
    alreadyStarted: false,
  };
}

// ==================== Resume Tutorial Betting ====================

export async function resumeTutorialBettingHandler(ctx: MutationCtx, args: { code: string }) {
  const authUserId = await getAuthenticatedUserId(ctx);
  if (!authUserId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }

  const room = await getRoomByCode(ctx, args.code);
  if (room.tutorialId !== FIRST_BOT_GAME_TUTORIAL_ID) {
    throw new ConvexError({
      code: "NOT_TUTORIAL_ROOM",
      message: "This room is not a tutorial table.",
    });
  }

  const activePlayer = await getActiveAuthedPlayerInRoom(
    ctx,
    room._id,
    authUserId,
  );
  if (!activePlayer) {
    throw new ConvexError({
      code: "PLAYER_NOT_FOUND",
      message: "You must be seated in this tutorial room to continue playing.",
    });
  }

  const game = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", String(room._id)).eq("status", "active"),
    )
    .unique();

  if (!game) {
    throw new ConvexError({
      code: "GAME_NOT_FOUND",
      message: "No active tutorial game was found.",
    });
  }

  if (game.stage === "showdown" || game.stage === "final") {
    throw new ConvexError({
      code: "INVALID_GAME_STAGE",
      message: "Tutorial betting can only be resumed during betting rounds.",
    });
  }

  if (game.turnStartedAt !== undefined) {
    return {
      ok: true,
      gameId: game._id,
      turnStartedAt: game.turnStartedAt,
      alreadyStarted: true,
    };
  }

  const now = Date.now();
  await ctx.db.patch(game._id, {
    turnStartedAt: now,
    updatedAt: now,
    turnClockCalledAt: undefined,
    turnClockExpiresAt: undefined,
    turnClockCallerPlayerId: undefined,
    turnClockTargetPlayerId: undefined,
  });
  await scheduleBotTurnIfNeeded(ctx, game._id);

  return {
    ok: true,
    gameId: game._id,
    turnStartedAt: now,
    alreadyStarted: false,
  };
}
