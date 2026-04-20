import { useEffect, type ReactNode } from "react";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion, useAnimationControls } from "motion/react";
import { ActionButton } from "../controls/ActionButton";
import { ShuffleTilesButton } from "../controls/ShuffleTilesButton";
import { WordTile } from "../table/WordTile";
import type { BuilderTile } from "./RoomHandsBoard.types";
import { getLetterValue } from "../../../lib/letterValues";

const MOBILE_COMPACT_TILE_CLASS =
  "!h-11 !w-11 !text-[1.5rem] xs:!h-12 xs:!w-12 xs:!text-[1.75rem] sm:!h-24 sm:!w-24 sm:!text-[3rem] lg:!h-24 lg:!w-24 lg:!text-[3rem]";

type RoomBottomPanelProps = {
  isPhase1: boolean;
  mySubmission: any;
  canRevealSubmittedWords: boolean;
  showReveal: boolean;
  builderTiles: BuilderTile[];
  choiceSelections: Record<string, string>;
  handleChoiceSelect: (tileId: string, letter: string) => void;
  isValidating: boolean;
  hasUnresolvedChoices: boolean;
  validationError: string | null;
  wordPreview: string;
  shuffleTick: number;
  gameStage: "preflop" | "flop" | "turn" | "river" | "final" | "showdown";
  handleSubmitWord: () => void;
  renderBuilderTile: (tile: BuilderTile) => ReactNode;
  hasFolded?: boolean;
  onShuffleTiles?: () => void;
  disableShuffle?: boolean;
};

type AnimatedBuilderTileProps = {
  tile: BuilderTile;
  index: number;
  choiceSelections: Record<string, string>;
  handleChoiceSelect: (tileId: string, letter: string) => void;
  isValidating: boolean;
  renderBuilderTile: (tile: BuilderTile) => ReactNode;
  shuffleTick: number;
};

function HiddenBuilderTileSlot({ tileKey }: { tileKey: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[9px] leading-none opacity-0 sm:text-xs">-</div>
      <WordTile
        key={tileKey}
        showValue={false}
        variant="hidden"
        size="md"
        className={MOBILE_COMPACT_TILE_CLASS}
      />
    </div>
  );
}

function getShuffleTilt(index: number) {
  const direction = index % 2 === 0 ? 1 : -1;
  return direction * (4 + (index % 3) * 1.5);
}

function AnimatedBuilderTile({
  tile,
  index,
  choiceSelections,
  handleChoiceSelect,
  isValidating,
  renderBuilderTile,
  shuffleTick,
}: AnimatedBuilderTileProps) {
  const controls = useAnimationControls();
  const choiceLetters = Array.isArray(tile.letters) ? tile.letters : [];
  const showChoicePicker =
    !tile.disabled && tile.isChoice && choiceLetters.length > 0;
  const hasSelectedChoice = Boolean(choiceSelections[tile.id]);
  const reservesChoicePickerSpace = Boolean(
    tile.isChoice && choiceLetters.length > 0,
  );

  useEffect(() => {
    if (shuffleTick === 0) return;

    void controls.start({
      y: [0, -16, 0],
      rotate: [0, getShuffleTilt(index), 0],
      scale: [1, 1.05, 1],
      transition: {
        duration: 0.44,
        ease: "easeInOut",
        delay: index * 0.025,
      },
    });
  }, [controls, index, shuffleTick]);

  return (
    <motion.div
      initial={false}
      animate={controls}
      className={`relative flex flex-col items-center transition-opacity duration-300 ${
        reservesChoicePickerSpace ? "pt-[56px] sm:pt-[68px]" : ""
      } ${isValidating && tile.disabled ? "opacity-30" : "opacity-100"}`}
    >
      {showChoicePicker && (
        <div
          className={`absolute left-1/2 top-0 flex -translate-x-1/2 gap-1.5 rounded-lg border-2 border-[#3b82f6] bg-[#0a0a0a]/90 px-2 py-1.5 shadow-md backdrop-blur-sm sm:px-3 sm:py-2 ${
            hasSelectedChoice ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          {choiceLetters.map((letter, optionIndex) => (
            <button
              key={letter}
              onClick={() => handleChoiceSelect(tile.id, letter)}
              className="min-h-[36px] rounded-lg bg-slate-700 px-2 py-1 text-sm font-bold text-white transition-all hover:bg-[#3b82f6] sm:px-3 sm:py-1.5 sm:text-base"
              title={`Select ${letter} (value: ${getLetterValue(letter) ?? tile.baseValues?.[optionIndex] ?? 1})`}
              tabIndex={hasSelectedChoice ? -1 : 0}
            >
              {letter}
            </button>
          ))}
        </div>
      )}
      {renderBuilderTile(tile)}
    </motion.div>
  );
}

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
  canRevealSubmittedWords,
  showReveal,
  builderTiles,
  choiceSelections,
  handleChoiceSelect,
  isValidating,
  hasUnresolvedChoices,
  validationError,
  wordPreview,
  shuffleTick,
  gameStage,
  handleSubmitWord,
  renderBuilderTile,
  hasFolded,
  onShuffleTiles,
  disableShuffle,
}: RoomBottomPanelProps) {
  const hiddenTileCount = getHiddenTileCount(gameStage);
  const showSubmitAction = gameStage === "showdown" && wordPreview.length >= 2;
  const showActionRow = showSubmitAction || !!onShuffleTiles;

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
                className={MOBILE_COMPACT_TILE_CLASS}
              />
            ))}
          </div>
        ) : hasFolded ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="text-lg font-bold text-red-400 sm:text-2xl">
              You Folded
            </div>
            <div className="text-sm text-gray-400 sm:text-base">
              You are no longer eligible to submit a word
            </div>
          </div>
        ) : mySubmission && !canRevealSubmittedWords ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="text-lg font-bold text-[#f1eee7] sm:text-2xl">
              Word submitted
            </div>
            <div className="text-sm text-[#d7d1bf] sm:text-base">
              Waiting for the showdown reveal.
            </div>
          </div>
        ) : mySubmission ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-start justify-center gap-1">
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
                  <div className="flex flex-col items-center gap-1">
                    {tile.multiplier ? (
                      <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
                        {tile.multiplier === "2L" ? "2x" : "3x"}
                      </div>
                    ) : (
                      <div className="text-[9px] leading-none sm:text-xs opacity-0">
                        -
                      </div>
                    )}
                    <WordTile
                      letter={tile.letter}
                      baseValue={tile.baseValue}
                      multiplier={tile.multiplier}
                      showValue={true}
                      size="md"
                      className={MOBILE_COMPACT_TILE_CLASS}
                      variant="default"
                    />
                  </div>
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
              <div className="flex flex-wrap items-end justify-center gap-1 [@media(max-height:460px)]:gap-1.5">
                {builderTiles.map((tile, index) => (
                  <AnimatedBuilderTile
                    key={tile.id}
                    tile={tile}
                    index={index}
                    choiceSelections={choiceSelections}
                    handleChoiceSelect={handleChoiceSelect}
                    isValidating={isValidating}
                    renderBuilderTile={renderBuilderTile}
                    shuffleTick={shuffleTick}
                  />
                ))}
                {Array.from({ length: hiddenTileCount }).map((_, index) => (
                  <HiddenBuilderTileSlot
                    key={`bottom-stage-hidden-${gameStage}-${index}`}
                    tileKey={`bottom-stage-hidden-${gameStage}-${index}`}
                  />
                ))}
              </div>
            </SortableContext>

            <div className="mt-1 flex flex-col items-center gap-1.5 sm:mt-4 sm:gap-2">
              <div className="text-center text-sm font-bold tracking-[0.2em] text-white sm:text-xl">
                {wordPreview || " "}
              </div>
              {validationError && (
                <div className="text-xs font-medium text-[#ef4444] sm:text-sm">
                  {validationError}
                </div>
              )}
              {showActionRow && (
                <div className="flex items-center justify-center gap-2">
                  {onShuffleTiles ? (
                    <ShuffleTilesButton
                      onClick={onShuffleTiles}
                      disabled={disableShuffle}
                    />
                  ) : null}
                  {showSubmitAction ? (
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
                  ) : null}
                </div>
              )}
            </div>
          </>
        )}
      </>
    </div>
  );
}
