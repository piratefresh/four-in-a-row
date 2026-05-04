import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireVerifiedUser } from "../verifyUser";
import { authComponent } from "../auth";

export const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export function isUserOnline(lastSeenAt: number | null, now?: number): boolean {
  if (lastSeenAt === null) return false;
  return ((now ?? Date.now()) - lastSeenAt) < ONLINE_THRESHOLD_MS;
}

export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function getUserProfile(
  ctx: QueryCtx | MutationCtx,
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

export async function isAlreadyFriends(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  otherUserId: string,
): Promise<boolean> {
  const [a, b] = orderedPair(userId, otherUserId);
  const friendship = await ctx.db
    .query("friendships")
    .withIndex("by_userA", (q: any) => q.eq("userA", a))
    .filter((q: any) => q.eq(q.field("userB"), b))
    .first();
  return friendship !== null;
}

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
      const isOnline = activePlayer ? isUserOnline(activePlayer.lastSeenAt, now) : false;

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

export const removeFriend = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { authUserId } = await requireVerifiedUser(ctx);

    const [a, b] = orderedPair(authUserId, args.userId);

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
