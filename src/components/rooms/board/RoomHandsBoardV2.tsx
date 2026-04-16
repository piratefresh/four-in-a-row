import { useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { WordTile } from "../table/WordTile";
import { RoomActionControls } from "../controls/RoomActionControls";
import { BlankRoomPhase } from "../phases/BlankRoomPhase";
import { PhasePlayerBadge } from "../phases/PhasePlayerBadge";
import { RoomBottomPanel } from "./RoomBottomPanel";
import { RoomBoardHeader } from "./RoomBoardHeader";
import { RoomCommunityStrip } from "./RoomCommunityStrip";
import {
  RoomOpponentLayer,
  getOpponentPosition,
  getPhase1OpponentPosition,
} from "./RoomOpponentLayer";
import { RoomTable } from "./RoomTable";
import type { BuilderTile, RoomHandsBoardProps } from "./RoomHandsBoard.types";
import { useRoomGameContext } from "../context/RoomGameContext";
import { useRoomWordBuilder } from "../hooks/useRoomWordBuilder";

const MOBILE_COMPACT_TILE_CLASS =
  "h-[60px] w-[45px] text-[2rem] sm:h-28 sm:w-28 sm:text-6xl";

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
      className={`touch-none select-none ${isDragging ? "opacity-0" : ""} ${tile.disabled ? "opacity-50" : ""} transition-all`}
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
        <WordTile
          letter={tile.letter}
          letters={tile.letters}
          baseValue={tile.baseValue}
          baseValues={tile.baseValues}
          isChoice={tile.isChoice}
          selectedLetter={selectedLetter}
          showValue={true}
          size="lg"
          className={MOBILE_COMPACT_TILE_CLASS}
          variant={tile.source === "community" ? "community" : "default"}
        />
      </div>
    </div>
  );
}

const BET_POSITION_CLASS: Record<"top" | "left" | "right" | "bottom", string> =
  {
    top: "left-1/2 top-[12%] -translate-x-1/2",
    left: "left-[12%] top-1/2 -translate-y-1/2",
    right: "right-[12%] top-1/2 -translate-y-1/2",
    bottom: "left-1/2 bottom-[12%] -translate-x-1/2",
  };

export function RoomHandsBoardV2({
  gameId,
  roomCode,
  gameStage,
  communityTiles,
  hands,
  bottomPlayerId,
  getPlayerName,
  getPlayerAvatar,
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const orderedHands = useMemo(() => {
    if (!bottomPlayerId || hands.length === 0) return hands;
    const bottomIndex = hands.findIndex(
      (hand) => hand.playerId === bottomPlayerId,
    );
    if (bottomIndex <= 0) return hands;
    return [...hands.slice(bottomIndex), ...hands.slice(0, bottomIndex)];
  }, [bottomPlayerId, hands]);

  const bottomHand = useMemo(() => orderedHands[0], [orderedHands]);

  const opponents = useMemo(
    () =>
      bottomHand
        ? orderedHands.filter((hand) => hand._id !== bottomHand._id)
        : [],
    [bottomHand, orderedHands],
  );

  const {
    activeTile,
    builderTiles,
    choiceSelections,
    handleChoiceSelect,
    handleDragCancel,
    handleDragEnd,
    handleDragStart,
    handleSubmitWord,
    handleToggleDisabled,
    hasUnresolvedChoices,
    isValidating,
    mySubmission,
    otherSubmissions,
    showReveal,
    validationError,
    wordPreview,
    wordSubmissions,
  } = useRoomWordBuilder({
    gameId,
    bottomHand,
    communityTiles,
  });

  if (!bottomHand) return null;

  // Bottom player is always at index 0 after rotation
  const myName = getPlayerName(bottomHand.playerId);

  const boardPhase: "phase0" | RoomHandsBoardProps["gameStage"] =
    showReadyButton ? "phase0" : gameStage;
  const isPhase0 = boardPhase === "phase0";
  const isPhase1 = boardPhase === "preflop";
  const opponentBets = useMemo(
    () =>
      opponents
        .map((hand, opponentIndex) => ({
          id: hand._id,
          amount: hand.betThisRound ?? 0,
          position: getOpponentPosition(opponentIndex, opponents.length),
        }))
        .filter((bet) => bet.amount > 0),
    [opponents],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-black font-serif text-[#f1eee7] [@media(max-height:460px)]:h-[calc(100dvh-4rem)]">
        <RoomBoardHeader
          phase={boardPhase}
          roomCode={roomCode}
          raisesThisRound={raisesThisRound}
          maxRaisesPerRound={maxRaisesPerRound}
          anteAmount={anteAmount}
          actionMessage={actionMessage ?? undefined}
          pot={pot}
          onLeaveRoom={onLeaveRoom}
        />

        <main className="flex min-h-0 flex-1 flex-col pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <RoomCommunityStrip
            tiles={communityTiles}
            hidden={isPhase0 || isPhase1}
          />

          <div className="relative flex min-h-0 flex-1 flex-col">
            {isPhase0 && (
              <BlankRoomPhase
                opponents={opponents.map((hand, opponentIndex) => ({
                  id: hand._id,
                  name: getPlayerName(hand.playerId),
                  avatarUrl: getPlayerAvatar(hand.playerId),
                  chips: hand.chips ?? 0,
                  bet: hand.betThisRound ?? 0,
                  position: getPhase1OpponentPosition(
                    opponentIndex,
                    opponents.length,
                  ),
                }))}
                bottomPlayer={{
                  name: myName,
                  avatarUrl: getPlayerAvatar(bottomHand.playerId),
                  chips: bottomHand.chips ?? 0,
                  bet: bottomHand.betThisRound ?? 0,
                }}
              />
            )}

            {!isPhase0 && (
              <div className="relative z-10 flex items-center justify-center px-4">
                {/* Wrapper with actual size including avatar overflow - responsive to match table size */}
                <div className="relative flex items-center justify-center min-h-[360px] min-w-[240px] sm:min-h-[440px] sm:min-w-[300px]">
                  <RoomTable
                    isPhase1={isPhase1}
                    pot={pot}
                    communityTiles={communityTiles}
                    opponentBets={opponentBets}
                    bottomBet={bottomHand.betThisRound ?? 0}
                    betPositionClass={BET_POSITION_CLASS}
                  />
                  <RoomOpponentLayer
                    opponents={opponents}
                    getPlayerName={getPlayerName}
                    getPlayerAvatar={getPlayerAvatar}
                    otherSubmissions={otherSubmissions}
                    wordSubmissions={wordSubmissions}
                  />
                  <div className="absolute bottom-[4%] left-1/2 z-20 -translate-x-1/2 translate-y-1/3 sm:bottom-[5%]">
                    <PhasePlayerBadge
                      name={myName}
                      avatarUrl={getPlayerAvatar(bottomHand.playerId)}
                      chips={bottomHand.chips ?? 0}
                      bet={bottomHand.betThisRound ?? 0}
                      avatarSizeClass="h-20 w-20 sm:h-24 sm:w-24"
                      initialsClass="text-[16px] sm:text-[18px]"
                      infoCardClassName="min-w-[112px] px-3 py-1.5 sm:min-w-[132px] sm:px-4 sm:py-2"
                      betClassName="left-auto right-0 translate-x-1/4"
                    />
                  </div>
                </div>
              </div>
            )}

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
          </div>

          <div className="flex flex-col items-center gap-4 px-4 sm:gap-5 sm:pb-[3%] [@media(max-height:460px)]:pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            {!isPhase0 && (
              <RoomBottomPanel
                isPhase1={isPhase1}
                mySubmission={mySubmission}
                showReveal={showReveal}
                builderTiles={builderTiles}
                choiceSelections={choiceSelections}
                handleChoiceSelect={handleChoiceSelect}
                isValidating={isValidating}
                hasUnresolvedChoices={hasUnresolvedChoices}
                validationError={validationError}
                wordPreview={wordPreview}
                gameStage={gameStage}
                handleSubmitWord={handleSubmitWord}
                renderBuilderTile={(tile) => (
                  <SortableBuilderTile
                    tile={tile}
                    onToggleDisabled={handleToggleDisabled}
                    selectedLetter={choiceSelections[tile.id]}
                  />
                )}
              />
            )}

            {showReadyButton && (
              <RoomActionControls
                ready={{
                  readyCount,
                  totalPlayers,
                  allPlayersReady,
                  isReady,
                  isTogglingReady,
                  onReady,
                }}
              />
            )}

            {showBettingControls && (
              <RoomActionControls
                betting={{
                  isBetting,
                  canCheck,
                  canCall,
                  canRaise,
                  canFold,
                  onCheck,
                  onCall,
                  onRaise,
                  onFold,
                  callLabel,
                  raiseLabel,
                }}
              />
            )}
          </div>
        </main>

        <DragOverlay>
          {activeTile ? (
            <div style={{ cursor: "grabbing" }}>
              <WordTile
                letter={activeTile.letter}
                letters={activeTile.letters}
                baseValue={activeTile.baseValue}
                baseValues={activeTile.baseValues}
                isChoice={activeTile.isChoice}
                selectedLetter={choiceSelections[activeTile.id]}
                showValue={true}
                size="lg"
                className={MOBILE_COMPACT_TILE_CLASS}
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
