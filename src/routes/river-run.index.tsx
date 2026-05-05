import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Target, Waves } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/river-run/")({
  component: RiverRunLandingRoute,
});

function RiverRunLandingRoute() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const convexAuthUser = useQuery(api.auth.getCurrentUser);
  const createSoloRun = useMutation(api.riverRun.createSoloRun);
  const [isStarting, setIsStarting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleStartRun() {
    if (!session?.user) {
      await navigate({ to: "/login" });
      return;
    }

    if (convexAuthUser === undefined) {
      setStatusMessage(
        "Checking authentication, please try again in a moment.",
      );
      return;
    }

    if (!convexAuthUser) {
      setStatusMessage(
        "Convex auth is not ready. Please sign out and sign back in.",
      );
      return;
    }

    setIsStarting(true);
    setStatusMessage(null);

    try {
      const result = await createSoloRun({
        name: session.user.name?.trim() || session.user.email || "Player",
      });
      await navigate({
        to: "/river-run/$code",
        params: { code: result.code },
      });
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to start River Run.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-felt-deep text-cream">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md border border-cream/15 bg-black/15 px-3 py-2 text-sm text-cream/80 transition-colors hover:border-gold/40 hover:text-cream"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Modes
          </Link>
          <span className="rounded-sm border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
            Solo run
          </span>
        </div>

        <section className="grid flex-1 content-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center lg:gap-12">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-sm bg-cream/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
              <Waves className="size-4" aria-hidden="true" />
              Deal / Turn / River
            </div>
            <h1 className="font-display text-5xl font-black leading-none text-cream sm:text-7xl">
              River Run
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-7 text-cream/78 sm:text-xl sm:leading-8">
              Beat the target score with three words. Clear the river, raise the
              target, and keep the run alive.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  void handleStartRun();
                }}
                disabled={isStarting}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-gold px-5 py-3 font-display text-base font-extrabold text-felt-deep transition-colors hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isStarting ? "Starting run..." : "Start solo run"}
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-cream/55">
                Target curve starts at 45
              </span>
            </div>

            {statusMessage ? (
              <div className="mt-5 max-w-xl rounded-md border border-cyan-500/20 bg-cyan-950/25 p-3 text-sm text-cyan-100">
                {statusMessage}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-md border border-cream/12 bg-black/18 p-4">
            {[
              ["Deal", "4 tiles revealed"],
              ["Turn", "6 tiles revealed"],
              ["River", "7 tiles revealed"],
            ].map(([phase, detail], index) => (
              <div
                key={phase}
                className="flex items-center justify-between gap-4 border-b border-cream/10 py-3 last:border-b-0"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-sm bg-cream/10 font-mono text-xs text-gold">
                    {index + 1}
                  </span>
                  <span className="font-display text-lg font-bold">
                    {phase}
                  </span>
                </span>
                <span className="text-sm text-cream/65">{detail}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center gap-3 rounded-sm bg-felt/70 p-3">
              <Target
                className="size-5 shrink-0 text-gold"
                aria-hidden="true"
              />
              <p className="text-sm leading-5 text-cream/75">
                Hit or beat the current target after River to reach the next
                hand.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
