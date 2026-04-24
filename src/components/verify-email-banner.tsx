import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { toast } from "sonner";

export function VerifyEmailBanner() {
  const { data: session } = authClient.useSession();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!session?.user || session.user.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    setSending(true);
    try {
      const result = await authClient.sendVerificationEmail({
        email: session.user.email,
        callbackURL: "/verify-email",
      });
      if (result.error) {
        toast.error(result.error.message || "Failed to send verification email");
      } else {
        toast.success("Verification email sent! Check your inbox.");
        setSent(true);
      }
    } catch {
      toast.error("Failed to send verification email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-b border-amber-700/50 bg-amber-900/30 px-4 py-3 text-center text-sm">
      <p className="text-amber-200">
        Please verify your email ({session.user.email}) to access all features.
      </p>
      <button
        type="button"
        onClick={handleResend}
        disabled={sending || sent}
        className="mt-1 text-amber-300 underline underline-offset-2 hover:text-amber-200 disabled:opacity-50 disabled:no-underline"
      >
        {sending ? "Sending..." : sent ? "Email sent" : "Resend verification email"}
      </button>
    </div>
  );
}