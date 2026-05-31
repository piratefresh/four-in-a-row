import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const MAX_MESSAGE_LENGTH = 600;
const MAX_ROUTE_LENGTH = 180;
const MAX_USER_AGENT_LENGTH = 240;
const MAX_EMAIL_LENGTH = 160;

const categoryValidator = v.union(
  v.literal("gameplay"),
  v.literal("design"),
  v.literal("bugs"),
  v.literal("performance"),
  v.literal("suggestion"),
  v.literal("other"),
);

function optionalTrimmed(value: string | undefined, maxLength: number) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function normalizeEmail(value: string | undefined) {
  const email = optionalTrimmed(value, MAX_EMAIL_LENGTH);
  if (!email) return undefined;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ConvexError({
      code: "INVALID_EMAIL",
      message: "Enter a valid email address.",
    });
  }

  return email;
}

async function getSignedInUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }

  return {
    authUserId: identity.tokenIdentifier,
    userEmail: identity.email,
    userName: identity.name,
  };
}

export const submit = mutation({
  args: {
    rating: v.number(),
    category: v.optional(categoryValidator),
    message: v.optional(v.string()),
    replyEmail: v.optional(v.string()),
    source: v.union(v.literal("launcher"), v.literal("results")),
    routePath: v.optional(v.string()),
    roomId: v.optional(v.id("rooms")),
    gameId: v.optional(v.id("games")),
    userAgent: v.optional(v.string()),
    honeypot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.honeypot?.trim()) {
      return { ok: true, stored: false };
    }

    const { authUserId, userEmail, userName } = await getSignedInUser(ctx);

    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new ConvexError({
        code: "INVALID_RATING",
        message: "Choose a rating from 1 to 5.",
      });
    }

    const message = optionalTrimmed(args.message, MAX_MESSAGE_LENGTH);
    const replyEmail = normalizeEmail(args.replyEmail);
    const routePath = optionalTrimmed(args.routePath, MAX_ROUTE_LENGTH);
    const userAgent = optionalTrimmed(args.userAgent, MAX_USER_AGENT_LENGTH);
    const now = Date.now();

    const feedbackId = await ctx.db.insert("feedback", {
      authUserId,
      userEmail,
      userName,
      rating: args.rating,
      category: args.category,
      message,
      replyEmail,
      source: args.source,
      routePath,
      roomId: args.roomId,
      gameId: args.gameId,
      userAgent,
      emailStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendFeedbackEmail, {
      feedbackId,
      authUserId,
      userEmail,
      userName,
      rating: args.rating,
      category: args.category,
      message,
      replyEmail,
      source: args.source,
      routePath,
      roomId: args.roomId ? String(args.roomId) : undefined,
      gameId: args.gameId ? String(args.gameId) : undefined,
      userAgent,
    });

    return { ok: true, stored: true, feedbackId };
  },
});

export const markEmailStatus = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    status: v.union(v.literal("sent"), v.literal("skipped"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: {
      emailStatus: "sent" | "skipped" | "failed";
      emailError?: string;
      updatedAt: number;
    } = {
      emailStatus: args.status,
      updatedAt: Date.now(),
    };

    if (args.error) {
      patch.emailError = args.error.slice(0, 500);
    }

    await ctx.db.patch(args.feedbackId, patch);
  },
});

export type FeedbackId = Id<"feedback">;
