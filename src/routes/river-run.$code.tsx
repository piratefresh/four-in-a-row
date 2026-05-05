import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Target } from "lucide-react";
import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { RiverRunPlaySurface } from "@/components/river-run/RiverRunPlaySurface";

export const Route = createFileRoute("/river-run/$code")({
  component: RiverRunCodeRoute,
});

function RiverRunCodeRoute() {
  const { code } = Route.useParams();
  const result = useQuery(api.riverRun.getSoloRunByCode, { code });

  if (result === undefined) {
    return (
      <RiverRunShell code={code}>
        <div className="rounded-md border border-cream/12 bg-black/18 p-5 text-cream/75">
          Loading solo run...
        </div>
      </RiverRunShell>
    );
  }

  if (result.result === "unauthorized") {
    return (
      <RiverRunShell code={code}>
        <div className="rounded-md border border-gold/25 bg-gold/10 p-5">
          <h1 className="font-display text-3xl font-bold text-cream">
            Sign in to resume
          </h1>
          <p className="mt-2 text-sm leading-6 text-cream/70">
            River Run progress is tied to your account.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-flex rounded-md bg-gold px-4 py-2 font-display text-sm font-bold text-felt-deep hover:bg-gold-bright"
          >
            Sign in
          </Link>
        </div>
      </RiverRunShell>
    );
  }

  if (result.result === "notFound") {
    return (
      <RiverRunShell code={code}>
        <div className="rounded-md border border-red-400/25 bg-red-950/20 p-5">
          <h1 className="font-display text-3xl font-bold text-cream">
            Run not found
          </h1>
          <p className="mt-2 text-sm leading-6 text-cream/70">
            Start a fresh solo run to chase the target curve.
          </p>
          <Link
            to="/river-run"
            className="mt-4 inline-flex rounded-md bg-gold px-4 py-2 font-display text-sm font-bold text-felt-deep hover:bg-gold-bright"
          >
            Start solo run
          </Link>
        </div>
      </RiverRunShell>
    );
  }

  const run = result.run;

  return (
    <RiverRunShell code={run.roomCode}>
      <RiverRunPlaySurface run={run} />
    </RiverRunShell>
  );
}

function RiverRunShell({
  code,
  children,
}: {
  code: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-felt-deep text-cream">
      <div className="mx-auto flex min-h-dvh w-full flex-col px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            to="/river-run"
            className="inline-flex items-center gap-2 rounded-md border border-cream/15 bg-black/15 px-3 py-2 text-sm text-cream/80 transition-colors hover:border-gold/40 hover:text-cream"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            River Run
          </Link>
          <span className="inline-flex items-center gap-2 rounded-sm border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
            <Target className="size-3.5" aria-hidden="true" />
            {code}
          </span>
        </div>
        <div className="grid flex-1">{children}</div>
      </div>
    </main>
  );
}
