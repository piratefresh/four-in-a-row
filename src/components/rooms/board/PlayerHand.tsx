import { WordTile, type WordTileSize } from "../table/WordTile";
import type { BuilderTile } from "./RoomHandsBoard.types";

type PlayerHandProps = {
  tile: BuilderTile;
  selectedLetter?: string;
  tileSize: WordTileSize;
};

export function PlayerHand({
  tile,
  selectedLetter,
  tileSize,
}: PlayerHandProps) {
  return (
    <div style={{ cursor: "grabbing" }}>
      <div className="flex flex-col items-center gap-1">
        {tile.multiplier ? (
          <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
            {tile.multiplier === "2L" ? "2x" : "3x"}
          </div>
        ) : (
          <div className="text-[9px] leading-none opacity-0 sm:text-xs">-</div>
        )}
        <WordTile
          letter={tile.letter}
          letters={tile.letters}
          baseValue={tile.baseValue}
          baseValues={tile.baseValues}
          multiplier={tile.multiplier}
          isChoice={tile.isChoice}
          selectedLetter={selectedLetter}
          showValue={true}
          size={tileSize}
          variant={tile.source === "community" ? "community" : "default"}
        />
      </div>
    </div>
  );
}
