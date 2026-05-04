import { useMutation } from "convex/react";
import {
  CheckCircle2,
  CircleDollarSign,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

type RiverRunPhase = "deal" | "turn" | "river";
type RiverRunStatus = "active" | "shop" | "failed" | "completed";
type TileMultiplier = "2L" | "3L";

type RiverRunViewTile = {
  index: number;
  revealed: boolean;
  flippedThisHand?: boolean;
  tile:
    | {
        kind: "single";
        letter: string;
        baseValue: number;
        multiplier?: TileMultiplier;
      }
    | {
        kind: "choice";
        options: string[];
        baseValues: number[];
        multiplier?: TileMultiplier;
      };
};

type RiverRunSubmission = {
  phase: RiverRunPhase;
  word: string;
  score: number;
  valid: boolean;
  invalidReason?: string;
  tiles: Array<{
    index: number;
    letter: string;
    baseValue: number;
    multiplier?: TileMultiplier;
    wasChoice: boolean;
  }>;
  scoreBreakdown: {
    letterPoints: number;
    multiplierBonus: number;
    lengthBonus: number;
  };
  submittedAt: number;
};

export type RiverRunPlayRun = {
  roomCode: string;
  target: number;
  targetCurve: readonly number[];
  targetIndex: number;
  phase: RiverRunPhase;
  status: RiverRunStatus;
  terminalState: "failed" | "completed" | null;
  tiles: RiverRunViewTile[];
  revealedTiles: RiverRunViewTile[];
  credits: number;
  submissions: RiverRunSubmission[];
  handTotal: number;
  totalScore: number;
  canSubmit: boolean;
  canShop: boolean;
  updatedAt: number;
};

type SelectedTile = {
  key: string;
  index: number;
  letter: string;
  baseValue: number;
  multiplier?: TileMultiplier;
  wasChoice: boolean;
};

const PHASES: RiverRunPhase[] = ["deal", "turn", "river"];

export function RiverRunPlaySurface({ run }: { run: RiverRunPlayRun }) {
  const submitPhaseWord = useMutation(api.riverRun.submitPhaseWord);
  const [selectedTiles, setSelectedTiles] = useState<SelectedTile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectionKey = `${run.phase}:${run.updatedAt}`;

  useEffect(() => {
    setSelectedTiles([]);
    setSubmitError(null);
  }, [selectionKey]);

  const selectedIndexes = useMemo(
    () => new Set(selectedTiles.map((tile) => tile.index)),
    [selectedTiles],
  );
  const selectedWord = selectedTiles.map((tile) => tile.letter).join("");
  const selectedScorePreview = selectedTiles.reduce((total, tile) => {
    const multiplier = tile.multiplier === "3L" ? 3 : tile.multiplier === "2L" ? 2 : 1;
    return total + tile.baseValue * multiplier;
  }, 0);
  const activeSubmission = run.submissions.find(
    (submission) => submission.phase === run.phase,
  );

  function addTile(tile: SelectedTile) {
    if (!run.canSubmit || selectedIndexes.has(tile.index)) return;
    setSelectedTiles((current) => [...current, tile]);
    setSubmitError(null);
  }

  function removeSelectedTile(key: string) {
    setSelectedTiles((current) => current.filter((tile) => tile.key !== key));
  }

  async function handleSubmit() {
    if (!selectedWord || isSubmitting || !run.canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitPhaseWord({
        code: run.roomCode,
        word: selectedWord,
      });
      if (!result.submission.valid && result.submission.invalidReason) {
        setSubmitError(result.submission.invalidReason);
      }
      setSelectedTiles([]);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not submit word.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="relative grid min-h-[calc(100dvh-8rem)] overflow-hidden rounded-md border border-cream/12 bg-[radial-gradient(circle_at_50%_10%,rgba(250,246,218,0.12),transparent_28%),linear-gradient(135deg,rgba(16,89,69,0.96),rgba(8,43,42,0.98)_55%,rgba(17,24,39,0.98))] shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute inset-0 opacity-[0.17] [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:100%_4px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_28%,rgba(250,204,21,0.14),transparent_16%),radial-gradient(circle_at_84%_72%,rgba(34,211,238,0.12),transparent_18%)]" />

      <div className="relative grid min-h-0 grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <RunHud run={run} />

        <div className="grid min-h-[42rem] grid-rows-[auto_minmax(11rem,1fr)_auto] gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <PowerUpRail credits={run.credits} />

          <div className="grid min-h-0 content-center gap-5">
            <TerminalBanner run={run} />
            <SelectedWordStage
              selectedTiles={selectedTiles}
              selectedWord={selectedWord}
              scorePreview={selectedScorePreview}
              currentSubmission={activeSubmission}
              onRemove={removeSelectedTile}
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
                  onClick={() => setSelectedTiles([])}
                  disabled={selectedTiles.length === 0 || isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-cream/15 bg-black/22 px-3 text-sm font-semibold text-cream/80 transition hover:border-cream/30 hover:text-cream disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSubmit();
                  }}
                  disabled={!selectedWord || isSubmitting || !run.canSubmit}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-gold px-4 font-display text-sm font-black text-felt-deep transition hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Send className="size-4" aria-hidden="true" />
                  {isSubmitting ? "Submitting" : "Submit"}
                </button>
              </div>
            </div>

            {submitError ? (
              <div className="rounded-md border border-red-300/20 bg-red-950/35 px-3 py-2 text-sm text-red-100">
                {submitError}
              </div>
            ) : null}

            <TileRack
              tiles={run.tiles}
              selectedIndexes={selectedIndexes}
              canSelect={run.canSubmit && !isSubmitting}
              onSelect={addTile}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function RunHud({ run }: { run: RiverRunPlayRun }) {
  return (
    <aside className="grid content-start gap-3 border-b border-cream/10 bg-black/25 p-4 lg:border-b-0 lg:border-r">
      <div className="rounded-md border border-gold/25 bg-gold/10 p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
          Target {run.targetIndex + 1}/{run.targetCurve.length}
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="font-display text-5xl font-black leading-none text-cream">
            {run.target}
          </div>
          <Target className="mb-1 size-7 text-gold" aria-hidden="true" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
        <HudStat label="Hand" value={run.handTotal} tone="blue" />
        <HudStat label="Total" value={run.totalScore} tone="cream" />
        <HudStat label="Credits" value={run.credits} tone="gold" />
      </div>

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
          {PHASES.map((phase) => (
            <PhaseSubmissionRow
              key={phase}
              phase={phase}
              current={phase === run.phase}
              submission={run.submissions.find((entry) => entry.phase === phase)}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function HudStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "cream" | "gold";
}) {
  return (
    <div className="rounded-md border border-cream/10 bg-black/20 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cream/45">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display text-3xl font-black leading-none",
          tone === "blue" && "text-cyan-300",
          tone === "gold" && "text-gold",
          tone === "cream" && "text-cream",
        )}
      >
        {value}
      </div>
    </div>
  );
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
          Total score {run.totalScore}
        </div>
      </div>
    );
  }

  return null;
}

function SelectedWordStage({
  selectedTiles,
  selectedWord,
  scorePreview,
  currentSubmission,
  onRemove,
}: {
  selectedTiles: SelectedTile[];
  selectedWord: string;
  scorePreview: number;
  currentSubmission?: RiverRunSubmission;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="grid justify-items-center gap-4">
      <div className="min-h-10 text-center">
        <div className="font-display text-5xl font-black leading-none text-cream drop-shadow-[0_4px_0_rgba(0,0,0,0.45)]">
          {selectedWord || currentSubmission?.word || "READY"}
        </div>
        <div className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-cream/55">
          {selectedTiles.length > 0
            ? `Preview ${scorePreview}`
            : getSubmissionCaption(currentSubmission)}
        </div>
      </div>

      <div className="flex min-h-36 w-full max-w-3xl items-center justify-center gap-2 overflow-x-auto px-2 pb-2">
        {selectedTiles.length === 0 ? (
          <div className="grid h-28 w-full max-w-xl place-items-center rounded-md border border-dashed border-cream/16 bg-black/12 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-cream/35">
            Selected letters rise here
          </div>
        ) : (
          selectedTiles.map((tile) => (
            <button
              key={tile.key}
              type="button"
              onClick={() => onRemove(tile.key)}
              className="group relative grid h-32 w-24 shrink-0 place-items-center rounded-md border border-cream/40 bg-cream text-felt-deep shadow-[0_12px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-1"
              aria-label={`Remove ${tile.letter}`}
            >
              <TileFace tile={tile} large />
              <span className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white opacity-0 transition group-hover:opacity-100">
                <X className="size-3" aria-hidden="true" />
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function TileRack({
  tiles,
  selectedIndexes,
  canSelect,
  onSelect,
}: {
  tiles: RiverRunViewTile[];
  selectedIndexes: Set<number>;
  canSelect: boolean;
  onSelect: (tile: SelectedTile) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-cream/50">
        <span>Letters</span>
        <span>{tiles.filter((entry) => entry.revealed).length}/{tiles.length}</span>
      </div>
      <div className="flex min-h-36 items-end gap-2 overflow-x-auto rounded-md border border-cream/10 bg-black/18 p-3">
        {tiles.map((entry) => (
          <RackTile
            key={entry.index}
            entry={entry}
            selected={selectedIndexes.has(entry.index)}
            canSelect={canSelect}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function RackTile({
  entry,
  selected,
  canSelect,
  onSelect,
}: {
  entry: RiverRunViewTile;
  selected: boolean;
  canSelect: boolean;
  onSelect: (tile: SelectedTile) => void;
}) {
  if (!entry.revealed) {
    return (
      <div className="grid h-28 w-20 shrink-0 place-items-center rounded-md border border-cream/12 bg-red-700/85 shadow-[0_8px_0_rgba(0,0,0,0.28)]">
        <div className="size-9 rounded-sm border border-cream/55" />
      </div>
    );
  }

  if (entry.tile.kind === "single") {
    const tile: SelectedTile = {
      key: `${entry.index}:${entry.tile.letter}`,
      index: entry.index,
      letter: entry.tile.letter.toUpperCase(),
      baseValue: entry.tile.baseValue,
      multiplier: entry.tile.multiplier,
      wasChoice: false,
    };

    return (
      <button
        type="button"
        onClick={() => onSelect(tile)}
        disabled={!canSelect || selected}
        className={cn(
          "grid h-28 w-20 shrink-0 place-items-center rounded-md border border-cream/40 bg-cream text-felt-deep shadow-[0_8px_0_rgba(0,0,0,0.32)] transition hover:-translate-y-1 disabled:cursor-not-allowed",
          selected && "translate-y-5 opacity-35",
        )}
      >
        <TileFace tile={tile} />
      </button>
    );
  }

  const choiceTile = entry.tile;

  return (
    <div
      className={cn(
        "grid h-28 w-24 shrink-0 gap-1 rounded-md border border-cream/40 bg-cream p-1 text-felt-deep shadow-[0_8px_0_rgba(0,0,0,0.32)] transition",
        selected && "translate-y-5 opacity-35",
      )}
    >
      {choiceTile.options.slice(0, 2).map((letter, optionIndex) => {
        const tile: SelectedTile = {
          key: `${entry.index}:${letter}:${optionIndex}`,
          index: entry.index,
          letter: letter.toUpperCase(),
          baseValue: choiceTile.baseValues[optionIndex] ?? 1,
          multiplier: choiceTile.multiplier,
          wasChoice: true,
        };
        return (
          <button
            key={tile.key}
            type="button"
            onClick={() => onSelect(tile)}
            disabled={!canSelect || selected}
            className="grid min-h-0 rounded-sm border border-felt-deep/15 bg-white/70 transition hover:bg-gold/35 disabled:cursor-not-allowed"
          >
            <TileFace tile={tile} compact />
          </button>
        );
      })}
    </div>
  );
}

function TileFace({
  tile,
  large = false,
  compact = false,
}: {
  tile: SelectedTile;
  large?: boolean;
  compact?: boolean;
}) {
  return (
    <span className="grid h-full w-full content-between p-2">
      <span className="flex items-start justify-between gap-1">
        <span
          className={cn(
            "font-display font-black leading-none",
            large ? "text-5xl" : compact ? "text-2xl" : "text-4xl",
          )}
        >
          {tile.letter}
        </span>
        {tile.multiplier ? (
          <span className="rounded-sm bg-cyan-500 px-1 font-mono text-[10px] font-bold text-white">
            {tile.multiplier}
          </span>
        ) : null}
      </span>
      <span className="flex items-end justify-between">
        <span className="font-mono text-xs font-bold text-felt-deep/60">
          {tile.baseValue}
        </span>
        {tile.wasChoice ? (
          <span className="font-mono text-[9px] uppercase text-felt-deep/45">
            Choice
          </span>
        ) : null}
      </span>
    </span>
  );
}

function PhaseSubmissionRow({
  phase,
  current,
  submission,
}: {
  phase: RiverRunPhase;
  current: boolean;
  submission?: RiverRunSubmission;
}) {
  const icon = submission ? (
    submission.valid ? (
      <CheckCircle2 className="size-4 text-emerald-300" aria-hidden="true" />
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
      {icon}
      <div className="min-w-0">
        <div className="font-display text-sm font-bold capitalize text-cream">
          {phase}
        </div>
        <div className="truncate text-xs text-cream/50">
          {submission
            ? submission.valid
              ? submission.word
              : submission.invalidReason ?? submission.word
            : "Missing"}
        </div>
      </div>
      <div className="font-mono text-sm font-bold text-cream">
        {submission?.score ?? "-"}
      </div>
    </div>
  );
}

function getSubmissionCaption(submission?: RiverRunSubmission) {
  if (!submission) return "No submission";
  if (submission.valid) return `Submitted ${submission.score}`;
  return submission.invalidReason ?? "Invalid submission";
}
