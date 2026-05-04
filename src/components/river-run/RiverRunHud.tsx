import {
  CheckCircle2,
  CircleDollarSign,
  Target,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  RiverRunPhase,
  RiverRunPlayRun,
  RiverRunSubmission,
} from "./types";
import { RIVER_RUN_PHASES } from "./types";

export function RiverRunHud({ run }: { run: RiverRunPlayRun }) {
  return (
    <aside className="grid content-start gap-3 border-b border-cream/10 bg-black/25 p-4 lg:border-b-0 lg:border-r">
      <TargetCard
        target={run.target}
        targetIndex={run.targetIndex}
        targetCurveLength={run.targetCurve.length}
      />

      <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
        <HudStat label="Hand" value={run.handTotal} tone="blue" />
        <HudStat label="Total" value={run.totalScore} tone="cream" />
        <HudStat
          label="Credits"
          value={run.credits}
          tone="gold"
          icon={<CircleDollarSign className="size-4" />}
        />
      </div>

      <PhasePanel run={run} />
    </aside>
  );
}

function TargetCard({
  target,
  targetIndex,
  targetCurveLength,
}: {
  target: number;
  targetIndex: number;
  targetCurveLength: number;
}) {
  return (
    <div className="rounded-md border border-gold/25 bg-gold/10 p-4">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
        <Target className="size-3.5" aria-hidden="true" />
        Target {targetIndex + 1}/{targetCurveLength}
      </div>
      <div className="mt-2 font-display text-5xl font-black leading-none text-cream">
        {target}
      </div>
    </div>
  );
}

function HudStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "blue" | "cream" | "gold";
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-cream/10 bg-black/20 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cream/45">
        {label}
      </div>
      <div className="mt-1 flex items-end justify-between">
        <span
          className={cn(
            "font-display text-3xl font-black leading-none",
            tone === "blue" && "text-cyan-300",
            tone === "gold" && "text-gold",
            tone === "cream" && "text-cream",
          )}
        >
          {value}
        </span>
        {icon ? <span className="mb-0.5 text-gold/60">{icon}</span> : null}
      </div>
    </div>
  );
}

function PhasePanel({ run }: { run: RiverRunPlayRun }) {
  return (
    <div className="rounded-md border border-cream/10 bg-black/20 p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream/50">
          Phase
        </span>
        <span className="rounded-sm bg-cream/10 px-2 py-1 font-display text-sm font-bold capitalize text-gold">
          {run.phase}
        </span>
      </div>
      <div className="grid gap-2">
        {RIVER_RUN_PHASES.map((phase) => {
          const submission = run.submissions.find(
            (s) => s.phase === phase,
          );
          const isCurrent = phase === run.phase;
          return (
            <PhaseRow
              key={phase}
              phase={phase}
              current={isCurrent}
              submission={submission}
            />
          );
        })}
      </div>
    </div>
  );
}

function PhaseRow({
  phase,
  current,
  submission,
}: {
  phase: RiverRunPhase;
  current: boolean;
  submission?: RiverRunSubmission;
}) {
  const Icon = submission ? (
    submission.valid ? (
      <CheckCircle2
        className="size-4 text-emerald-300"
        aria-hidden="true"
      />
    ) : (
      <XCircle className="size-4 text-red-300" aria-hidden="true" />
    )
  ) : (
    <span className="size-2 rounded-full bg-cream/25" />
  );

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-sm border border-cream/8 bg-black/18 px-2 py-2",
        current && "border-gold/35 bg-gold/10",
      )}
    >
      {Icon}
      <div className="min-w-0">
        <div className="font-display text-sm font-bold capitalize text-cream">
          {phase}
        </div>
        <div className="truncate text-xs text-cream/50">
          {submission
            ? submission.valid
              ? submission.word
              : (submission.invalidReason ?? submission.word)
            : "Waiting"}
        </div>
      </div>
      <div className="font-mono text-sm font-bold text-cream">
        {submission?.score ?? "-"}
      </div>
    </div>
  );
}
