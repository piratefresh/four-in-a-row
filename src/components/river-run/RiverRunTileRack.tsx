import { WordTile } from "@/components/rooms/table/word-tile-v2";
import { cn } from "@/lib/utils";
import type { RiverRunPhase, RiverRunViewTile, SelectedTile, TileMultiplier } from "./types";

function toSelectedTile(
  entry: RiverRunViewTile,
  optionIndex?: number,
): SelectedTile {
  if (entry.tile.kind === "single") {
    return {
      key: `${entry.index}:${entry.tile.letter}`,
      index: entry.index,
      letter: entry.tile.letter.toUpperCase(),
      baseValue: entry.tile.baseValue,
      multiplier: entry.tile.multiplier,
      wasChoice: false,
    };
  }

  const tile = entry.tile;
  const oi = optionIndex ?? 0;
  return {
    key: `${entry.index}:${tile.options[oi]}:${oi}`,
    index: entry.index,
    letter: tile.options[oi].toUpperCase(),
    baseValue: tile.baseValues[oi] ?? 1,
    multiplier: tile.multiplier,
    wasChoice: true,
  };
}

export function RiverRunTileRack({
  tiles,
  phase,
  selectedIndexes,
  canSelect,
  onSelect,
}: {
  tiles: RiverRunViewTile[];
  phase: RiverRunPhase;
  selectedIndexes: Set<number>;
  canSelect: boolean;
  onSelect: (tile: SelectedTile) => void;
}) {
  const newlyRevealedIndices: Set<number> =
    phase === "turn"
      ? new Set([4, 5])
      : phase === "river"
        ? new Set([6])
        : new Set();

  const revealedCount = tiles.filter((t) => t.revealed).length;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-cream/50">
        <span>Letters</span>
        <span>
          {revealedCount}/{tiles.length}
        </span>
      </div>
      <div className="flex min-h-28 items-end gap-2 overflow-x-auto rounded-md border border-cream/10 bg-black/18 p-3">
        {tiles.map((entry) => {
          if (!entry.revealed) {
            return (
              <div
                key={`hidden-${entry.index}`}
                className="flex shrink-0 flex-col items-center"
              >
                <WordTile size="md" variant="empty" />
              </div>
            );
          }

          const isSelected = selectedIndexes.has(entry.index);
          const isNew = newlyRevealedIndices.has(entry.index);

          if (entry.tile.kind === "single") {
            const tile = toSelectedTile(entry);
            return (
              <button
                key={tile.key}
                type="button"
                onClick={() => onSelect(tile)}
                disabled={!canSelect || isSelected}
                className={cn(
                  "shrink-0 transition-all hover:-translate-y-1",
                  isSelected &&
                    "translate-y-4 opacity-30 pointer-events-none",
                )}
              >
                <WordTile
                  letter={tile.letter}
                  baseValue={tile.baseValue}
                  multiplier={tile.multiplier as TileMultiplier}
                  size="md"
                  showValue
                  isNew={isNew}
                  disabled={!canSelect || isSelected}
                />
              </button>
            );
          }

          const tile = entry.tile;
          return (
            <div
              key={`choice-${entry.index}`}
              className={cn(
                "flex shrink-0 flex-col gap-1 rounded-md border border-cream/40 bg-cream p-1 shadow-[0_6px_0_rgba(0,0,0,0.25)]",
                isSelected && "translate-y-4 opacity-30",
              )}
            >
              {tile.options.map((letter, oi) => {
                const sel = toSelectedTile(entry, oi);
                return (
                  <button
                    key={sel.key}
                    type="button"
                    onClick={() => onSelect(sel)}
                    disabled={!canSelect || isSelected}
                    className="rounded-sm border border-felt-deep/15 bg-white/70 px-1 py-0.5 text-center font-display text-sm font-extrabold transition hover:bg-gold/35 disabled:cursor-not-allowed"
                  >
                    {letter.toUpperCase()}
                    <span className="ml-1 font-mono text-[9px] text-felt-deep/60">
                      {sel.baseValue}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
