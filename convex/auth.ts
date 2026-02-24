import { betterAuth } from "better-auth/minimal";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import authConfig from "./auth.config";
import { components } from "./_generated/api";
import { query } from "./_generated/server";
import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "./_generated/dataModel";
import { Resend } from "@convex-dev/resend";
import { requireActionCtx } from "@convex-dev/better-auth/utils";

const siteUrl =
  process.env.BETTER_AUTH_BASE_URL ||
  process.env.BETTER_AUTH_URL ||
  process.env.SITE_URL ||
  "http://localhost:3000";
export const resend = new Resend(components.resend);

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    // Email/password with verification required for sign in.
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ token, url, user }) => {
        await resend.sendEmail(requireActionCtx(ctx), {
          to: user.email,
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          subject: "Reset your password",
          html: `<p>Click <a href="${url}?token=${token}">here</a> to reset your password</p>`,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await resend.sendEmail(requireActionCtx(ctx), {
          to: user.email,
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          subject: "Verify your email",
          html: `<p>Click <a href="${url}">here</a> to verify your email</p>`,
        });
      },
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex({ authConfig }),
    ],
  });
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx);
  },
});
