import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireVerifiedUser } from "./verifyUser";
import { isAlreadyFriends } from "./friendships";
import { authComponent } from "./auth";

export function isSelfRequest(userId: string, targetUserId: string): boolean {
  return userId === targetUserId;
}

async function getUserProfile(
  ctx: { db: any },
  userId: string,
): Promise<{ name: string; image: string | null } | null> {
  try {
    const user = await authComponent.getAnyUserById(ctx, userId);
    if (!user) return null;
    return {
      name: user.name ?? "Unknown",
      image: user.image ?? null,
    };
  } catch {
    return null;
  }
}

export async function hasPendingRequest(
  ctx: { db: any },
  fromUserId: string,
  toUserId: string,
): Promise<boolean> {
  const existing = await ctx.db
    .query("friendRequests")
    .withIndex("by_pair", (q: any) => q.eq("fromUserId", fromUserId).eq("toUserId", toUserId))
    .filter((q: any) => q.eq(q.field("status"), "pending"))
    .first();
  return existing !== null;
}

export async function countPendingIncoming(
  ctx: { db: any },
  userId: string,
): Promise<number> {
  const incoming = await ctx.db
    .query("friendRequests")
    .withIndex("by_to_status", (q: any) =>
      q.eq("toUserId", userId).eq("status", "pending"))
    .collect();
  return incoming.length;
}

export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const { authUserId } = await requireVerifiedUser(ctx);
    const searchQuery = args.query.trim();
    if (searchQuery.length === 0) return [];

    const isEmail = searchQuery.includes("@");
    let matchedUsers: any[] = [];

    if (isEmail) {
      matchedUsers = await ctx.db
        .query("user")
        .withIndex("email_name", (q: any) =>
          q.gte("email", searchQuery).lt("email", searchQuery + "\uffff"))
        .collect();
    } else {
      matchedUsers = await ctx.db
        .query("user")
        .withIndex("name", (q: any) =>
          q.gte("name", searchQuery).lt("name", searchQuery + "\uffff"))
        .collect();
    }

    matchedUsers = matchedUsers.filter((u: any) => u.emailVerified).slice(0, 10);

    const results = [];
    for (const user of matchedUsers) {
      const userId = user._id;
      if (userId === authUserId) continue;

      const friends = await isAlreadyFriends(ctx, authUserId, userId);
      const incomingPending = await ctx.db
        .query("friendRequests")
        .withIndex("by_pair", (q: any) =>
          q.eq("fromUserId", userId).eq("toUserId", authUserId))
        .filter((q: any) => q.eq(q.field("status"), "pending"))
        .first();
      const outgoingPending = await ctx.db
        .query("friendRequests")
        .withIndex("by_pair", (q: any) =>
          q.eq("fromUserId", authUserId).eq("toUserId", userId))
        .filter((q: any) => q.eq(q.field("status"), "pending"))
        .first();

      let relationshipStatus: "none" | "friend" | "pending_sent" | "pending_received" = "none";
      if (friends) {
        relationshipStatus = "friend";
      } else if (incomingPending) {
        relationshipStatus = "pending_received";
      } else if (outgoingPending) {
        relationshipStatus = "pending_sent";
      }

      results.push({
        userId,
        name: user.name ?? "Unknown",
        image: user.image ?? null,
        relationshipStatus,
        ...(incomingPending ? { pendingRequestId: incomingPending._id } : {}),
      });
    }

    return results;
  },
});

export const sendFriendRequest = mutation({
  args: { toUserId: v.string() },
  handler: async (ctx, args) => {
    const { authUserId } = await requireVerifiedUser(ctx);
    const toUserId = args.toUserId.trim();

    if (!toUserId) {
      throw new ConvexError({ code: "INVALID_USER", message: "Target user ID is required." });
    }

    if (isSelfRequest(authUserId, toUserId)) {
      throw new ConvexError({ code: "SELF_REQUEST", message: "You cannot send a friend request to yourself." });
    }

    if (await hasPendingRequest(ctx, authUserId, toUserId)) {
      throw new ConvexError({ code: "ALREADY_PENDING", message: "You already have a pending request to this user." });
    }

    if (await isAlreadyFriends(ctx, authUserId, toUserId)) {
      throw new ConvexError({ code: "ALREADY_FRIENDS", message: "You are already friends with this user." });
    }

    const now = Date.now();

    const mutualPending = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q: any) =>
        q.eq("fromUserId", toUserId).eq("toUserId", authUserId))
      .filter((q: any) => q.eq(q.field("status"), "pending"))
      .first();

    if (mutualPending) {
      await ctx.db.patch(mutualPending._id, { status: "accepted", updatedAt: now });
      const [a, b] = authUserId < toUserId ? [authUserId, toUserId] : [toUserId, authUserId];
      await ctx.db.insert("friendships", { userA: a, userB: b, createdAt: now });

      await ctx.db.insert("friendRequests", {
        fromUserId: authUserId,
        toUserId,
        status: "accepted",
        createdAt: now,
        updatedAt: now,
      });

      return { status: "accepted" as const, mutual: true };
    }

    await ctx.db.insert("friendRequests", {
      fromUserId: authUserId,
      toUserId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return { status: "pending" as const, mutual: false };
  },
});

export const acceptFriendRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const { authUserId } = await requireVerifiedUser(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Friend request not found." });
    }

    if (request.toUserId !== authUserId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "This request is not addressed to you." });
    }

    if (request.status !== "pending") {
      throw new ConvexError({ code: "INVALID_STATE", message: "This request is no longer pending." });
    }

    const now = Date.now();
    await ctx.db.patch(args.requestId, { status: "accepted", updatedAt: now });

    if (!(await isAlreadyFriends(ctx, authUserId, request.fromUserId))) {
      const [a, b] =
        authUserId < request.fromUserId
          ? [authUserId, request.fromUserId]
          : [request.fromUserId, authUserId];
      await ctx.db.insert("friendships", { userA: a, userB: b, createdAt: now });
    }

    return { status: "accepted" as const };
  },
});

export const declineFriendRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const { authUserId } = await requireVerifiedUser(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Friend request not found." });
    }

    if (request.toUserId !== authUserId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "This request is not addressed to you." });
    }

    if (request.status !== "pending") {
      throw new ConvexError({ code: "INVALID_STATE", message: "This request is no longer pending." });
    }

    await ctx.db.patch(args.requestId, { status: "declined", updatedAt: Date.now() });

    return { status: "declined" as const };
  },
});

export const cancelFriendRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const { authUserId } = await requireVerifiedUser(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Friend request not found." });
    }

    if (request.fromUserId !== authUserId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "You did not send this request." });
    }

    if (request.status !== "pending") {
      throw new ConvexError({ code: "INVALID_STATE", message: "This request is no longer pending." });
    }

    await ctx.db.patch(args.requestId, { status: "cancelled", updatedAt: Date.now() });

    return { status: "cancelled" as const };
  },
});

export const listPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const { authUserId } = await requireVerifiedUser(ctx);

    const incoming = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_status", (q: any) =>
        q.eq("toUserId", authUserId).eq("status", "pending"))
      .collect();

    const outgoing = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_status", (q: any) =>
        q.eq("fromUserId", authUserId).eq("status", "pending"))
      .collect();

    const incomingResults = [];
    for (const req of incoming) {
      const profile = await getUserProfile(ctx, req.fromUserId);
      incomingResults.push({
        _id: req._id,
        userId: req.fromUserId,
        name: profile?.name ?? "Unknown",
        image: profile?.image ?? null,
        direction: "incoming" as const,
        createdAt: req.createdAt,
      });
    }

    const outgoingResults = [];
    for (const req of outgoing) {
      const profile = await getUserProfile(ctx, req.toUserId);
      outgoingResults.push({
        _id: req._id,
        userId: req.toUserId,
        name: profile?.name ?? "Unknown",
        image: profile?.image ?? null,
        direction: "outgoing" as const,
        createdAt: req.createdAt,
      });
    }

    return { incoming: incomingResults, outgoing: outgoingResults };
  },
});
