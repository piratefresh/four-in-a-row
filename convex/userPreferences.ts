import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getAuthenticatedUserId(ctx: {
  auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthenticated");
  }
  return identity.tokenIdentifier;
}

export const getMyPreferences = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .unique();

    return {
      showInGameHelper: preferences?.showInGameHelper ?? true,
    };
  },
});

export const setShowInGameHelper = mutation({
  args: {
    showInGameHelper: v.boolean(),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    const now = Date.now();
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .unique();

    if (preferences) {
      await ctx.db.patch(preferences._id, {
        showInGameHelper: args.showInGameHelper,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        authUserId,
        showInGameHelper: args.showInGameHelper,
        updatedAt: now,
      });
    }

    return {
      showInGameHelper: args.showInGameHelper,
    };
  },
});
