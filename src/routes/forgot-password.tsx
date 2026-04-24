import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const siteUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : "/reset-password";

      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: siteUrl,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to send reset email");
        return;
      }

      setSent(true);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <main className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-[#252525] px-8 py-12 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,#114D28_0%,#114D28_30%,#252525_72%)] opacity-45"
        />
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#303030] bg-[#1D1D1D] p-6 shadow-[inset_0_0_24px_rgba(0,0,0,0.25)]">
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="mt-2 text-sm text-slate-300">
            If an account exists for <span className="text-white">{email}</span>,
            we&apos;ve sent a password reset link.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/login" })}
            className="mt-6 w-full rounded-md bg-[#114D28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#176636]"
          >
            Back to login
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
        <h1 className="text-2xl font-bold text-white">Forgot password?</h1>
        <p className="mt-1 text-sm text-slate-300">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-slate-200">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-[#323232] bg-[#141414] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#1e6d3c]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#114D28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#176636] disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-300">
          Remember your password?{" "}
          <Link
            to="/login"
            className="font-medium text-[#7ed8a2] hover:text-[#9ee6ba]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}