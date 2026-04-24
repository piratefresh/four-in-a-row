import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string; error?: string };
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    search.error ? "This password reset link is invalid or has expired." : ""
  );

  const token = search.token;

  if (!token) {
    return (
      <main className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-[#252525] px-8 py-12 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,#114D28_0%,#114D28_30%,#252525_72%)] opacity-45"
        />
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#303030] bg-[#1D1D1D] p-6 shadow-[inset_0_0_24px_rgba(0,0,0,0.25)]">
          <h1 className="text-2xl font-bold text-white">Invalid link</h1>
          <p className="mt-2 text-sm text-rose-300">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/forgot-password" })}
            className="mt-6 w-full rounded-md bg-[#114D28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#176636]"
          >
            Request new link
          </button>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        setError(result.error.message || "Failed to reset password");
        return;
      }

      toast.success("Password reset successfully!");
      await navigate({ to: "/" });
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-[#252525] px-8 py-12 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,#114D28_0%,#114D28_30%,#252525_72%)] opacity-45"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#303030] bg-[#1D1D1D] p-6 shadow-[inset_0_0_24px_rgba(0,0,0,0.25)]">
        <h1 className="text-2xl font-bold text-white">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-300">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-slate-200">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-[#323232] bg-[#141414] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#1e6d3c]"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1 block text-sm text-slate-200"
            >
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-[#323232] bg-[#141414] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#1e6d3c]"
            />
          </div>

          {error && (
            <p className="rounded-md border border-rose-700 bg-rose-900/30 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#114D28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#176636] disabled:opacity-60"
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
      </div>
    </main>
  );
}