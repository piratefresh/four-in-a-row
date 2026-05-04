import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireVerifiedUser } from "./verifyUser";
import { getAuthUserByPlayerAuthUserId } from "./rooms/helpers";
import { authComponent } from "./auth";

export const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export function isUserOnline(lastSeenAt: number | null, now?: number): boolean {
  if (lastSeenAt === null) return false;
  return ((now ?? Date.now()) - lastSeenAt) < ONLINE_THRESHOLD_MS;
}

export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function isSelfRequest(userId: string, targetUserId: string): boolean {
  return userId === targetUserId;
}

// ==================== User Profile Helpers ====================

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

// ==================== Friendship Helpers ====================

async function isAlreadyFriends(
  ctx: { db: any },
  userId: string,
  otherUserId: string,
): Promise<boolean> {
  const [a, b] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
  const friendship = await ctx.db
    .query("friendships")
    .withIndex("by_userA", (q: any) => q.eq("userA", a))
    .filter((q: any) => q.eq(q.field("userB"), b))
    .first();
  return friendship !== null;
}

async function hasPendingRequest(
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

// ==================== searchUsers ====================

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

// ==================== sendFriendRequest ====================

export const sendFriendRequest = mutation({
  args: { toUserId: v.string() },
  handler: async (ctx, args) => {
    const { authUserId } = await requireVerifiedUser(ctx);
    const toUserId = args.toUserId.trim();

    if (!toUserId) {
      throw new ConvexError({ code: "INVALID_USER", message: "Target user ID is required." });
    }

    if (toUserId === authUserId) {
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

// ==================== acceptFriendRequest ====================

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

// ==================== declineFriendRequest ====================

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

// ==================== cancelFriendRequest ====================

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

// ==================== listFriends ====================

export const listFriends = query({
  args: {},
  handler: async (ctx) => {
    const { authUserId } = await requireVerifiedUser(ctx);
    const now = Date.now();

    const asA = await ctx.db
      .query("friendships")
      .withIndex("by_userA", (q: any) => q.eq("userA", authUserId))
      .collect();
    const asB = await ctx.db
      .query("friendships")
      .withIndex("by_userB", (q: any) => q.eq("userB", authUserId))
      .collect();

    const friendUserIds = [
      ...asA.map((f: any) => f.userB),
      ...asB.map((f: any) => f.userA),
    ];

    const results = [];
    for (const friendUserId of friendUserIds) {
      const profile = await getUserProfile(ctx, friendUserId);

      const activePlayer = await ctx.db
        .query("players")
        .withIndex("authUserId_status", (q: any) =>
          q.eq("authUserId", friendUserId).eq("status", "active"))
        .first();

      const recentPlayer = !activePlayer
        ? await ctx.db
            .query("players")
            .withIndex("authUserId_status", (q: any) => q.eq("authUserId", friendUserId))
            .order("desc")
            .first()
        : null;

      const lastSeenAt = activePlayer?.lastSeenAt ?? recentPlayer?.lastSeenAt ?? null;
      const isOnline = activePlayer ? now - activePlayer.lastSeenAt < ONLINE_THRESHOLD_MS : false;

      let activeRoomCode: string | null = null;
      if (activePlayer) {
        const room = await ctx.db.get(activePlayer.roomId);
        if (room) {
          activeRoomCode = room.code;
        }
      }

      results.push({
        userId: friendUserId,
        name: profile?.name ?? "Unknown",
        image: profile?.image ?? null,
        isOnline,
        lastSeenAt,
        activeRoomCode,
      });
    }

    results.sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0);
    });

    return results;
  },
});

// ==================== listPendingRequests ====================

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

// ==================== removeFriend ====================

export const removeFriend = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { authUserId } = await requireVerifiedUser(ctx);

    const [a, b] =
      authUserId < args.userId
        ? [authUserId, args.userId]
        : [args.userId, authUserId];

    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_userA", (q: any) => q.eq("userA", a))
      .filter((q: any) => q.eq(q.field("userB"), b))
      .first();

    if (!friendship) {
      throw new ConvexError({ code: "NOT_FRIENDS", message: "You are not friends with this user." });
    }

    await ctx.db.delete(friendship._id);

    return { ok: true };
  },
});

// ==================== pendingNotificationCount ====================

export const pendingNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const { authUserId } = await requireVerifiedUser(ctx);

    const incoming = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_status", (q: any) =>
        q.eq("toUserId", authUserId).eq("status", "pending"))
      .collect();

    return {
      friendRequests: incoming.length,
      gameInvites: 0,
    };
  },
});
