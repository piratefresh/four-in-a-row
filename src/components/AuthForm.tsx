import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const isRegister = mode === "register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#29533a] border-t-[#4caf73]" />
      </div>
    );
  }

  if (registered) {
    return isRegister ? (
      <div className="w-full max-w-md rounded-2xl bg-[#fbf7ec] p-8 text-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]">
        <div className="text-4xl">📧</div>
        <h1 className="mt-4 font-['Fraunces',serif] text-2xl font-extrabold text-[#111511]">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-[#2a2f2a]">
          We&apos;ve sent a verification email to{" "}
          <span className="font-semibold text-[#111511]">{email}</span>.
          <br />
          Please verify to unlock all features.
        </p>
        <button
          type="button"
          className="mt-6 w-full rounded-lg bg-[#0d3b2e] px-4 py-3 font-semibold text-[#f6efe0] transition-colors hover:bg-[#14523f]"
          onClick={() => navigate({ to: "/login" })}
        >
          Go to login
        </button>
      </div>
    ) : (
      <div className="w-full max-w-md rounded-2xl border border-[#303030] bg-[#1D1D1D] p-6 shadow-[inset_0_0_24px_rgba(0,0,0,0.25)]">
        <h1 className="text-2xl font-bold text-white">Check your email</h1>
        <p className="mt-2 text-sm text-slate-300">
          We&apos;ve sent a verification email to{" "}
          <span className="text-white">{email}</span>.
        </p>
        <button
          type="button"
          className="mt-6 w-full rounded-md bg-[#114D28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#176636]"
          onClick={() => navigate({ to: "/login" })}
        >
          Go to login
        </button>
      </div>
    );
  }

  if (session?.user) {
    return isRegister ? (
      <div className="w-full max-w-md rounded-2xl bg-[#fbf7ec] p-8 text-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]">
        <h1 className="font-['Fraunces',serif] text-xl font-extrabold text-[#111511]">
          You&apos;re signed in
        </h1>
        <p className="mt-2 text-sm text-[#2a2f2a]">{session.user.email}</p>
        <button
          type="button"
          className="mt-6 w-full rounded-lg bg-[#0d3b2e] px-4 py-3 font-semibold text-[#f6efe0] transition-colors hover:bg-[#14523f]"
          onClick={() => navigate({ to: "/" })}
        >
          Go to home
        </button>
      </div>
    ) : (
      <div className="w-full max-w-md rounded-2xl border border-[#303030] bg-[#1D1D1D] p-6 shadow-[inset_0_0_24px_rgba(0,0,0,0.25)]">
        <h1 className="text-xl font-semibold text-white">You are signed in</h1>
        <p className="mt-2 text-sm text-slate-300">{session.user.email}</p>
        <button
          type="button"
          className="mt-6 w-full rounded-md bg-[#114D28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#176636]"
          onClick={() => navigate({ to: "/" })}
        >
          Go to home
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const result = await authClient.signUp.email({ email, password, name });
        if (result.error) {
          setError(result.error.message || "Registration failed");
          return;
        }
        setRegistered(true);
        return;
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) {
          setError(result.error.message || "Login failed");
          return;
        }
      }
      navigate({ to: "/" });
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (isRegister) {
    return (
      <div className="w-full max-w-md rounded-2xl px-6 py-10 sm:px-8">
        <div className="mb-6 text-center">
          <div className="text-4xl">💰</div>
          <h1 className="mt-2 font-display text-[22px] font-extrabold leading-tight text-[#111511]">
            Save your
            <br />
            progress
          </h1>
          <div className="mt-3 inline-block rounded-full bg-[#0d3b2e] px-3 py-1 font-['JetBrains_Mono',monospace] text-[11px] font-medium tracking-widest text-white">
            + 200 bonus coins
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="signup-name"
              className="mb-1 block text-sm font-semibold text-[#2a2f2a]"
            >
              Name
            </label>
            <input
              id="signup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-[rgba(0,0,0,0.15)] bg-white px-3 py-2.5 text-sm text-[#111511] outline-none transition-colors focus:border-[#0d3b2e]"
              placeholder="Your name"
            />
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="mb-1 block text-sm font-semibold text-[#2a2f2a]"
            >
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-[rgba(0,0,0,0.15)] bg-white px-3 py-2.5 text-sm text-[#111511] outline-none transition-colors focus:border-[#0d3b2e]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="mb-1 block text-sm font-semibold text-[#2a2f2a]"
            >
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-[rgba(0,0,0,0.15)] bg-white px-3 py-2.5 text-sm text-[#111511] outline-none transition-colors focus:border-[#0d3b2e]"
              placeholder="8+ characters"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-[rgba(194,61,61,0.3)] bg-[rgba(194,61,61,0.08)] px-3 py-2 text-sm text-[#c23d3d]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0d3b2e] px-4 py-3 font-semibold text-[#f6efe0] transition-colors hover:bg-[#14523f] disabled:opacity-60"
          >
            {loading ? "Creating account…" : "✉  Sign up with Email"}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-[#8a8778]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#0d3b2e] hover:underline"
          >
            Sign in
          </Link>
        </p>

        <Link
          to="/"
          className="mt-3 block text-center text-[11px] text-[#8a8778] underline hover:text-[#2a2f2a]"
        >
          Continue as guest
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-[#303030] bg-[#1D1D1D] p-6 shadow-[inset_0_0_24px_rgba(0,0,0,0.25)]">
      <h1 className="text-2xl font-bold text-white">Sign in</h1>
      <p className="mt-1 text-sm text-slate-300">
        Sign in to join and create rooms
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

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm text-slate-200"
          >
            Password
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

        {error && (
          <p className="rounded-md border border-rose-700 bg-rose-900/30 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-[#7ed8a2] hover:text-[#9ee6ba]"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[#114D28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#176636] disabled:opacity-60"
        >
          {loading ? "Please wait..." : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-300">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-[#7ed8a2] hover:text-[#9ee6ba]"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
