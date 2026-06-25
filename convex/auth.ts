import { betterAuth } from "better-auth/minimal";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import authConfig from "./auth.config";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "./_generated/dataModel";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { ConvexError, v } from "convex/values";
import { api } from "./_generated/api";

const siteUrl =
  process.env.BETTER_AUTH_BASE_URL ||
  process.env.BETTER_AUTH_URL ||
  process.env.SITE_URL ||
  "http://localhost:3000";

const trustedOrigins = Array.from(
  new Set(
    [
      siteUrl,
      "https://wordpoker.app",
      "https://www.wordpoker.app",
      ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
    ]
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
);

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins,
    database: authComponent.adapter(ctx),
    user: {
      additionalFields: {
        activeGameId: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ url, user }) => {
        await requireActionCtx(ctx).runAction(api.emails.sendResetPasswordEmail, {
          to: user.email,
          url,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: process.env.E2E_TESTING !== "true",
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await requireActionCtx(ctx).runAction(api.emails.sendVerificationEmail, {
          to: user.email,
          url,
        });
      },
    },
    plugins: [
      convex({ authConfig }),
    ],
  });
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.auth.getUserIdentity();
  },
});

export const e2eForceVerifyUserEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    if (process.env.E2E_TESTING !== "true") {
      throw new ConvexError("Only available in e2e testing mode");
    }

    // Find user through the component's internal adapter (component tables
    // are separate from project-level schema tables).
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user" as const,
      where: [
        { field: "email" as const, operator: "eq" as const, value: email.toLowerCase() },
      ],
    });

    if (!user) {
      return { ok: false, reason: "User not found" };
    }

    const u = user as { emailVerified?: boolean };
    if (u.emailVerified) {
      return { ok: true, reason: "already_verified" };
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user" as const,
        where: [
          { field: "email" as const, operator: "eq" as const, value: email.toLowerCase() },
        ],
        update: { emailVerified: true },
      },
    });

    return { ok: true };
  },
});

export const setActiveGameId = mutation({
  args: {
    activeGameId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const authUserId = authUser.userId
      ? ctx.db.normalizeId("user", authUser.userId)
      : null;

    if (!authUserId) {
      throw new ConvexError("Unauthenticated");
    }

    const activeGameId = args.activeGameId?.trim() || undefined;
    await ctx.db.patch(authUserId, { activeGameId });

    return { ok: true, activeGameId: activeGameId ?? null };
  },
});
