import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { LoginFelt } from "@/components/login/LoginFelt";
import { ActivityMarqueeTicker } from "@/components/home/ActivityMarqueeTicker";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    setCompact(mql.matches);
    const handler = (e: MediaQueryListEvent) => setCompact(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (session?.user) {
      toast.info("You are already signed in", {
        description: "Redirecting to the main menu.",
      });
      void navigate({ to: "/" });
    }
  }, [session, isPending, navigate]);

  if (isPending || session?.user) {
    return (
      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[var(--gradient-wire)]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-brass)] border-t-transparent" />
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || "Login failed");
        return;
      }
      navigate({ to: "/" });
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="relative flex flex-1 flex-col overflow-hidden pb-12"
      style={{
        background: "linear-gradient(#0a1d17 0%, #051410 100%)",
        color: "#e8dcc0",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(at 50% 30%, rgba(212,175,55,0.06) 0%, transparent 60%)",
        }}
      />

      <Link
        to="/"
        aria-label="Return to main menu"
        className="absolute left-4 top-4 z-[2] font-serif text-[22px] font-bold tracking-tighter text-[#f4e4c1] transition-colors hover:text-[#d4af37] sm:left-6 sm:top-5"
      >
        Word Poker
      </Link>

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-6 py-0 sm:py-6">
        <div className="flex w-full max-w-[1080px] flex-col gap-2">
          <div className="hidden md:block">
            <div
              className="font-mono text-[11px] uppercase tracking-[3px]"
              style={{ color: "#d4af37" }}
            >
              RESUME &middot; YOUR SEAT IS HELD
            </div>
            <h1
              className="mt-[12px] font-serif text-[48px] leading-[0.95] font-semibold tracking-tighter lg:text-[56px]"
              style={{ color: "#f4e4c1" }}
            >
              Pick up <em style={{ color: "#d4af37" }}>where</em>
              <br />
              you left off.
            </h1>
            <div
              className="mt-[14px] max-w-[640px] font-serif text-[15px] italic leading-[1.5]"
              style={{ color: "rgba(232,220,192,0.6)" }}
            >
              The Monastery dealt around your seat. You&apos;re still in for
              $340, big blind drops in 34 seconds.
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-2 lg:grid-cols-[1fr_1fr]">
          <div className="flex justify-center">
            <LoginFelt compact={compact} />
          </div>

          <div className="mx-auto w-full max-w-[420px]">
            <div
              className="rounded-[14px] border p-6"
              style={{
                background: "rgba(0,0,0,0.35)",
                borderColor: "rgba(212,175,55,0.18)",
                boxShadow: "0 30px 70px rgba(0,0,0,0.45)",
              }}
            >
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-[10px]">
                  <label className="block">
                    <div
                      className="mb-[6px] flex items-baseline justify-between font-mono text-[9px] tracking-[2px]"
                      style={{ color: "rgba(232,220,192,0.6)" }}
                    >
                      EMAIL
                    </div>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full rounded-[6px] border py-[12px] pl-[38px] pr-[14px] font-sans text-[14px] tracking-[0.2px] outline-none"
                        style={{
                          background: "rgba(0,0,0,0.35)",
                          color: "#f4e4c1",
                          borderColor: "rgba(212,175,55,0.18)",
                        }}
                      />
                      <span
                        className="absolute left-[12px] top-1/2 -translate-y-1/2 font-mono text-[13px]"
                        style={{ color: "rgba(232,220,192,0.3)" }}
                      >
                        @
                      </span>
                    </div>
                  </label>

                  <label className="block">
                    <div
                      className="mb-[6px] flex items-baseline justify-between font-mono text-[9px] tracking-[2px]"
                      style={{ color: "rgba(232,220,192,0.6)" }}
                    >
                      PASSWORD
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        placeholder="8+ characters"
                        className="w-full rounded-[6px] border py-[12px] pl-[38px] pr-[14px] font-sans text-[14px] tracking-[0.2px] outline-none"
                        style={{
                          background: "rgba(0,0,0,0.35)",
                          color: "#f4e4c1",
                          borderColor: "rgba(212,175,55,0.18)",
                        }}
                      />
                      <span
                        className="absolute left-[12px] top-1/2 -translate-y-1/2 font-mono text-[13px]"
                        style={{ color: "rgba(232,220,192,0.3)" }}
                      >
                        &#9679;
                      </span>
                    </div>
                  </label>
                </div>

                {error && (
                  <p
                    className="mt-3 rounded-[6px] border px-3 py-2 font-sans text-[13px]"
                    style={{
                      borderColor: "rgba(194,61,61,0.3)",
                      background: "rgba(194,61,61,0.08)",
                      color: "#f0a0a0",
                    }}
                  >
                    {error}
                  </p>
                )}

                <div className="mt-[18px]">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full cursor-pointer flex-col items-center gap-[1px] rounded-[6px] border-none px-[22px] pt-[11px] pb-[13px] leading-none disabled:opacity-60"
                    style={{ background: "#d4af37", color: "#1a1208" }}
                  >
                    <span className="font-mono text-[8px] tracking-[2px] opacity-60">
                      &#8627; SIGN IN
                    </span>
                    <span className="font-sans text-[14px] font-bold tracking-[0.5px]">
                      Sign in with Email
                    </span>
                  </button>
                </div>

                <div className="mt-3 text-right">
                  <Link
                    to="/forgot-password"
                    className="font-sans text-[12px] font-semibold"
                    style={{ color: "#d4af37" }}
                  >
                    Forgot password?
                  </Link>
                </div>
              </form>
            </div>

            <div
              className="sm:mt-[16px] text-center font-sans text-[12px]"
              style={{ color: "rgba(232,220,192,0.6)" }}
            >
              Don&apos;t have an account?{" "}
              <Link
                to="/register"
                className="font-semibold"
                style={{ color: "#d4af37" }}
              >
                Register
              </Link>{" "}
              &middot;{" "}
              <Link to="/" style={{ color: "#e8dcc0" }}>
                Continue as guest
              </Link>
            </div>
          </div>
        </div>
      </div>
      </div>

      <ActivityMarqueeTicker />
    </main>
  );
}
