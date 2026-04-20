import { WordTile } from "../table/WordTile";

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
};

const MOBILE_COMPACT_TILE_CLASS =
  "!h-12 !w-12 !text-[1.75rem] xs:!h-[52px] xs:!w-[52px] xs:!text-[2rem] sm:!h-28 sm:!w-28 sm:!text-6xl";

export function RoomCommunityStrip({
  tiles = [],
  hidden = false,
}: RoomCommunityStripProps) {
  return (
    <div className="flex-none px-4 pb-2 text-center">
      <div className="flex flex-col items-center gap-1.5 sm:gap-3">
        <div className="text-[11px] leading-none text-[#f1eee7] sm:text-[24px]">
          Community Letters
        </div>
        <div className="flex items-start gap-1 sm:gap-4">
          {Array.from({ length: 5 }).map((_, index) =>
            (() => {
              const tile = tiles[index];
              const isChoice = tile?.kind === "choice";
              const isRevealed = !hidden && (tile?.revealed ?? false);
              const hasMultiplier = isRevealed && tile?.multiplier;

              return (
                <div key={`community-strip-${index}`} className="flex flex-col items-center gap-1">
                  {hasMultiplier ? (
                    <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
                      {tile.multiplier === "2L" ? "2x" : "3x"}
                    </div>
                  ) : (
                    <div className="text-[9px] leading-none sm:text-xs opacity-0">-</div>
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
                    size="lg"
                    className={MOBILE_COMPACT_TILE_CLASS}
                    variant={isRevealed ? "community" : "hidden"}
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
