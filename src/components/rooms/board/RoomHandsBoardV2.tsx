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
import { RaiseAmountSlider } from "../controls/RaiseAmountSlider";
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
  "!h-12 !w-12 !text-[1.75rem] xs:!h-[52px] xs:!w-[52px] xs:!text-[2rem] sm:!h-24 sm:!w-24 sm:!text-[3.25rem] lg:!h-24 lg:!w-24 lg:!text-[3.25rem]";

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
      <div className="flex flex-col items-center gap-1">
        {tile.multiplier ? (
          <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
            {tile.multiplier === "2L" ? "2x" : "3x"}
          </div>
        ) : (
          <div className="text-[9px] leading-none sm:text-xs opacity-0">-</div>
        )}
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
            multiplier={tile.multiplier}
            isChoice={tile.isChoice}
            selectedLetter={selectedLetter}
            showValue={true}
            size="md"
            className={MOBILE_COMPACT_TILE_CLASS}
            variant={tile.source === "community" ? "community" : "default"}
          />
        </div>
      </div>
    </div>
  );
}

const BET_POSITION_CLASS: Record<"top" | "left" | "right" | "bottom", string> =
  {
    top: "left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2",
    left: "left-[32%] top-[50%] -translate-x-1/2 -translate-y-1/2",
    right: "left-[68%] top-[50%] -translate-x-1/2 -translate-y-1/2",
    bottom: "left-1/2 top-[62%] -translate-x-1/2 -translate-y-1/2",
  };

function formatPlayerActionLabel(
  lastAction?: "check" | "call" | "raise" | "fold",
) {
  if (!lastAction) return undefined;
  return lastAction.toUpperCase();
}

function renderEmptyBuilderTile() {
  return null;
}

export function RoomHandsBoardV2({
  gameId,
  roomCode,
  currentTurnPlayerId,
  gameStage,
  communityTiles,
  hands,
  bottomPlayerId,
  getPlayerName,
  getPlayerAvatar,
  getPlayerPersonality,
  dealerButtonIndex,
  smallBlindIndex,
  bigBlindIndex,
  pot = 0,
  chatDraft,
}: RoomHandsBoardProps) {
  // Helper function to determine blind position for a player
  const getBlindPosition = (
    playerId: string,
  ): "dealer" | "small" | "big" | undefined => {
    const playerIndex = hands.findIndex((h) => h.playerId === playerId);
    if (playerIndex === -1) return undefined;

    if (playerIndex === dealerButtonIndex) return "dealer";
    if (playerIndex === smallBlindIndex) return "small";
    if (playerIndex === bigBlindIndex) return "big";
    return undefined;
  };
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
    isMyTurn,
    canCheck,
    canCall,
    canRaise,
    canFold,
    canCallClock,
    currentTurnPlayerName,
    onCheck,
    onCall,
    onRaise,
    onFold,
    onCallClock,
    onRaiseAmountChange,
    onLeaveRoom,
    callLabel,
    callAmount,
    raiseLabel,
    raiseAmount,
    raiseOptions,
    isCallingClock,
    turnClockTimeRemaining,
    turnClockCallerName,
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
  const activeChatDraft = useMemo(() => {
    const trimmedDraft = chatDraft?.trim();
    return trimmedDraft ? trimmedDraft.slice(0, 120) : null;
  }, [chatDraft]);

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
    handleShuffleTiles,
    handleSubmitWord,
    handleToggleDisabled,
    hasUnresolvedChoices,
    isValidating,
    mySubmission,
    otherSubmissions,
    shuffleTick,
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
  const canRevealSubmittedWords = false;
  const showShuffleControl =
    !isPhase0 &&
    !isPhase1 &&
    !mySubmission &&
    !bottomHand?.hasFolded &&
    builderTiles.length > 1;
  const showInlineBottomPanelShuffle =
    !showBettingControls && gameStage === "showdown" && showShuffleControl;
  const showTableRaiseSlider =
    canRaise && !!raiseAmount && (raiseOptions?.length ?? 0) > 1;
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

        <main className="flex min-h-0 flex-1 flex-col pt-3 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
              <div className="relative z-10 flex items-center justify-center px-2 xs:px-4">
                {/* Wrapper with actual size including avatar overflow - responsive to match table size */}
                <div className="relative flex items-center justify-center min-h-[330px] min-w-[248px] xs:min-h-[420px] xs:min-w-[292px] sm:min-h-[520px] sm:min-w-[360px] lg:min-h-[620px] lg:min-w-[460px] xl:min-h-[700px] xl:min-w-[520px]">
                  <RoomTable
                    isPhase1={isPhase1}
                    pot={pot}
                    communityTiles={communityTiles}
                    opponentBets={opponentBets}
                    bottomBet={bottomHand.betThisRound ?? 0}
                    betPositionClass={BET_POSITION_CLASS}
                  />
                  {showTableRaiseSlider ? (
                    <div className="absolute left-full top-1/2 z-30 ml-5 -translate-y-1/2 xs:ml-6 sm:ml-10 lg:ml-14">
                      <RaiseAmountSlider
                        value={raiseAmount}
                        options={raiseOptions}
                        callAmount={callAmount}
                        disabled={isBetting || !isMyTurn}
                        onChange={(amount) => onRaiseAmountChange?.(amount)}
                        orientation="vertical"
                      />
                    </div>
                  ) : null}
                  <RoomOpponentLayer
                    opponents={opponents}
                    currentTurnPlayerId={currentTurnPlayerId}
                    getPlayerName={getPlayerName}
                    getPlayerAvatar={getPlayerAvatar}
                    getPlayerPersonality={getPlayerPersonality}
                    getBlindPosition={getBlindPosition}
                    otherSubmissions={otherSubmissions}
                    wordSubmissions={wordSubmissions}
                    gameStage={gameStage}
                    currentPlayerHasSubmitted={!!mySubmission}
                    canRevealSubmittedWords={canRevealSubmittedWords}
                  />
                  <div className="absolute bottom-[12%] left-1/2 z-40 -translate-x-1/2 translate-y-1/4 xs:bottom-[15%] sm:bottom-[12%]">
                    <PhasePlayerBadge
                      name={myName}
                      avatarUrl={getPlayerAvatar(bottomHand.playerId)}
                      chips={bottomHand.chips ?? 0}
                      actionLabel={formatPlayerActionLabel(
                        bottomHand.lastAction,
                      )}
                      chatBubbleMessage={activeChatDraft}
                      isActiveTurn={currentTurnPlayerId === bottomHand.playerId}
                      isCurrentPlayer
                      blindPosition={getBlindPosition(bottomHand.playerId)}
                      avatarSizeClass="h-[52px] w-[52px] xs:h-[60px] xs:w-[60px] sm:h-24 sm:w-24"
                      initialsClass="text-[11px] xs:text-[12px] sm:text-[18px]"
                      infoCardClassName="min-w-[84px] px-2 py-1 xs:min-w-[92px] xs:px-2 xs:py-1 sm:min-w-[132px] sm:px-4 sm:py-2"
                      betClassName="left-auto right-0 translate-x-1/4"
                      mobileInfoPlacement="top"
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

          <div className="flex flex-col items-center gap-1 px-4 sm:gap-4 [@media(max-height:460px)]:pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            {isPhase0 ? (
              <div className="pointer-events-none invisible">
                <RoomBottomPanel
                  isPhase1={true}
                  mySubmission={null}
                  canRevealSubmittedWords={false}
                  showReveal={false}
                  builderTiles={[]}
                  choiceSelections={{}}
                  handleChoiceSelect={() => {}}
                  isValidating={false}
                  hasUnresolvedChoices={false}
                  validationError={null}
                  wordPreview=""
                  shuffleTick={0}
                  gameStage="preflop"
                  handleSubmitWord={() => {}}
                  renderBuilderTile={renderEmptyBuilderTile}
                />
              </div>
            ) : (
              <RoomBottomPanel
                isPhase1={isPhase1}
                mySubmission={mySubmission}
                canRevealSubmittedWords={canRevealSubmittedWords}
                showReveal={showReveal}
                builderTiles={builderTiles}
                choiceSelections={choiceSelections}
                handleChoiceSelect={handleChoiceSelect}
                isValidating={isValidating}
                hasUnresolvedChoices={hasUnresolvedChoices}
                validationError={validationError}
                wordPreview={wordPreview}
                shuffleTick={shuffleTick}
                gameStage={gameStage}
                handleSubmitWord={handleSubmitWord}
                onShuffleTiles={
                  showInlineBottomPanelShuffle ? handleShuffleTiles : undefined
                }
                disableShuffle={
                  showInlineBottomPanelShuffle ? isValidating : undefined
                }
                renderBuilderTile={(tile) => (
                  <SortableBuilderTile
                    tile={tile}
                    onToggleDisabled={handleToggleDisabled}
                    selectedLetter={choiceSelections[tile.id]}
                  />
                )}
                hasFolded={bottomHand?.hasFolded}
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

            {(showBettingControls ||
              (showShuffleControl && !showInlineBottomPanelShuffle)) && (
              <RoomActionControls
                betting={
                  showBettingControls
                    ? {
                        isBetting,
                        isMyTurn,
                        canCheck,
                        canCall,
                        canRaise,
                        canFold,
                        canCallClock,
                        currentTurnPlayerName,
                        onCheck,
                        onCall,
                        onRaise,
                        onFold,
                        onCallClock,
                        onRaiseAmountChange,
                        callLabel,
                        callAmount,
                        raiseLabel,
                        raiseAmount,
                        raiseOptions,
                        isCallingClock,
                        turnClockTimeRemaining,
                        turnClockCallerName,
                      }
                    : undefined
                }
                utility={
                  showShuffleControl && !showInlineBottomPanelShuffle
                    ? {
                        onShuffleTiles: handleShuffleTiles,
                        disableShuffle: isValidating,
                      }
                    : undefined
                }
              />
            )}
          </div>
        </main>

        <DragOverlay>
          {activeTile ? (
            <div style={{ cursor: "grabbing" }}>
              <div className="flex flex-col items-center gap-1">
                {activeTile.multiplier ? (
                  <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
                    {activeTile.multiplier === "2L" ? "2x" : "3x"}
                  </div>
                ) : (
                  <div className="text-[9px] leading-none sm:text-xs opacity-0">
                    -
                  </div>
                )}
                <WordTile
                  letter={activeTile.letter}
                  letters={activeTile.letters}
                  baseValue={activeTile.baseValue}
                  baseValues={activeTile.baseValues}
                  multiplier={activeTile.multiplier}
                  isChoice={activeTile.isChoice}
                  selectedLetter={choiceSelections[activeTile.id]}
                  showValue={true}
                  size="md"
                  className={MOBILE_COMPACT_TILE_CLASS}
                  variant={
                    activeTile.source === "community" ? "community" : "default"
                  }
                />
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
