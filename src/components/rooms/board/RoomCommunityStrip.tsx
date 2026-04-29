import type { ReactNode } from "react";
import { WordTile, type WordTileSize } from "../table/word-tile-v2";
import { CountdownTimer } from "@/components/ui/countdown-timer";
import { useRoomGameContext } from "../context/RoomGameContext";

type CommunityStripTile =
  | {
      kind: "single";
      letter: string;
      baseValue: number;
      revealed?: boolean;
      multiplier?: "2L" | "3L";
    }
  | {
      kind: "choice";
      options: string[];
      baseValues: number[];
      revealed?: boolean;
      multiplier?: "2L" | "3L";
    };

type RoomCommunityStripProps = {
  tiles?: CommunityStripTile[];
  hidden?: boolean;
  tileSize?: WordTileSize;
  helperTip?: ReactNode;
};

export function RoomCommunityStrip({
  tiles = [],
  hidden = false,
  tileSize = "md",
  helperTip,
}: RoomCommunityStripProps) {
  const { showdownTimeRemaining, turnTimeRemaining } = useRoomGameContext();

  const timerMs = showdownTimeRemaining ?? turnTimeRemaining;

  return (
    <div
      id="tutorial-community-letters"
      className="flex-none px-4 pb-2 text-center"
    >
      <div className="flex flex-col items-center sm:gap-3">
        <CountdownTimer
          timeRemainingMs={timerMs}
        />
        <div className="flex items-center justify-center gap-1.5 text-[11px] leading-none text-[#f1eee7] sm:gap-2 sm:text-[24px]">
          <span>Community Letters</span>
          {helperTip}
        </div>
        <div className="flex items-start gap-1 sm:gap-4">
          {Array.from({ length: 5 }).map((_, index) =>
            (() => {
              const tile = tiles[index];
              const isChoice = tile?.kind === "choice";
              const isRevealed = !hidden && (tile?.revealed ?? false);
              const hasMultiplier = isRevealed && tile?.multiplier;

              return (
                <div
                  key={`community-strip-${index}`}
                  className="flex flex-col items-center gap-1"
                >
                  {hasMultiplier ? (
                    <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
                      {tile.multiplier === "2L" ? "2x" : "3x"}
                    </div>
                  ) : (
                    <div className="text-[9px] leading-none sm:text-xs opacity-0">
                      -
                    </div>
                  )}
                  <WordTile
                    letter={
                      isRevealed && tile?.kind === "single"
                        ? tile.letter
                        : undefined
                    }
                    letters={
                      isRevealed && isChoice && tile.kind === "choice"
                        ? tile.options
                        : undefined
                    }
                    baseValue={
                      isRevealed && tile?.kind === "single"
                        ? tile.baseValue
                        : undefined
                    }
                    baseValues={
                      isRevealed && isChoice && tile.kind === "choice"
                        ? tile.baseValues
                        : undefined
                    }
                    multiplier={isRevealed ? tile?.multiplier : undefined}
                    isChoice={isChoice}
                    showValue={isRevealed}
                    size={tileSize}
                    variant={isRevealed ? "community" : "empty"}
                  />
                </div>
              );
            })(),
          )}
        </div>
      </div>
    </div>
  );
}
