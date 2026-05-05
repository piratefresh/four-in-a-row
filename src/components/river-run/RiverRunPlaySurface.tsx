import { CircleDollarSign, RotateCcw, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRiverRunWordBuilder } from "./useRiverRunWordBuilder";
import { RiverRunHud } from "./RiverRunHud";
import { RiverRunTileRack } from "./RiverRunTileRack";
import { RiverRunWordStage } from "./RiverRunWordStage";
import type { RiverRunPlayRun, RiverRunPhase } from "./types";
import { RIVER_RUN_PHASES } from "./types";

export type { RiverRunPlayRun } from "./types";

export function RiverRunPlaySurface({ run }: { run: RiverRunPlayRun }) {
  const {
    selectedTiles,
    selectedWord,
    selectedScorePreview,
    selectedIndexes,
    activeSubmission,
    isSubmitting,
    submitError,
    addTile,
    removeTile,
    clearTiles,
    submit,
  } = useRiverRunWordBuilder(run);

  const canInteract = run.canSubmit && !isSubmitting;

  return (
    <section className="relative grid min-h-[calc(100dvh-8rem)] overflow-hidden rounded-md border border-cream/12 bg-[radial-gradient(circle_at_50%_10%,rgba(250,246,218,0.12),transparent_28%),linear-gradient(135deg,rgba(16,89,69,0.96),rgba(8,43,42,0.98)_55%,rgba(17,24,39,0.98))] shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute inset-0 opacity-[0.17] [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:100%_4px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_28%,rgba(250,204,21,0.14),transparent_16%),radial-gradient(circle_at_84%_72%,rgba(34,211,238,0.12),transparent_18%)]" />

      <div className="relative grid min-h-0 grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <RiverRunHud run={run} />

        <div className="grid min-h-[42rem] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <PowerUpRail credits={run.credits} />

          <div className="grid gap-4">
            <PhaseProgress
              phase={run.phase}
              submissions={run.submissions}
              targetIndex={run.targetIndex}
              targetCurveLength={run.targetCurve.length}
            />
            <TerminalBanner run={run} />
          </div>

          <div className="grid min-h-0 content-center gap-5">
            <RiverRunWordStage
              selectedTiles={selectedTiles}
              selectedWord={selectedWord}
              scorePreview={selectedScorePreview}
              currentSubmission={activeSubmission}
              onRemove={removeTile}
            />
          </div>

          <div className="grid gap-4">
            <div className="flex flex-col gap-3 rounded-md border border-cream/10 bg-black/18 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream/50">
                  Builder
                </div>
                <div className="mt-1 truncate font-display text-2xl font-black text-cream">
                  {selectedWord || "Select tiles"}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={clearTiles}
                  disabled={selectedTiles.length === 0 || isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-cream/15 bg-black/22 px-3 text-sm font-semibold text-cream/80 transition hover:border-cream/30 hover:text-cream disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void submit();
                  }}
                  disabled={!selectedWord || isSubmitting || !run.canSubmit}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-gold px-4 font-display text-sm font-black text-felt-deep transition hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Send className="size-4" aria-hidden="true" />
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>

            {submitError ? (
              <div className="rounded-md border border-red-300/20 bg-red-950/35 px-3 py-2 text-sm text-red-100">
                {submitError}
              </div>
            ) : null}

            <RiverRunTileRack
              tiles={run.tiles}
              phase={run.phase}
              selectedIndexes={selectedIndexes}
              canSelect={canInteract}
              onSelect={addTile}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PhaseProgress({
  phase,
  submissions,
  targetIndex,
  targetCurveLength,
}: {
  phase: RiverRunPhase;
  submissions: RiverRunPlayRun["submissions"];
  targetIndex: number;
  targetCurveLength: number;
}) {
  const currentIdx = RIVER_RUN_PHASES.indexOf(phase);

  return (
    <div className="flex items-center justify-center gap-0 rounded-md border border-cream/10 bg-black/18 px-4 py-3">
      {RIVER_RUN_PHASES.map((p, idx) => {
        const isActive = idx === currentIdx;
        const isPast = idx < currentIdx;
        const sub = submissions.find((s) => s.phase === p);
        const hasValidSubmission = sub?.valid;

        return (
          <div key={p} className="flex items-center">
            {idx > 0 ? (
              <div
                className={cn(
                  "h-px w-6 sm:w-10",
                  isPast ? "bg-gold/40" : "bg-cream/10",
                )}
              />
            ) : null}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "grid size-7 place-items-center rounded-full border text-[10px] font-bold transition sm:size-8 sm:text-xs",
                  isActive && "border-gold bg-gold/20 text-gold",
                  isPast &&
                    hasValidSubmission &&
                    "border-emerald-400/50 bg-emerald-400/10 text-emerald-300",
                  isPast &&
                    !hasValidSubmission &&
                    "border-cream/20 bg-cream/5 text-cream/50",
                  !isActive &&
                    !isPast &&
                    "border-cream/10 bg-cream/5 text-cream/30",
                )}
              >
                {isPast && hasValidSubmission ? (
                  <svg
                    className="size-3.5"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 8l3.5 3.5L13 5" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  "font-mono text-[9px] uppercase tracking-wider sm:text-[10px]",
                  isActive && "text-gold",
                  !isActive && "text-cream/30",
                )}
              >
                {p}
              </span>
            </div>
          </div>
        );
      })}
      <span className="ml-4 rounded-sm bg-cream/10 px-2 py-1 font-mono text-[10px] text-cream/40">
        Hand {targetIndex + 1}/{targetCurveLength}
      </span>
    </div>
  );
}

function TerminalBanner({ run }: { run: RiverRunPlayRun }) {
  if (run.terminalState === "completed") {
    return (
      <div className="rounded-md border border-gold/35 bg-gold/15 p-4 text-center">
        <div className="font-display text-4xl font-black text-cream">
          Run completed
        </div>
        <div className="mt-1 text-sm text-cream/70">
          Final score {run.totalScore}
        </div>
      </div>
    );
  }

  if (run.terminalState === "failed") {
    return (
      <div className="rounded-md border border-red-300/25 bg-red-950/35 p-4 text-center">
        <div className="font-display text-4xl font-black text-cream">
          Run failed
        </div>
        <div className="mt-1 text-sm text-cream/70">
          Hand total {run.handTotal} missed target {run.target}
        </div>
      </div>
    );
  }

  if (run.status === "shop") {
    return (
      <div className="rounded-md border border-cyan-300/20 bg-cyan-950/30 p-4 text-center">
        <div className="font-display text-4xl font-black text-cream">
          Target cleared
        </div>
        <div className="mt-1 text-sm text-cream/70">
          Total score {run.totalScore} — Shop available
        </div>
      </div>
    );
  }

  return null;
}

function PowerUpRail({ credits }: { credits: number }) {
  return (
    <div className="grid gap-3 rounded-md border border-cream/10 bg-black/18 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          <Sparkles className="size-4" aria-hidden="true" />
          Power-ups
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-cream/10 px-2 py-1 font-mono text-xs text-cream/75">
          <CircleDollarSign className="size-4 text-gold" aria-hidden="true" />
          {credits}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="grid min-h-16 place-items-center rounded-md border border-dashed border-cream/16 bg-black/16 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-cream/35"
          >
            Empty
          </div>
        ))}
      </div>
    </div>
  );
}
