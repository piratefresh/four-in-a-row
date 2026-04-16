import type { ReactNode } from "react";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ActionButton } from "../controls/ActionButton";
import { WordTile } from "../table/WordTile";
import type { BuilderTile } from "./RoomHandsBoard.types";
import { getLetterValue } from "../../../lib/letterValues";

const MOBILE_COMPACT_TILE_CLASS =
  "h-[60px] w-[45px] text-[2rem] sm:h-28 sm:w-28 sm:text-6xl";

type RoomBottomPanelProps = {
  isPhase1: boolean;
  mySubmission: any;
  showReveal: boolean;
  builderTiles: BuilderTile[];
  choiceSelections: Record<string, string>;
  handleChoiceSelect: (tileId: string, letter: string) => void;
  isValidating: boolean;
  hasUnresolvedChoices: boolean;
  validationError: string | null;
  wordPreview: string;
  gameStage: "preflop" | "flop" | "turn" | "river" | "final" | "showdown";
  handleSubmitWord: () => void;
  renderBuilderTile: (tile: BuilderTile) => ReactNode;
};

function getHiddenTileCount(
  gameStage: RoomBottomPanelProps["gameStage"],
): number {
  switch (gameStage) {
    case "preflop":
      return 7;
    case "flop":
      return 3;
    case "turn":
      return 2;
    case "river":
      return 1;
    default:
      return 0;
  }
}

export function RoomBottomPanel({
  isPhase1,
  mySubmission,
  showReveal,
  builderTiles,
  choiceSelections,
  handleChoiceSelect,
  isValidating,
  hasUnresolvedChoices,
  validationError,
  wordPreview,
  gameStage,
  handleSubmitWord,
  renderBuilderTile,
}: RoomBottomPanelProps) {
  const hiddenTileCount = getHiddenTileCount(gameStage);

  return (
    <div className="relative z-30 w-[95vw] text-center sm:w-[min(56vw,980px)]">
      <>
        {/* {!mySubmission && !isPhase1 && (
          <div className="mb-3 text-[12px] leading-none text-[#e4dece] sm:mb-4 sm:text-[34px] [@media(max-height:460px)]:hidden">
            Drag cards to build a word. Click a letter to enable it.
          </div>
        )} */}

        {isPhase1 ? (
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {Array.from({ length: hiddenTileCount }).map((_, index) => (
              <WordTile
                key={`bottom-hidden-${index}`}
                showValue={false}
                variant="hidden"
              />
            ))}
          </div>
        ) : mySubmission ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
              {mySubmission.tiles.map((tile: any, index: number) => (
                <div
                  key={`revealed-${index}`}
                  className={`transition-all duration-500 ${
                    showReveal
                      ? "translate-y-0 scale-100 opacity-100"
                      : "translate-y-4 scale-95 opacity-0"
                  }`}
                  style={{
                    transitionDelay: showReveal ? `${index * 100}ms` : "0ms",
                  }}
                >
                  <WordTile
                    letter={tile.letter}
                    baseValue={tile.baseValue}
                    showValue={true}
                    size="lg"
                    className={MOBILE_COMPACT_TILE_CLASS}
                    variant="default"
                  />
                </div>
              ))}
            </div>
            {showReveal && (
              <div
                className={`rounded-md px-4 py-2 sm:px-6 sm:py-3 ${
                  mySubmission.score === 0
                    ? "bg-red-900/30 border-2 border-red-500/50"
                    : "bg-[#111218]"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <div
                    className={`text-lg font-bold sm:text-2xl ${
                      mySubmission.score === 0
                        ? "text-red-400 line-through decoration-2 decoration-red-500"
                        : "text-white"
                    }`}
                  >
                    {mySubmission.word.toUpperCase()}
                  </div>
                  {mySubmission.score === 0 && (
                    <span className="rounded-md bg-red-600/90 px-2 py-1 text-[11px] font-bold text-white sm:px-3 sm:text-[14px]">
                      INVALID
                    </span>
                  )}
                </div>
                <div
                  className={`text-sm font-semibold sm:text-lg ${
                    mySubmission.score === 0 ? "text-red-300" : "text-[#d4af37]"
                  }`}
                >
                  Score: {mySubmission.score}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <SortableContext
              items={builderTiles.map((tile) => tile.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-6 [@media(max-height:460px)]:gap-1.5">
                {builderTiles.map((tile) => (
                  <div
                    key={tile.id}
                    className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${
                      isValidating && tile.disabled
                        ? "opacity-30"
                        : "opacity-100"
                    }`}
                  >
                    {!tile.disabled &&
                      tile.isChoice &&
                      tile.letters &&
                      !choiceSelections[tile.id] && (
                        <div className="flex gap-1.5 rounded-lg border-2 border-[#3b82f6] bg-[#0a0a0a]/90 px-2 py-1.5 shadow-md backdrop-blur-sm sm:px-3 sm:py-2">
                          {tile.letters.map((letter, idx) => (
                            <button
                              key={letter}
                              onClick={() =>
                                handleChoiceSelect(tile.id, letter)
                              }
                              className="min-h-[36px] rounded-lg bg-slate-700 px-2 py-1 text-sm font-bold text-white transition-all hover:bg-[#3b82f6] sm:px-3 sm:py-1.5 sm:text-base"
                              title={`Select ${letter} (value: ${getLetterValue(letter) ?? tile.baseValues?.[idx] ?? 1})`}
                            >
                              {letter}
                            </button>
                          ))}
                        </div>
                      )}
                    {renderBuilderTile(tile)}
                  </div>
                ))}
                {Array.from({ length: hiddenTileCount }).map((_, index) => (
                  <WordTile
                    key={`bottom-stage-hidden-${gameStage}-${index}`}
                    showValue={false}
                    variant="hidden"
                  />
                ))}
              </div>
            </SortableContext>

            <div className="mt-3 flex flex-col items-center gap-1.5 sm:mt-4 sm:gap-2">
              <div className="text-center text-sm font-bold tracking-[0.2em] text-white sm:text-xl">
                {wordPreview || " "}
              </div>
              {hasUnresolvedChoices && (
                <div className="text-[10px] italic text-[#f59e0b] sm:text-xs">
                  Please select a letter for each choice card
                </div>
              )}
              {validationError && (
                <div className="text-xs font-medium text-[#ef4444] sm:text-sm">
                  {validationError}
                </div>
              )}
              {gameStage === "showdown" &&
                wordPreview &&
                wordPreview.length >= 2 && (
                  <ActionButton
                    variant="submit"
                    onClick={handleSubmitWord}
                    disabled={isValidating || hasUnresolvedChoices}
                  >
                    {isValidating
                      ? "Validating..."
                      : hasUnresolvedChoices
                        ? "Select Letters"
                        : "Submit Word"}
                  </ActionButton>
                )}
            </div>
          </>
        )}
      </>
    </div>
  );
}
