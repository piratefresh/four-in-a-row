import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RefreshCw, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRiverRunWordBuilder, type RiverRunBuilderTile } from "./useRiverRunWordBuilder";
import { useRiverRunDraft } from "./useRiverRunDraft";
import { WordTile } from "@/components/rooms/table/word-tile-v2";
import type { RiverRunPlayRun, RiverRunPhase, TileMultiplier } from "./types";

export type { RiverRunPlayRun } from "./types";

const PHASE_LABEL: Record<RiverRunPhase, string> = {
  draft: "Phase 1: Draft",
  expand: "Phase 2: Expand",
  finale: "Phase 3: Finale",
};

const PHASE_DESC: Record<RiverRunPhase, string> = {
  draft: "10 tiles shown. Discard 6, keep 4.",
  expand: "6 tiles revealed. Play a word.",
  finale: "All 7 tiles revealed. Final word.",
};

export function RiverRunPlaySurface({ run }: { run: RiverRunPlayRun }) {
  if (run.phase === "draft") {
    return <RiverRunDraftPhase run={run} />;
  }

  return <RiverRunWordPhase run={run} />;
}

function RiverRunDraftPhase({ run }: { run: RiverRunPlayRun }) {
  const {
    selectedIndices,
    isSubmitting,
    submitError,
    handleToggleTile,
    handleSubmitDraft,
    canSubmit,
    selectedCount,
  } = useRiverRunDraft(run);

  return (
    <div className="mx-auto flex w-full flex-1 flex-col gap-4 px-4 pb-8 pt-2 sm:px-6">
      <GameHeader
        targetIndex={run.targetIndex}
        targetCurveLength={run.targetCurve.length}
      />
      <StatsBar
        target={run.target}
        handTotal={run.handTotal}
        credits={run.credits}
      />
      <TerminalBanner run={run} />

      <div className="text-center">
        <h2 className="font-display text-2xl text-cream">
          {PHASE_LABEL.draft}
        </h2>
        <p className="mt-1 text-sm italic text-cream/50">
          {PHASE_DESC.draft}
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-center gap-1.5">
        {run.tiles.map((entry, index) => (
          <DraftTile
            key={entry.index}
            entry={entry}
            isSelected={selectedIndices.has(index)}
            onToggle={() => handleToggleTile(index)}
            disabled={isSubmitting}
          />
        ))}
      </div>

      <div className="mt-1 text-center text-sm text-cream/60">
        {selectedCount} / 4 tiles selected
      </div>

      {submitError ? (
        <div className="mt-1 text-center text-xs font-medium text-game-red">
          {submitError}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          void handleSubmitDraft();
        }}
        disabled={!canSubmit || isSubmitting}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gold py-4 font-display text-base font-black text-felt-deep transition active:scale-[0.98] hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="size-4" aria-hidden="true" />
        {isSubmitting
          ? "Submitting..."
          : selectedCount === 4
            ? "Keep 4, Discard 6"
            : `Select ${4 - selectedCount} more tile${4 - selectedCount > 1 ? "s" : ""}`
        }
      </button>
    </div>
  );
}

function DraftTile({
  entry,
  isSelected,
  onToggle,
  disabled,
}: {
  entry: RiverRunPlayRun["tiles"][number];
  isSelected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const tile = entry.tile;
  const letter = tile.kind === "single" ? tile.letter.toUpperCase() : null;
  const baseValue = tile.kind === "single" ? tile.baseValue : null;
  const multiplier = tile.multiplier;

  return (
    <div className="flex flex-col items-center">
      {multiplier ? (
        <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
          {multiplier === "2L" ? "2x" : "3x"}
        </div>
      ) : (
        <div className="text-[9px] leading-none opacity-0 sm:text-xs">-</div>
      )}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "transition-all hover:-translate-y-1",
          isSelected &&
            "translate-y-2 scale-105 ring-2 ring-gold rounded-xl",
        )}
      >
        <WordTile
          letter={letter ?? undefined}
          letters={tile.kind === "choice" ? tile.options : undefined}
          baseValue={baseValue ?? undefined}
          baseValues={tile.kind === "choice" ? tile.baseValues : undefined}
          multiplier={multiplier}
          isChoice={tile.kind === "choice"}
          showValue
          size="md"
        />
      </button>
    </div>
  );
}

function RiverRunWordPhase({ run }: { run: RiverRunPlayRun }) {
  const {
    builderTiles,
    choiceSelections,
    wordPreview,
    wordScorePreview,
    activeTile,
    activeSubmission,
    isSubmitting,
    submitError,
    hasUnresolvedChoices,
    revealedCount,
    handleToggleDisabled,
    handleChoiceSelect,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
    handleSubmitWord,
  } = useRiverRunWordBuilder(run);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const newlyRevealedIndices: Set<number> =
    run.phase === "expand"
      ? new Set([4, 5])
      : run.phase === "finale"
        ? new Set([6])
        : new Set();

  const totalTiles = run.tiles.length;
  const hiddenCount = totalTiles - revealedCount;
  const isSubmitDisabled =
    !run.canSubmit ||
    isSubmitting ||
    wordPreview.length < 2 ||
    hasUnresolvedChoices;

  const normalizedWord = wordPreview.replace(/[^a-z]/gi, "").toUpperCase();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="mx-auto flex w-full flex-1 flex-col gap-4 px-4 pb-8 pt-2 sm:px-6">
        <GameHeader
          targetIndex={run.targetIndex}
          targetCurveLength={run.targetCurve.length}
        />

        <StatsBar
          target={run.target}
          handTotal={run.handTotal}
          credits={run.credits}
        />

        <PhaseProgress phase={run.phase} submissions={run.submissions} />

        {run.phase === "finale" && run.submissions.length > 0 ? (
          <PhaseHistory submissions={run.submissions} />
        ) : null}

        <div className="text-center">
          <h2 className="font-display text-2xl text-cream">
            {PHASE_LABEL[run.phase]}
          </h2>
          <p className="mt-1 text-sm italic text-cream/50">
            {PHASE_DESC[run.phase]}
          </p>
        </div>

        <TerminalBanner run={run} />

        {activeSubmission ? (
          <SubmittedWordDisplay submission={activeSubmission} />
        ) : (
          <>
            <div className="mb-1 text-center">
              <div className="text-lg font-bold text-cream sm:text-xl">
                <span className="tracking-[0.15em]">
                  {normalizedWord || "\u00A0"}
                </span>{" "}
                {wordScorePreview ? (
                  <span className="text-gold">
                    {wordScorePreview.total}pts
                  </span>
                ) : hasUnresolvedChoices ? (
                  <span className="text-game-muted text-sm">
                    Select letters
                  </span>
                ) : null}
              </div>
              {wordScorePreview && normalizedWord.length === 7 ? (
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gold">
                  +{wordScorePreview.lengthBonus} length bonus
                </div>
              ) : null}
              {submitError ? (
                <div className="mt-1 text-xs font-medium text-game-red">
                  {submitError}
                </div>
              ) : null}
            </div>

            <SortableContext
              items={builderTiles.map((t) => t.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex flex-wrap items-end justify-center gap-1.5">
                {builderTiles.map((tile) => (
                  <SortableBuilderTile
                    key={tile.id}
                    tile={tile}
                    choiceSelections={choiceSelections}
                    handleChoiceSelect={handleChoiceSelect}
                    handleToggleDisabled={handleToggleDisabled}
                    isNew={newlyRevealedIndices.has(tile.tileIndex)}
                    isSubmitting={isSubmitting}
                  />
                ))}
                {Array.from({ length: hiddenCount }).map((_, i) => (
                  <HiddenTileSlot
                    key={`hidden-${run.phase}-${i}`}
                  />
                ))}
              </div>
            </SortableContext>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  void handleSubmitWord();
                }}
                disabled={isSubmitDisabled}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gold py-4 font-display text-base font-black text-felt-deep transition active:scale-[0.98] hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="size-4" aria-hidden="true" />
                {isSubmitting
                  ? "Submitting..."
                  : hasUnresolvedChoices
                    ? "Select Letters"
                    : wordPreview.length < 2
                      ? "Select Tiles"
                      : `Submit ${run.phase}`}
              </button>
              <button
                type="button"
                disabled
                className="flex flex-col items-center justify-center rounded-xl border border-cream/20 bg-cream/5 px-4 text-cream/30 transition"
              >
                <RefreshCw className="size-5" aria-hidden="true" />
                <span className="mt-0.5 text-[9px] font-bold">FLIP (2)</span>
              </button>
            </div>
          </>
        )}
      </div>

      <DragOverlay>
        {activeTile ? (
          <div className="flex flex-col items-center gap-1">
            {activeTile.multiplier ? (
              <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
                {activeTile.multiplier === "2L" ? "2x" : "3x"}
              </div>
            ) : (
              <div className="text-[9px] leading-none opacity-0 sm:text-xs">
                -
              </div>
            )}
            <WordTile
              letter={activeTile.letter}
              letters={activeTile.letters}
              baseValue={activeTile.baseValue}
              baseValues={activeTile.baseValues}
              multiplier={activeTile.multiplier}
              isChoice={activeTile.isChoice}
              selectedLetter={
                activeTile.isChoice
                  ? choiceSelections[activeTile.id]
                  : undefined
              }
              showValue
              size="md"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableBuilderTile({
  tile,
  choiceSelections,
  handleChoiceSelect,
  handleToggleDisabled,
  isNew,
  isSubmitting,
}: {
  tile: RiverRunBuilderTile;
  choiceSelections: Record<string, string>;
  handleChoiceSelect: (id: string, letter: string) => void;
  handleToggleDisabled: (id: string) => void;
  isNew: boolean;
  isSubmitting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: tile.id,
    disabled: tile.disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const choiceLetters = tile.isChoice ? (tile.letters ?? []) : [];
  const hasSelectedChoice = Boolean(choiceSelections[tile.id]);
  const selectedLetter = tile.isChoice ? choiceSelections[tile.id] : undefined;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSubmitting) return;
    handleToggleDisabled(tile.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex flex-col items-center transition-opacity",
        isDragging && "opacity-0",
        tile.disabled && "opacity-50",
      )}
    >
      {tile.isChoice && !tile.disabled && !hasSelectedChoice ? (
        <div className="absolute bottom-full left-1/2 z-20 mb-1.5 flex -translate-x-1/2 flex-col items-center gap-1 rounded-lg border border-gold/45 bg-felt-deep/90 p-1.5 shadow-[0_6px_16px_rgba(0,0,0,0.4)] backdrop-blur-sm">
          <div className="whitespace-nowrap px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cream/80">
            Select
          </div>
          <div className="flex gap-1">
            {choiceLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChoiceSelect(tile.id, letter);
                }}
                className="rounded-md transition-transform hover:-translate-y-0.5"
              >
                <WordTile
                  letter={letter}
                  baseValue={1}
                  showValue
                  size="xs"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {tile.multiplier ? (
        <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
          {tile.multiplier === "2L" ? "2x" : "3x"}
        </div>
      ) : (
        <div className="text-[9px] leading-none opacity-0 sm:text-xs">-</div>
      )}

      <div
        className={cn(
          !tile.disabled && "cursor-grab active:cursor-grabbing",
          tile.disabled && "cursor-pointer",
        )}
        onClick={handleClick}
        {...(!tile.disabled ? { ...attributes, ...listeners } : {})}
      >
        <WordTile
          letter={tile.letter}
          letters={tile.letters}
          baseValue={tile.baseValue}
          baseValues={tile.baseValues}
          multiplier={tile.multiplier as TileMultiplier}
          isChoice={tile.isChoice}
          selectedLetter={selectedLetter}
          showValue
          size="md"
          isNew={isNew && !tile.disabled}
        />
      </div>
    </div>
  );
}

function HiddenTileSlot() {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[9px] leading-none opacity-0 sm:text-xs">-</div>
      <WordTile showValue={false} variant="empty" size="md" />
    </div>
  );
}

function SubmittedWordDisplay({
  submission,
}: {
  submission: RiverRunPlayRun["submissions"][number];
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-cream/10 bg-felt p-4 py-6">
      <div className="text-center">
        <div
          className={cn(
            "text-xl font-bold sm:text-2xl",
            submission.valid ? "text-cream" : "text-game-red line-through",
          )}
        >
          {submission.word.toUpperCase()}
        </div>
        <div className="mt-1 text-sm text-cream/60">
          {submission.valid
            ? `Score: ${submission.score}`
            : submission.invalidReason ?? "Invalid word"}
        </div>
        {submission.valid ? (
          <div className="mt-2 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-wider text-cream/40">
            <span>Letters: {submission.scoreBreakdown.letterPoints}</span>
            <span>Multiplier: +{submission.scoreBreakdown.multiplierBonus}</span>
            <span>Length: +{submission.scoreBreakdown.lengthBonus}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GameHeader({
  targetIndex,
  targetCurveLength,
}: {
  targetIndex: number;
  targetCurveLength: number;
}) {
  return (
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-gold">
        River Run Solo
      </p>
      <h1 className="font-display text-lg leading-tight text-cream">
        Hand {targetIndex + 1} of {targetCurveLength}
      </h1>
    </div>
  );
}

function StatsBar({
  target,
  handTotal,
  credits,
}: {
  target: number;
  handTotal: number;
  credits: number;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-1 rounded-xl border border-gold/20 bg-felt p-3 shadow-[0_0_12px_rgba(212,165,74,0.12)]">
        <p className="text-[10px] font-bold uppercase text-cream/50">
          Current Target
        </p>
        <p className="font-display text-2xl text-gold">{target}</p>
      </div>
      <div className="flex-1 rounded-xl border border-cream/10 bg-felt p-3">
        <p className="text-[10px] font-bold uppercase text-cream/50">
          Hand Score
        </p>
        <p className="font-display text-2xl text-cream">{handTotal}</p>
      </div>
      <div className="flex min-w-[70px] flex-col items-center justify-center rounded-xl border border-cream/10 bg-felt p-3">
        <svg
          className="mb-0.5 size-4 text-gold"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 10c0-2 4-3 4-3s4 1 4 3c0 2-4 4-4 4s-4-2-4-4Z" />
        </svg>
        <p className="text-sm font-bold text-cream">{credits}</p>
      </div>
    </div>
  );
}

function PhaseProgress({
  phase,
  submissions,
}: {
  phase: RiverRunPhase;
  submissions: RiverRunPlayRun["submissions"];
}) {
  const phases: RiverRunPhase[] = ["draft", "expand", "finale"];
  const currentIdx = phases.indexOf(phase);

  return (
    <div className="relative flex items-center justify-between px-2">
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-cream/10" />
      {phases.map((p, idx) => {
        const isActive = idx === currentIdx;
        const isPast = idx < currentIdx;
        const sub = submissions.find((s) => s.phase === p);
        const hasValid = sub?.valid;
        const isDraft = p === "draft";

        return (
          <div key={p} className="relative z-10 flex flex-col items-center">
            <div
              className={cn(
                "grid place-items-center rounded-full border-4 border-felt-deep font-bold transition",
                isActive &&
                  "size-8 bg-gold text-felt-deep text-xs",
                isPast &&
                  (hasValid || isDraft) &&
                  "size-6 bg-gold text-felt-deep text-[10px] opacity-50",
                isPast &&
                  !hasValid &&
                  !isDraft &&
                  "size-6 bg-cream/20 text-cream/40 text-[10px]",
                !isActive &&
                  !isPast &&
                  "size-6 bg-cream/20 text-cream/40 text-[10px]",
              )}
            >
              {isPast && (hasValid || isDraft) ? (
                <svg
                  className="size-3"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M3 8l3.5 3.5L13 5" />
                </svg>
              ) : (
                idx + 1
              )}
            </div>
            <span
              className={cn(
                "mt-1 text-[9px] font-bold uppercase tracking-wider",
                isActive ? "text-gold" : "text-cream/30",
              )}
            >
              {p}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PhaseHistory({
  submissions,
}: {
  submissions: RiverRunPlayRun["submissions"];
}) {
  const past = submissions.filter((s) => s.phase !== "finale");
  if (past.length === 0) return null;

  return (
    <div className="rounded-xl border border-cream/10 bg-felt p-4">
      <div className="mb-2 flex justify-between text-[10px] font-bold uppercase text-cream/40">
        <span>Phase History</span>
        <span>Points</span>
      </div>
      {past.map((sub) => (
        <div
          key={sub.phase}
          className="flex items-center justify-between py-1"
        >
          <span className="font-display text-sm text-cream/80">
            <span className="capitalize">{sub.phase}</span>:{" "}
            {sub.valid ? (
              <span className="font-bold uppercase tracking-wider text-cream">
                {sub.word}
              </span>
            ) : (
              <span className="italic text-red-300/80">invalid</span>
            )}
          </span>
          <span className="font-bold text-gold">+{sub.score}</span>
        </div>
      ))}
    </div>
  );
}

function TerminalBanner({ run }: { run: RiverRunPlayRun }) {
  if (run.terminalState === "completed") {
    return (
      <div className="rounded-xl border border-gold/30 bg-gold/10 p-5 text-center">
        <div className="font-display text-3xl font-black text-cream">
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
      <div className="rounded-xl border border-red-300/20 bg-red-950/30 p-5 text-center">
        <div className="font-display text-3xl font-black text-cream">
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
      <div className="rounded-xl border border-cyan-300/15 bg-cyan-950/25 p-5 text-center">
        <div className="font-display text-3xl font-black text-cream">
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
