import { useEffect, useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScrabbleTile } from "./ScrabbleTile";
import { ActionButton } from "./ActionButton";
import { useRoomGameContext } from "./RoomGameContext";

type Tile =
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

type PlayerHand = {
  _id: string;
  playerId: string;
  tiles: Tile[];
  bet?: number;
  chips?: number;
  betThisRound?: number;
  totalBet?: number;
};

type RoomHandsBoardProps = {
  gameId: Id<"games">;
  roomCode?: string;
  gameStage: "preflop" | "flop" | "turn" | "river" | "final" | "showdown";
  communityTiles: Tile[];
  hands: PlayerHand[];
  getPlayerName: (playerId: string) => string;
  pot?: number;
};

type BuilderTile = {
  id: string;
  letter?: string;
  letters?: string[];
  baseValue?: number;
  baseValues?: number[];
  source: "hand" | "community";
  disabled?: boolean;
  isChoice?: boolean;
  cardIndex?: number;
};

function sortDisabledToEnd(tiles: BuilderTile[]) {
  return [...tiles].sort((a, b) => Number(!!a.disabled) - Number(!!b.disabled));
}

type SortableBuilderTileProps = {
  tile: BuilderTile;
  onToggleDisabled: (id: string) => void;
  selectedLetter?: string;
};

function SortableBuilderTile({
  tile,
  onToggleDisabled,
  selectedLetter,
}: SortableBuilderTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: tile.id,
    disabled: tile.disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleDisabled(tile.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`touch-none select-none ${isDragging ? "opacity-0" : ""} ${tile.disabled ? "translate-y-2 opacity-50" : ""} transition-all`}
    >
      <div
        className={
          tile.disabled
            ? "cursor-pointer"
            : "cursor-grab active:cursor-grabbing"
        }
        onClick={handleClick}
        {...(!tile.disabled ? { ...attributes, ...listeners } : {})}
      >
        <ScrabbleTile
          letter={tile.letter}
          letters={tile.letters}
          baseValue={tile.baseValue}
          baseValues={tile.baseValues}
          isChoice={tile.isChoice}
          selectedLetter={selectedLetter}
          showValue={true}
          size="lg"
          className="h-16 w-16 text-2xl sm:h-28 sm:w-28 sm:text-6xl"
          variant={tile.source === "community" ? "community" : "default"}
        />
      </div>
    </div>
  );
}

function getOpponentPosition(
  index: number,
  totalOpponents: number,
): "top" | "left" | "right" {
  if (totalOpponents === 1) return "top";
  if (totalOpponents === 2) return index === 0 ? "left" : "right";
  if (totalOpponents === 3) {
    if (index === 0) return "left";
    if (index === 1) return "top";
    return "right";
  }
  const positions: Array<"top" | "left" | "right"> = ["top", "left", "right"];
  return positions[index % 3]!;
}

const OPPONENT_POSITION_CLASS: Record<"top" | "left" | "right", string> = {
  top: "left-1/2 top-[2%] -translate-x-1/2",
  left: "left-[2%] top-[50%] -translate-y-1/2",
  right: "right-[2%] top-[50%] -translate-y-1/2",
};

const BET_POSITION_CLASS: Record<"top" | "left" | "right" | "bottom", string> = {
  top: "left-1/2 top-[12%] -translate-x-1/2",
  left: "left-[12%] top-1/2 -translate-y-1/2",
  right: "right-[12%] top-1/2 -translate-y-1/2",
  bottom: "left-1/2 bottom-[12%] -translate-x-1/2",
};

function toTitleCase(stage: RoomHandsBoardProps["gameStage"]) {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function RoomHandsBoardV2({
  gameId,
  roomCode,
  gameStage,
  communityTiles,
  hands,
  getPlayerName,
  pot = 0,
}: RoomHandsBoardProps) {
  const {
    anteAmount,
    raisesThisRound,
    maxRaisesPerRound,
    actionMessage,
    showBettingControls,
    showReadyButton,
    onReady,
    isReady,
    isTogglingReady,
    readyCount,
    totalPlayers,
    allPlayersReady,
    isBetting,
    canCheck,
    canCall,
    canRaise,
    canFold,
    onCheck,
    onCall,
    onRaise,
    onFold,
    onLeaveRoom,
    callLabel,
    raiseLabel,
    showdownTimeRemaining,
  } = useRoomGameContext();
  const submitWord = useAction(api.games.submitWord);
  const wordSubmissions = useQuery(api.games.getWordSubmissions, { gameId });
  const [builderTiles, setBuilderTiles] = useState<BuilderTile[]>([]);
  const [activeTile, setActiveTile] = useState<BuilderTile | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [choiceSelections, setChoiceSelections] = useState<
    Record<string, string>
  >({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // After rotation in parent, bottom player is always at index 0
  const bottomHand = useMemo(() => hands[0], [hands]);

  const opponents = useMemo(
    () =>
      bottomHand ? hands.filter((hand) => hand._id !== bottomHand._id) : [],
    [bottomHand, hands],
  );


  useEffect(() => {
    if (!bottomHand) {
      setBuilderTiles([]);
      return;
    }

    const nextTiles: BuilderTile[] = [
      ...bottomHand.tiles.map((tile, index) => {
        if (tile.kind === "choice") {
          return {
            id: `hand-${bottomHand._id}-${index}-choice-${tile.options.join("/")}`,
            letters: tile.options,
            baseValues: tile.baseValues,
            source: "hand" as const,
            disabled: true,
            isChoice: true,
            cardIndex: index,
          };
        }
        return {
          id: `hand-${bottomHand._id}-${index}-${tile.letter}-${tile.baseValue}`,
          letter: tile.letter,
          baseValue: tile.baseValue,
          source: "hand" as const,
          disabled: true,
          cardIndex: index,
        };
      }),
      ...communityTiles
        .filter((tile) => tile.revealed)
        .map((tile, index) => {
          if (tile.kind === "choice") {
            return {
              id: `community-${index}-choice-${tile.options.join("/")}`,
              letters: tile.options,
              baseValues: tile.baseValues,
              source: "community" as const,
              disabled: true,
              isChoice: true,
              cardIndex: index,
            };
          }
          return {
            id: `community-${index}-${tile.letter}-${tile.baseValue}`,
            letter: tile.letter,
            baseValue: tile.baseValue,
            source: "community" as const,
            disabled: true,
            cardIndex: index,
          };
        }),
    ];

    setBuilderTiles((previous) => {
      const nextById = new Map(nextTiles.map((tile) => [tile.id, tile]));
      const preserved = previous
        .map((tile) => nextById.get(tile.id))
        .filter((tile): tile is BuilderTile => !!tile);
      const preservedIds = new Set(preserved.map((tile) => tile.id));
      const missing = nextTiles.filter((tile) => !preservedIds.has(tile.id));
      return sortDisabledToEnd([...preserved, ...missing]);
    });
  }, [bottomHand, communityTiles]);

  const wordPreview = useMemo(
    () =>
      builderTiles
        .filter((tile) => !tile.disabled)
        .map((tile) => {
          if (tile.isChoice) {
            return choiceSelections[tile.id] || `[${tile.letters?.[0]}]`;
          }
          return tile.letter ?? "";
        })
        .join(""),
    [builderTiles, choiceSelections],
  );

  const unresolvedChoices = useMemo(() => {
    return builderTiles
      .filter((tile) => !tile.disabled && tile.isChoice)
      .filter((tile) => !choiceSelections[tile.id]);
  }, [builderTiles, choiceSelections]);

  const hasUnresolvedChoices = unresolvedChoices.length > 0;

  const mySubmission = useMemo(() => {
    if (!bottomHand || !wordSubmissions?.submissions) return null;
    return wordSubmissions.submissions.find(
      (s) => s.playerId === bottomHand.playerId,
    );
  }, [bottomHand, wordSubmissions]);

  const otherSubmissions = useMemo(() => {
    if (!bottomHand || !wordSubmissions?.submissions) return [];
    return wordSubmissions.submissions.filter(
      (s) => s.playerId !== bottomHand.playerId,
    );
  }, [bottomHand, wordSubmissions]);

  const handleToggleDisabled = (id: string) => {
    setBuilderTiles((prev) => {
      const tile = prev.find((t) => t.id === id);
      if (tile && !tile.disabled) {
        setChoiceSelections((selections) => {
          const { [id]: _, ...rest } = selections;
          return rest;
        });
      }
      return sortDisabledToEnd(
        prev.map((tile) =>
          tile.id === id ? { ...tile, disabled: !tile.disabled } : tile,
        ),
      );
    });
  };

  const handleChoiceSelect = (tileId: string, letter: string) => {
    setChoiceSelections((prev) => ({
      ...prev,
      [tileId]: letter,
    }));
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    const tile =
      builderTiles.find((item) => item.id === String(active.id)) ?? null;
    setActiveTile(tile);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveTile(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTile(null);
    if (!over || active.id === over.id) return;
    setBuilderTiles((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return sortDisabledToEnd(arrayMove(prev, oldIndex, newIndex));
    });
  };

  const handleSubmitWord = async () => {
    if (!wordPreview || wordPreview.length < 2) {
      setValidationError("Word must be at least 2 letters");
      return;
    }

    if (hasUnresolvedChoices) {
      setValidationError("Please select a letter for each choice card");
      return;
    }

    if (!bottomHand) {
      setValidationError("No player hand available");
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const enabledTiles = builderTiles.filter((tile) => !tile.disabled);
      const tiles = enabledTiles.map((tile) => {
        if (tile.isChoice) {
          const selectedLetter = choiceSelections[tile.id];
          const optionIndex = tile.letters?.indexOf(selectedLetter) ?? 0;
          const selectedValue = tile.baseValues?.[optionIndex] ?? 1;
          return {
            letter: selectedLetter,
            baseValue: selectedValue,
            source: tile.source,
            cardIndex: tile.cardIndex,
            wasChoice: true,
          };
        }
        return {
          letter: tile.letter!,
          baseValue: tile.baseValue!,
          source: tile.source,
          cardIndex: tile.cardIndex,
          wasChoice: false,
        };
      });

      const choiceResolutions: {
        hand?: Record<string, string>;
        community?: Record<string, string>;
      } = {};

      enabledTiles.forEach((tile) => {
        if (tile.isChoice && tile.cardIndex !== undefined) {
          const selectedLetter = choiceSelections[tile.id];
          const resolutionKey = tile.source === "hand" ? "hand" : "community";
          if (!choiceResolutions[resolutionKey]) {
            choiceResolutions[resolutionKey] = {};
          }
          choiceResolutions[resolutionKey]![String(tile.cardIndex)] =
            selectedLetter;
        }
      });

      const result = await submitWord({
        gameId,
        playerId: bottomHand.playerId,
        word: wordPreview.replace(/\[|\]/g, ""),
        tiles,
        choiceResolutions:
          Object.keys(choiceResolutions).length > 0
            ? choiceResolutions
            : undefined,
      });

      if (result?.forfeited) {
        setValidationError(result.message ?? "Invalid word. Submitted with 0 points.");
        setIsValidating(false);
        setTimeout(() => {
          setShowReveal(true);
        }, 500);
      } else {
        setIsValidating(false);
        setTimeout(() => {
          setShowReveal(true);
        }, 500);
      }
    } catch (error) {
      console.error("Error submitting word:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Error submitting word. Please try again.";
      setValidationError(message);
      setIsValidating(false);
    }
  };

  if (!bottomHand) return null;

  // Bottom player is always at index 0 after rotation
  const myName = getPlayerName(bottomHand.playerId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="relative h-[calc(100dvh-4rem)] overflow-hidden bg-[#212227] font-serif text-[#f1eee7] [@media(max-height:460px)]:h-[calc(100dvh-4rem)]">
        <div className="absolute left-2 top-2 z-20 max-w-[62vw] space-y-1 text-[14px] leading-none sm:left-5 sm:top-4 sm:max-w-none sm:space-y-2 sm:text-[36px]">
          <p>Room {roomCode ?? ""}</p>
          {showReadyButton ? (
            <p className="text-[#d9d0bf]">Waiting</p>
          ) : (
            <>
              <p>{toTitleCase(gameStage)}</p>
              <p className="text-[12px] sm:text-[36px]">
                Raises: {raisesThisRound}/{maxRaisesPerRound}
              </p>
              <p className="text-[12px] text-[#d9d0bf] sm:text-[32px]">
                Ante: ${anteAmount}
              </p>
            </>
          )}
          {actionMessage && (
            <p className="text-[12px] text-[#d9d0bf] sm:text-[28px]">{actionMessage}</p>
          )}
          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="mt-2 min-h-[40px] rounded-md bg-rose-600 px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-rose-700 sm:mt-4 sm:min-h-0 sm:px-4 sm:py-2 sm:text-[20px]"
            >
              Leave
            </button>
          )}
        </div>

        <div className="absolute right-2 top-2 z-20 text-right leading-none sm:right-8 sm:top-4">
          <div className="text-[22px] sm:text-[64px]">${pot}</div>
          <div className="text-[18px] sm:text-[58px]">Pot</div>
        </div>

        <main className="relative h-[calc(100dvh-4rem)] pb-[max(0.75rem,env(safe-area-inset-bottom))] [@media(max-height:460px)]:h-[calc(100dvh-4rem)]">
          {opponents.map((hand, opponentIndex) => {
            const position = getOpponentPosition(
              opponentIndex,
              opponents.length,
            );
            const opponentName = getPlayerName(hand.playerId);
            const opponentSubmission = otherSubmissions.find(
              (s) => s.playerId === hand.playerId,
            );

            return (
              <div
                key={`opponent-${hand._id}`}
                className={`absolute ${OPPONENT_POSITION_CLASS[position]} z-20`}
              >
                <div
                  className={`flex items-center gap-2 sm:gap-4 ${
                    position === "top"
                      ? "flex-col"
                      : position === "left"
                        ? "flex-row"
                        : "flex-row-reverse"
                  }`}
                >
                  <div className="grid h-7 w-7 place-items-center bg-[#f1f0eb] text-[11px] text-[#1d1d1d] sm:h-14 sm:w-14 sm:text-[20px]">
                    {getInitials(opponentName)}
                  </div>
                  <div className="max-w-[18vw] truncate text-[12px] leading-none sm:max-w-none sm:text-[44px] [@media(max-height:460px)]:hidden">
                    {opponentName}
                  </div>
                </div>

                {wordSubmissions?.isCompleted && opponentSubmission?.word && (
                  <div className="mt-3 flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-2">
                      {opponentSubmission.tiles.map(
                        (tile: any, index: number) => (
                          <ScrabbleTile
                            key={`revealed-opponent-${hand._id}-${index}`}
                            letter={tile.letter}
                            baseValue={tile.baseValue}
                            showValue={true}
                            size="sm"
                            variant="default"
                          />
                        ),
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative">
                        <span
                          className={`text-[13px] font-bold uppercase sm:text-[18px] ${
                            opponentSubmission.score === 0
                              ? "text-red-400 line-through decoration-2 decoration-red-500"
                              : "text-white"
                          }`}
                        >
                          {opponentSubmission.word.toUpperCase()}
                        </span>
                        {opponentSubmission.score === 0 && (
                        <span className="ml-2 rounded-md bg-red-600/90 px-2 py-0.5 text-[10px] font-bold text-white sm:text-[12px]">
                          INVALID
                        </span>
                      )}
                      </div>
                      <span
                        className={`rounded-md px-2 py-1 text-[12px] font-semibold sm:px-3 sm:text-[16px] ${
                          opponentSubmission.score === 0
                            ? "bg-red-900/40 text-red-300"
                            : "bg-[#121317] text-[#d4af37]"
                        }`}
                      >
                        Score: {opponentSubmission.score}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="absolute left-1/2 top-[42%] h-[34vh] w-[94vw] -translate-x-1/2 -translate-y-1/2 rounded-[90px] border-[14px] border-[#181a1f] bg-[#0f5f2f] shadow-[inset_0_0_40px_rgba(0,0,0,0.35)] sm:top-[45%] sm:h-[56vh] sm:w-[min(80vw,1400px)] sm:rounded-[180px] sm:border-[38px] [@media(max-height:460px)]:top-[38%] [@media(max-height:460px)]:h-[30vh]">
            {/* Opponent Bets inside table */}
            {opponents.map((hand, opponentIndex) => {
              const position = getOpponentPosition(opponentIndex, opponents.length);
              if ((hand.betThisRound ?? 0) <= 0) return null;
              return (
                <div key={`bet-${hand._id}`} className={`absolute ${BET_POSITION_CLASS[position]} z-20`}>
                  <div className="text-center leading-none">
                    <div className="text-[18px] text-[#f1eee7] sm:text-[48px]">${hand.betThisRound ?? 0}</div>
                    <div className="text-[12px] text-[#d9d0bf] sm:text-[32px]">Bet</div>
                  </div>
                </div>
              );
            })}

            {/* Bottom Player Bet inside table */}
            {bottomHand && (bottomHand.betThisRound ?? 0) > 0 && (
              <div className={`absolute ${BET_POSITION_CLASS.bottom} z-20`}>
                <div className="text-center leading-none">
                  <div className="text-[18px] text-[#f1eee7] sm:text-[48px]">${bottomHand.betThisRound ?? 0}</div>
                  <div className="text-[12px] text-[#d9d0bf] sm:text-[32px]">Bet</div>
                </div>
              </div>
            )}
            <div className="absolute left-1/2 top-1/2 flex w-full max-w-[96%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 sm:max-w-[70%] sm:gap-5">
              <div className="text-[14px] leading-none sm:text-[48px]">Community Letters</div>
              <div className="flex items-center gap-1 sm:gap-4">
                {Array.from({ length: 5 }).map((_, index) => {
                  const tile = communityTiles[index];
                  const isRevealed = tile?.revealed ?? false;
                  const isChoice = tile?.kind === "choice";
                  return (
                    <ScrabbleTile
                      key={`community-${index}`}
                      letter={
                        isRevealed && !isChoice && tile.kind === "single"
                          ? tile.letter
                          : undefined
                      }
                      letters={
                        isRevealed && isChoice && tile.kind === "choice"
                          ? tile.options
                          : undefined
                      }
                      baseValue={
                        isRevealed && !isChoice && tile.kind === "single"
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
                      className="h-12 w-12 text-lg sm:h-20 sm:w-20 sm:text-2xl"
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {showdownTimeRemaining !== null && (
            <div className="absolute bottom-[23%] left-[4%] text-[18px] leading-none text-[#f1eee7] sm:bottom-[25%] sm:left-[8%] sm:text-[64px]">
              {Math.floor(showdownTimeRemaining / 60000)
                .toString()
                .padStart(2, "0")}
              :
              {Math.floor((showdownTimeRemaining % 60000) / 1000)
                .toString()
                .padStart(2, "0")}
            </div>
          )}

          {showReadyButton && (
            <div className="absolute bottom-[27%] left-1/2 z-30 flex w-[92vw] -translate-x-1/2 flex-col items-stretch gap-2 sm:bottom-[19%] sm:right-[5%] sm:left-auto sm:w-auto sm:translate-x-0 sm:items-end sm:gap-3 [@media(max-height:460px)]:bottom-[22%]">
              <div className="rounded-lg bg-[#111218]/90 px-4 py-2 text-right backdrop-blur-sm sm:px-6 sm:py-3">
                <div className="text-[16px] leading-none text-[#f1eee7] sm:text-[24px]">
                  {readyCount}/{totalPlayers} Ready
                </div>
                <div className="mt-1 text-[12px] leading-none text-[#d9d0bf] sm:text-[16px]">
                  {allPlayersReady ? "Starting..." : "Waiting for players..."}
                </div>
              </div>
              <ActionButton
                variant={isReady ? "fold" : "check"}
                onClick={() => onReady?.()}
                disabled={isTogglingReady || allPlayersReady}
              >
                {isTogglingReady ? "..." : isReady ? "Not Ready" : "I'm Ready!"}
              </ActionButton>
            </div>
          )}

          {showBettingControls && (
            <div className="absolute bottom-[27%] left-1/2 z-30 grid w-[92vw] -translate-x-1/2 grid-cols-3 gap-2 sm:bottom-[19%] sm:right-[5%] sm:left-auto sm:flex sm:w-auto sm:translate-x-0 sm:flex-col sm:items-end sm:gap-5 [@media(max-height:460px)]:bottom-[22%]">
              <ActionButton
                variant={canCheck ? "check" : "call"}
                onClick={() => {
                  if (canCheck) {
                    onCheck?.();
                    return;
                  }
                  onCall?.();
                }}
                disabled={isBetting || (!canCheck && !canCall)}
              >
                {isBetting ? "Betting..." : canCheck ? "Check" : callLabel}
              </ActionButton>
              <ActionButton
                variant="raise"
                onClick={() => onRaise?.()}
                disabled={isBetting || !canRaise}
              >
                {isBetting ? "Betting..." : raiseLabel}
              </ActionButton>
              <ActionButton
                variant="fold"
                onClick={() => onFold?.()}
                disabled={isBetting || !canFold}
              >
                {isBetting ? "Betting..." : "Fold"}
              </ActionButton>
            </div>
          )}

          <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-30 w-[95vw] -translate-x-1/2 text-center sm:bottom-[3%] sm:w-[min(56vw,980px)] [@media(max-height:460px)]:bottom-[max(0.25rem,env(safe-area-inset-bottom))]">
            <div className="mb-2 text-[22px] leading-none sm:text-[50px]">{myName}</div>
            {!mySubmission && (
              <div className="mb-3 text-[12px] leading-none text-[#e4dece] sm:mb-4 sm:text-[34px] [@media(max-height:460px)]:hidden">
                Drag cards to build a word. Click a letter to enable it.
              </div>
            )}

            {mySubmission ? (
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
                        transitionDelay: showReveal
                          ? `${index * 100}ms`
                          : "0ms",
                      }}
                    >
                      <ScrabbleTile
                        letter={tile.letter}
                        baseValue={tile.baseValue}
                        showValue={true}
                        size="lg"
                        className="h-16 w-16 text-2xl sm:h-28 sm:w-28 sm:text-6xl"
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
                        mySubmission.score === 0
                          ? "text-red-300"
                          : "text-[#d4af37]"
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
                                  title={`Select ${letter} (value: ${tile.baseValues?.[idx]})`}
                                >
                                  {letter}
                                </button>
                              ))}
                            </div>
                          )}
                        <SortableBuilderTile
                          tile={tile}
                          onToggleDisabled={handleToggleDisabled}
                          selectedLetter={choiceSelections[tile.id]}
                        />
                      </div>
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
          </div>
        </main>

        <DragOverlay>
          {activeTile ? (
            <div style={{ cursor: "grabbing" }}>
              <ScrabbleTile
                letter={activeTile.letter}
                letters={activeTile.letters}
                baseValue={activeTile.baseValue}
                baseValues={activeTile.baseValues}
                isChoice={activeTile.isChoice}
                selectedLetter={choiceSelections[activeTile.id]}
                showValue={true}
                size="lg"
                className="h-16 w-16 text-2xl sm:h-28 sm:w-28 sm:text-6xl"
                variant={
                  activeTile.source === "community" ? "community" : "default"
                }
              />
            </div>
          ) : null}
        </DragOverlay>

      </div>
    </DndContext>
  );
}
