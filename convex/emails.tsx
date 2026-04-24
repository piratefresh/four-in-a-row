"use node";

import { action } from "./_generated/server";
import { render } from "@react-email/render";
import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { VerificationEmail } from "../src/emails/verification-email";
import { ResetPasswordEmail } from "../src/emails/reset-password-email";
import { v } from "convex/values";

export const resend = new Resend(components.resend, { testMode: false });

export const sendVerificationEmail = action({
  args: {
    to: v.string(),
    url: v.string(),
  },
  handler: async (ctx, { to, url }) => {
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
    const html = await render(<ResetPasswordEmail url={url} />);
    await resend.sendEmail(ctx, {
      from: process.env.RESEND_FROM_EMAIL || "noreply@contact.wordpoker.app",
      to,
      subject: "Reset your password — Word Poker",
      html,
    });
  },
});