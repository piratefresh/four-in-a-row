import { WordTile } from "../table/WordTile";

type CommunityStripTile =
  | {
      kind: "single";
      letter: string;
      baseValue: number;
      revealed?: boolean;
    }
  | {
      kind: "choice";
      options: string[];
      baseValues: number[];
      revealed?: boolean;
    };

type RoomCommunityStripProps = {
  tiles?: CommunityStripTile[];
  hidden?: boolean;
};

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
      <div className="flex items-center gap-1 sm:gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          (() => {
            const tile = tiles[index];
            const isChoice = tile?.kind === "choice";
            const isRevealed = !hidden && (tile?.revealed ?? false);

            return (
              <WordTile
                key={`community-strip-${index}`}
                letter={
                  isRevealed && tile?.kind === "single" ? tile.letter : undefined
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
                isChoice={isChoice}
                showValue={isRevealed}
                size="sm"
                variant={isRevealed ? "community" : "hidden"}
                className="h-[60px] w-[45px] text-[2rem] sm:h-20 sm:w-20 sm:text-2xl"
              />
            );
          })()
        ))}
      </div>
      </div>
    </div>
  );
}
