import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { WordTile, type WordTileSize } from "../table/word-tile-v2";

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
  showLabel?: boolean;
  dense?: boolean;
};

type CommunityTileRevealAnimation = {
  className?: string;
  isNewlyRevealed: boolean;
  style?: {
    "--tile-glint-delay": string;
    animationDelay: string;
  } & CSSProperties;
};

const TILE_FLIP_DURATION_MS = 450;
const TILE_FLIP_STAGGER_MS = 130;
const TILE_FLIP_SETTLE_MS = 80;

export function isCommunityTileRevealed(
  tile: CommunityStripTile | undefined,
  hidden: boolean,
) {
  return !hidden && tile !== undefined && tile.revealed !== false;
}

export function getVisibleCommunityRevealCount(
  tiles: readonly CommunityStripTile[],
  hidden: boolean,
) {
  if (hidden) return 0;
  return tiles.filter((tile) => isCommunityTileRevealed(tile, hidden)).length;
}

export function getCommunityTileRevealAnimation({
  index,
  isRevealed,
  prevRevealedCount,
  revealedCount,
}: {
  index: number;
  isRevealed: boolean;
  prevRevealedCount: number;
  revealedCount: number;
}): CommunityTileRevealAnimation {
  const isNewlyRevealed =
    isRevealed && index >= prevRevealedCount && index < revealedCount;

  if (!isNewlyRevealed) return { isNewlyRevealed };

  return {
    className: "gf-tile animate-tile-flip",
    isNewlyRevealed,
    style: {
      "--tile-glint-delay": `${((index - prevRevealedCount) * TILE_FLIP_STAGGER_MS) / 1000}s`,
      animationDelay: `${((index - prevRevealedCount) * TILE_FLIP_STAGGER_MS) / 1000}s`,
    },
  };
}

export function RoomCommunityStrip({
  tiles = [],
  hidden = false,
  tileSize = "md",
  helperTip,
  showLabel = true,
  dense = false,
}: RoomCommunityStripProps) {
  const revealedCount = getVisibleCommunityRevealCount(tiles, hidden);
  const prevRevealedRef = useRef<number | null>(null);
  const prevCount = prevRevealedRef.current ?? 0;

  useEffect(() => {
    const previousCount = prevRevealedRef.current;

    if (previousCount === null || revealedCount <= previousCount) {
      prevRevealedRef.current = revealedCount;
      return;
    }

    const revealedThisRun = revealedCount - previousCount;
    const finalDelay = (revealedThisRun - 1) * TILE_FLIP_STAGGER_MS;
    const timeout = window.setTimeout(() => {
      prevRevealedRef.current = revealedCount;
    }, TILE_FLIP_DURATION_MS + finalDelay + TILE_FLIP_SETTLE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [revealedCount]);

  return (
    <div
      id="tutorial-community-letters"
      className={`relative flex-none text-center ${dense ? "px-2 pb-0" : "px-4 pb-2"}`}
    >
      <div className={`flex flex-col items-center ${dense ? "gap-0" : "sm:gap-3"}`}>
        {showLabel ? (
          <div className="flex items-center justify-center gap-1.5 text-[11px] leading-none text-[#f1eee7] sm:gap-2 sm:text-[24px]">
            <span>Community Letters</span>
          </div>
        ) : null}
        <div className={`flex items-center justify-center ${dense ? "gap-1" : "gap-2 sm:gap-3"}`}>
          <div className={`flex items-start ${dense ? "gap-1" : "gap-1 sm:gap-4"}`}>
            {Array.from({ length: 5 }).map((_, index) =>
              (() => {
                const tile = tiles[index];
                const isChoice = tile?.kind === "choice";
                const isRevealed = isCommunityTileRevealed(tile, hidden);
                const hasMultiplier = isRevealed && tile?.multiplier;
                const revealAnimation = getCommunityTileRevealAnimation({
                  index,
                  isRevealed,
                  prevRevealedCount: prevCount,
                  revealedCount,
                });

                return (
                  <div
                    key={`community-strip-${index}`}
                    className={`flex flex-col ${dense ? "gap-0" : "gap-1"}`}
                  >
                    <div className="flex min-h-[14px] items-center justify-center sm:min-h-[16px]">
                      {hasMultiplier ? (
                        <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
                          {tile.multiplier === "2L" ? "2x" : "3x"}
                        </div>
                      ) : dense ? null : (
                        <div className="text-[9px] leading-none opacity-0 sm:text-xs">
                          -
                        </div>
                      )}
                    </div>
                    <div
                      className={revealAnimation.className}
                      style={revealAnimation.style}
                    >
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
                        isNew={revealAnimation.isNewlyRevealed}
                        showValue={isRevealed}
                        size={tileSize}
                        variant={isRevealed ? "community" : "empty"}
                      />
                    </div>
                  </div>
                );
              })(),
            )}
          </div>
          {helperTip ? <div className="shrink-0 self-center">{helperTip}</div> : null}
        </div>
      </div>
    </div>
  );
}
