import { X } from "lucide-react";
import type { RiverRunSubmission, SelectedTile } from "./types";

export function RiverRunWordStage({
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
      <div className="min-h-14 text-center">
        <div className="font-display text-5xl font-black leading-none text-cream drop-shadow-[0_4px_0_rgba(0,0,0,0.45)]">
          {selectedWord || currentSubmission?.word || "READY"}
        </div>
        <div className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-cream/55">
          {selectedTiles.length > 0
            ? `Preview ~${scorePreview} pts`
            : getSubmissionCaption(currentSubmission)}
        </div>
      </div>

      <div className="flex min-h-28 w-full max-w-3xl items-center justify-center gap-2 overflow-x-auto px-2">
        {selectedTiles.length === 0 ? (
          <div className="grid h-24 w-full max-w-xl place-items-center rounded-md border border-dashed border-cream/16 bg-black/12 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-cream/35">
            Tap letters below to build your word
          </div>
        ) : (
          selectedTiles.map((tile) => (
            <button
              key={tile.key}
              type="button"
              onClick={() => onRemove(tile.key)}
              className="group relative grid h-28 w-20 shrink-0 place-items-center rounded-md border border-cream/40 bg-cream text-felt-deep shadow-[0_10px_0_rgba(0,0,0,0.30)] transition hover:-translate-y-1"
              aria-label={`Remove ${tile.letter}`}
            >
              <span className="font-display text-4xl font-black leading-none">
                {tile.letter}
              </span>
              <span className="absolute bottom-1.5 right-1.5 font-mono text-[10px] font-bold text-felt-deep/60">
                {tile.baseValue}
              </span>
              {tile.multiplier ? (
                <span className="absolute left-1.5 top-1.5 rounded-sm bg-cyan-500 px-1 font-mono text-[9px] font-bold text-white">
                  {tile.multiplier}
                </span>
              ) : null}
              <span className="absolute -right-1 -top-1 rounded-full bg-red-600 p-1 text-white opacity-0 transition group-hover:opacity-100">
                <X className="size-3" aria-hidden="true" />
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function getSubmissionCaption(submission?: RiverRunSubmission) {
  if (!submission) return "No submission yet";
  if (submission.valid) return `Submitted for ${submission.score} pts`;
  return submission.invalidReason ?? "Invalid submission";
}
