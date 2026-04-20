import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

async function getAuthenticatedUserId(
  ctx: MutationCtx | QueryCtx,
): Promise<string | undefined> {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });
  return session?.user?.id ?? session?.session?.userId ?? undefined;
}

// Send a message to a room
export const send = mutation({
  args: {
    roomId: v.id("rooms"),
    text: v.string(),
    type: v.optional(
      v.union(v.literal("player"), v.literal("ai"), v.literal("system")),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    // For system messages, no auth required
    if (args.type === "system") {
      await ctx.db.insert("messages", {
        roomId: args.roomId,
        playerId: undefined,
        senderAuthUserId: undefined,
        senderName: "System",
        text: args.text,
        type: "system",
        createdAt: Date.now(),
      });
      return;
    }

    // For player/AI messages, require authentication
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Find the player in this room
    const player = await ctx.db
      .query("players")
      .withIndex("roomId_status", (q) =>
        q.eq("roomId", args.roomId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("authUserId"), userId))
      .first();

    if (!player) {
      throw new Error("Player not found in room");
    }

    await ctx.db.insert("messages", {
      roomId: args.roomId,
      playerId: player._id,
      senderAuthUserId: userId,
      senderName: player.name,
      text: args.text,
      type: args.type || "player",
      createdAt: Date.now(),
    });
  },
});

// Send a message as AI (called from backend actions/mutations)
export const sendAsAI = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.id("players"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);

    if (!player) {
      throw new Error("Player not found");
    }

    if (player.roomId !== args.roomId) {
      throw new Error("AI player is not in this room");
    }

    await ctx.db.insert("messages", {
      roomId: args.roomId,
      playerId: args.playerId,
      senderAuthUserId: player.authUserId,
      senderName: player.name,
      text: args.text,
      type: "ai",
      createdAt: Date.now(),
    });
  },
});

// Send a system message
export const sendSystemMessage = mutation({
  args: {
    roomId: v.id("rooms"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      roomId: args.roomId,
      playerId: undefined,
      senderAuthUserId: undefined,
      senderName: "System",
      text: args.text,
      type: "system",
      createdAt: Date.now(),
    });
  },
});

// Get messages for a room
export const list = query({
  args: {
    roomId: v.id("rooms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    if (!userId) {
      return [];
    }

    // Verify the user is a player in this room
    const player = await ctx.db
      .query("players")
      .withIndex("roomId_status", (q) =>
        q.eq("roomId", args.roomId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("authUserId"), userId))
      .first();

    if (!player) {
      return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("roomId_createdAt", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(args.limit || 100);

    return messages.reverse().map((msg) => ({
      id: msg._id,
      senderId: msg.senderAuthUserId || "system",
      senderName: msg.senderName,
      message: msg.text,
      timestamp: msg.createdAt,
      type: msg.type,
      isCurrentPlayer: msg.senderAuthUserId === userId,
    }));
  },
});
