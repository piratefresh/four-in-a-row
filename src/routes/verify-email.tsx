import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { error?: string };
  const { data: session } = authClient.useSession();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const errorFromServer = search.error;
  const isVerified = session?.user?.emailVerified === true;

  const handleResend = async () => {
    if (!session?.user?.email) return;
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

  if (errorFromServer) {
    return (
      <main className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-[#252525] px-8 py-12 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,#114D28_0%,#114D28_30%,#252525_72%)] opacity-45"
        />
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#303030] bg-[#1D1D1D] p-6 shadow-[inset_0_0_24px_rgba(0,0,0,0.25)]">
          <h1 className="text-2xl font-bold text-white">Verification failed</h1>
          <p className="mt-2 text-sm text-rose-300">
            The verification link is invalid or has expired. Please request a new one.
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={sending || sent}
            className="mt-6 w-full rounded-md bg-[#114D28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#176636] disabled:opacity-60"
          >
            {sending ? "Sending..." : sent ? "Email sent" : "Resend verification email"}
          </button>
          <p className="mt-4 text-sm text-slate-300">
            <Link to="/login" className="font-medium text-[#7ed8a2] hover:text-[#9ee6ba]">
              Go to login
            </Link>
          </p>
        </div>
      </main>
    );
  }

  if (isVerified) {
    return (
      <main className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-[#252525] px-8 py-12 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,#114D28_0%,#114D28_30%,#252525_72%)] opacity-45"
        />
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#303030] bg-[#1D1D1D] p-6 shadow-[inset_0_0_24px_rgba(0,0,0,0.25)]">
          <h1 className="text-2xl font-bold text-white">Email verified!</h1>
          <p className="mt-2 text-sm text-slate-300">
            Your email has been verified. You now have full access to all features.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="mt-6 w-full rounded-md bg-[#114D28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#176636]"
          >
            Go to home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-[#252525] px-8 py-12 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,#114D28_0%,#114D28_30%,#252525_72%)] opacity-45"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#303030] bg-[#1D1D1D] p-6 shadow-[inset_0_0_24px_rgba(0,0,0,0.25)]">
        <h1 className="text-2xl font-bold text-white">Verify your email</h1>
        {session?.user ? (
          <>
            <p className="mt-2 text-sm text-slate-300">
              We sent a verification email to <span className="text-white">{session.user.email}</span>.
              Check your inbox and click the link to verify.
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={sending || sent}
              className="mt-6 w-full rounded-md bg-[#114D28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#176636] disabled:opacity-60"
            >
              {sending ? "Sending..." : sent ? "Email sent" : "Resend verification email"}
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-300">
            Please sign in to resend a verification email.
          </p>
        )}
        <p className="mt-4 text-sm text-slate-300">
          <Link to="/login" className="font-medium text-[#7ed8a2] hover:text-[#9ee6ba]">
            Go to login
          </Link>
        </p>
      </div>
    </main>
  );
}