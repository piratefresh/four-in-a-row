"use node";

import { action } from "./_generated/server";
import { render } from "@react-email/render";
import { components, internal } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { VerificationEmail } from "../src/emails/verification-email";
import { ResetPasswordEmail } from "../src/emails/reset-password-email";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const resend = new Resend(components.resend, {
  testMode: process.env.RESEND_TEST_MODE === "true",
});

export const sendVerificationEmail = action({
  args: {
    to: v.string(),
    url: v.string(),
  },
  handler: async (ctx, { to, url }) => {
    if (process.env.E2E_TESTING === "true") return;
    const html = await render(<VerificationEmail url={url} />);
    await resend.sendEmail(ctx, {
      from: process.env.RESEND_FROM_EMAIL || "noreply@contact.wordpoker.app",
      to,
      subject: "Verify your email — Word Poker",
      html,
    });
  },
});

export const sendResetPasswordEmail = action({
  args: {
    to: v.string(),
    url: v.string(),
  },
  handler: async (ctx, { to, url }) => {
    if (process.env.E2E_TESTING === "true") return;
    const html = await render(<ResetPasswordEmail url={url} />);
    await resend.sendEmail(ctx, {
      from: process.env.RESEND_FROM_EMAIL || "noreply@contact.wordpoker.app",
      to,
      subject: "Reset your password — Word Poker",
      html,
    });
  },
});

export const sendFeedbackEmail = internalAction({
  args: {
    feedbackId: v.id("feedback"),
    authUserId: v.string(),
    userEmail: v.optional(v.string()),
    userName: v.optional(v.string()),
    rating: v.number(),
    category: v.optional(
      v.union(
        v.literal("gameplay"),
        v.literal("design"),
        v.literal("bugs"),
        v.literal("performance"),
        v.literal("suggestion"),
        v.literal("other"),
      ),
    ),
    message: v.optional(v.string()),
    replyEmail: v.optional(v.string()),
    source: v.union(v.literal("launcher"), v.literal("results")),
    routePath: v.optional(v.string()),
    roomId: v.optional(v.string()),
    gameId: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const to = process.env.FEEDBACK_TO_EMAIL?.trim() || "dylanjmarx@gmail.com";

    const category = args.category ?? "uncategorized";
    const subject = `Word Poker feedback: ${args.rating}/5 (${category})`;
    const rows = [
      ["Rating", `${args.rating}/5`],
      ["Category", category],
      ["Source", args.source],
      ["Route", args.routePath ?? "n/a"],
      ["Game ID", args.gameId ?? "n/a"],
      ["Room ID", args.roomId ?? "n/a"],
      ["User", args.userName ?? "Unknown"],
      ["User email", args.userEmail ?? "n/a"],
      ["Reply email", args.replyEmail ?? "n/a"],
      ["Auth user ID", args.authUserId],
      ["User agent", args.userAgent ?? "n/a"],
    ];
    const htmlRows = rows
      .map(
        ([label, value]) =>
          `<tr><th align="left" style="padding:6px 12px 6px 0;color:#5f5a4b;">${escapeHtml(label)}</th><td style="padding:6px 0;color:#18150d;">${escapeHtml(value)}</td></tr>`,
      )
      .join("");
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#18150d;">
        <h1 style="font-size:22px;margin:0 0 16px;">New Word Poker feedback</h1>
        <table style="border-collapse:collapse;margin-bottom:18px;">${htmlRows}</table>
        <h2 style="font-size:16px;margin:0 0 8px;">Message</h2>
        <p style="white-space:pre-wrap;border:1px solid #e2d6b2;border-radius:8px;padding:12px;background:#fbf7ec;">${escapeHtml(args.message ?? "No message provided.")}</p>
      </div>
    `;

    try {
      await resend.sendEmail(ctx, {
        from: process.env.RESEND_FROM_EMAIL || "noreply@contact.wordpoker.app",
        to,
        subject,
        html,
      });
      await ctx.runMutation(internal.feedback.markEmailStatus, {
        feedbackId: args.feedbackId,
        status: "sent",
      });
    } catch (error) {
      await ctx.runMutation(internal.feedback.markEmailStatus, {
        feedbackId: args.feedbackId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown email error",
      });
      throw error;
    }
  },
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
