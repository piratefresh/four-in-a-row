import { useEffect, type ReactNode } from "react";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion, useAnimationControls } from "motion/react";
import { ActionButton } from "../controls/ActionButton";
import { ShuffleTilesButton } from "../controls/ShuffleTilesButton";
import {
  WordTile,
  type WordTileSize,
  type WordTileVariant,
} from "../table/word-tile-v2";
import type { BuilderTile } from "./RoomHandsBoard.types";
import { getLetterValue } from "../../../lib/letterValues";
import type { ShowdownPreviewScore } from "../../../lib/showdownScore";

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
  wordScorePreview: ShowdownPreviewScore | null;
  shuffleTick: number;
  gameStage: "preflop" | "flop" | "turn" | "river" | "final" | "showdown";
  isShowdownSubmissionOpen?: boolean;
  handleSubmitWord: () => void;
  renderBuilderTile: (tile: BuilderTile) => ReactNode;
  hasFolded?: boolean;
  onShuffleTiles?: () => void;
  disableShuffle?: boolean;
  tileSize?: WordTileSize;
  helperTip?: ReactNode;
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

function getTileVariant(tile: BuilderTile): WordTileVariant {
  return tile.source === "community" ? "community" : "default";
}

function HiddenBuilderTileSlot({
  tileKey,
  tileSize,
}: {
  tileKey: string;
  tileSize: WordTileSize;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[9px] leading-none opacity-0 sm:text-xs">-</div>
      <WordTile
        key={tileKey}
        showValue={false}
        variant="empty"
        size={tileSize}
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
  const tileVariant = getTileVariant(tile);

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
      className={`relative flex flex-col items-center overflow-visible transition-opacity duration-300 ${
        isValidating && tile.disabled ? "opacity-30" : "opacity-100"
      }`}
    >
      {showChoicePicker && (
        <div
          className={`absolute bottom-full left-1/2 z-20 mb-1.5 flex -translate-x-1/2 flex-col items-center gap-1 rounded-[7px] border border-gold/45 bg-felt-deep/80 p-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.38)] backdrop-blur-sm sm:mb-2 ${
            hasSelectedChoice ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <div className="whitespace-nowrap px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cream/80 sm:text-xs">
            Select a Letter
          </div>
          <div className="flex gap-1">
            {choiceLetters.map((letter, optionIndex) => (
              <button
                key={letter}
                onClick={() => handleChoiceSelect(tile.id, letter)}
                className="rounded-[7px] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-deep"
                title={`Select ${letter} (value: ${getLetterValue(letter) ?? tile.baseValues?.[optionIndex] ?? 1})`}
                tabIndex={hasSelectedChoice ? -1 : 0}
              >
                <WordTile
                  letter={letter}
                  baseValue={
                    getLetterValue(letter) ??
                    tile.baseValues?.[optionIndex] ??
                    1
                  }
                  showValue={true}
                  size="xs"
                  variant={tileVariant}
                />
              </button>
            ))}
          </div>
        </div>
      )}
      {renderBuilderTile(tile)}
    </motion.div>
  );
}

function getHiddenCommunityTileCount(
  gameStage: RoomBottomPanelProps["gameStage"],
): number {
  switch (gameStage) {
    case "preflop":
      return 5;
    case "flop":
      return 2;
    case "turn":
      return 1;
    case "river":
    case "final":
    case "showdown":
      return 0;
    default:
      return 0;
  }
}

export function shouldShowSubmitWordAction(
  gameStage: RoomBottomPanelProps["gameStage"],
): boolean {
  return gameStage === "showdown";
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
  wordScorePreview,
  shuffleTick,
  gameStage,
  isShowdownSubmissionOpen = true,
  handleSubmitWord,
  renderBuilderTile,
  hasFolded,
  onShuffleTiles,
  disableShuffle,
  tileSize = "md",
  helperTip,
}: RoomBottomPanelProps) {
  const hiddenTileCount = getHiddenCommunityTileCount(gameStage);
  const showSubmitAction = shouldShowSubmitWordAction(gameStage);
  const showActionRow = showSubmitAction || !!onShuffleTiles;
  const isSubmitWordDisabled =
    !isShowdownSubmissionOpen ||
    isValidating ||
    hasUnresolvedChoices ||
    wordPreview.length < 2;

  return (
    <div
      id="tutorial-player-hand"
      className="relative z-30 w-[95vw] text-center sm:w-[min(56vw,980px)]"
    >
      {helperTip ? (
        <div className="absolute right-0 top-0 z-40 -translate-y-1/2">
          {helperTip}
        </div>
      ) : null}
      <>
        {/* {!mySubmission && !isPhase1 && (
          <div className="mb-3 text-[12px] leading-none text-[#e4dece] sm:mb-4 sm:text-[34px] [@media(max-height:460px)]:hidden">
            Drag cards to build a word. Click a letter to enable it.
          </div>
        )} */}

        {isPhase1 ? (
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
                  tileSize={tileSize}
                />
              ))}
            </div>
          </SortableContext>
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
                      size={tileSize}
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
            <div className="flex flex-col items-center gap-1 sm:gap-1.5">
              <div className="text-center font-bold text-white sm:text-xl">
                {wordPreview ? (
                  <span className="tracking-[0.2em]">{wordPreview}</span>
                ) : (
                  <span className="text-sm font-normal text-white/40 sm:text-base">
                    Select letters to preview
                  </span>
                )}{" "}
                <span className="text-[#f4d98b]">
                  {wordScorePreview
                    ? `${wordScorePreview.total}pts`
                    : hasUnresolvedChoices
                      ? "Select letters"
                      : "0pts"}
                </span>
              </div>
              {validationError && (
                <div className="text-xs font-medium text-[#ef4444] sm:text-sm">
                  {validationError}
                </div>
              )}
            </div>

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
                    tileSize={tileSize}
                  />
                ))}
              </div>
            </SortableContext>

            <div className="mt-2 flex flex-col items-center gap-1.5 sm:mt-4 sm:gap-2">
              {showActionRow && (
                <div className="flex flex-nowrap items-center justify-center gap-2">
                  {onShuffleTiles ? (
                    <ShuffleTilesButton
                      onClick={onShuffleTiles}
                      disabled={disableShuffle}
                    />
                  ) : null}
                  {showSubmitAction ? (
                    <ActionButton
                      id="tutorial-submit-word"
                      variant="submit"
                      onClick={handleSubmitWord}
                      disabled={isSubmitWordDisabled}
                    >
                      {!isShowdownSubmissionOpen
                        ? "Finish tutorial"
                        : isValidating
                          ? "Validating..."
                          : hasUnresolvedChoices
                            ? "Select Letters"
                            : wordPreview.length < 2
                              ? "Select Tiles"
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
