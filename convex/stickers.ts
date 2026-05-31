import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  ROOM_STICKER_TTL_MS,
  getRoomSticker,
  isRoomStickerKey,
} from "./stickerCatalog";
import {
  getActiveAuthedPlayerInRoom,
  getAuthenticatedUserId,
} from "./rooms/helpers";

const RECENT_STICKER_LIMIT = 40;
const RECENT_STICKER_WINDOW_MS = 10_000;

async function requireActiveRoomPlayer(
  ctx: MutationCtx | QueryCtx,
  roomId: Id<"rooms">,
) {
  const authUserId = await getAuthenticatedUserId(ctx);
  if (!authUserId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }

  const player = await getActiveAuthedPlayerInRoom(ctx, roomId, authUserId);
  if (!player) {
    throw new ConvexError({
      code: "PLAYER_NOT_FOUND",
      message: "You are not an active member of this room.",
    });
  }

  return { authUserId, player };
}

export const send = mutation({
  args: {
    roomId: v.id("rooms"),
    stickerKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isRoomStickerKey(args.stickerKey)) {
      throw new ConvexError({
        code: "INVALID_STICKER",
        message: "Sticker is not available.",
      });
    }

    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "open" || room.tutorialId) {
      throw new ConvexError({
        code: "ROOM_UNAVAILABLE",
        message: "Stickers are not available in this room.",
      });
    }

    const { authUserId, player } = await requireActiveRoomPlayer(
      ctx,
      args.roomId,
    );
    const now = Date.now();

    await ctx.db.insert("roomStickers", {
      roomId: args.roomId,
      playerId: player._id,
      senderAuthUserId: authUserId,
      stickerKey: args.stickerKey,
      createdAt: now,
      expiresAt: now + ROOM_STICKER_TTL_MS,
    });
    await ctx.db.patch(args.roomId, { lastActiveAt: now });

    return { ok: true };
  },
});

export const sendAsAI = internalMutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.id("players"),
    stickerKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isRoomStickerKey(args.stickerKey)) {
      throw new ConvexError({
        code: "INVALID_STICKER",
        message: "Sticker is not available.",
      });
    }

    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "open" || room.tutorialId) {
      throw new ConvexError({
        code: "ROOM_UNAVAILABLE",
        message: "Stickers are not available in this room.",
      });
    }

    const player = await ctx.db.get(args.playerId);
    if (!player || player.roomId !== args.roomId || player.status !== "active") {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "AI player is not an active member of this room.",
      });
    }

    const now = Date.now();

    await ctx.db.insert("roomStickers", {
      roomId: args.roomId,
      playerId: args.playerId,
      senderAuthUserId: player.authUserId,
      stickerKey: args.stickerKey,
      createdAt: now,
      expiresAt: now + ROOM_STICKER_TTL_MS,
    });
    await ctx.db.patch(args.roomId, { lastActiveAt: now });

    return { ok: true };
  },
});

export const listRecent = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "open" || room.tutorialId) {
      return [];
    }

    const { authUserId } = await requireActiveRoomPlayer(ctx, args.roomId);
    const now = Date.now();

    const stickers = await ctx.db
      .query("roomStickers")
      .withIndex("by_roomId_and_createdAt", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(RECENT_STICKER_LIMIT);

    return stickers
      .filter(
        (sticker) =>
          sticker.expiresAt > now &&
          sticker.createdAt >= now - RECENT_STICKER_WINDOW_MS,
      )
      .reverse()
      .map((sticker) => {
        const config = getRoomSticker(sticker.stickerKey);
        return {
          id: sticker._id,
          playerId: sticker.playerId,
          stickerKey: sticker.stickerKey,
          label: config?.label ?? sticker.stickerKey,
          symbol: config?.symbol ?? sticker.stickerKey,
          createdAt: sticker.createdAt,
          expiresAt: sticker.expiresAt,
          isCurrentPlayer: sticker.senderAuthUserId === authUserId,
        };
      });
  },
});
