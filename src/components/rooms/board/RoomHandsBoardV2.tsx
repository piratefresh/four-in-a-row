import { useMemo } from "react";
import { useNextStep } from "nextstepjs";
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
import { RoomCommunityStrip } from "./RoomCommunityStrip";
import { PlayerHand } from "./PlayerHand";
import {
  RoomOpponentLayer,
  getOpponentPosition,
  getPhase1OpponentPosition,
} from "./RoomOpponentLayer";
import { RoomTable } from "./RoomTable";
import type { BuilderTile, RoomHandsBoardProps } from "./RoomHandsBoard.types";
import { ROOM_BOTTOM_BADGE_POSITION_CLASS } from "./roomBoardLayout";
import { useRoomGameContext } from "../context/RoomGameContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useRoomWordBuilder } from "../hooks/useRoomWordBuilder";
import type { WordTileSize } from "../table/WordTile";
import {
  FIRST_BOT_GAME_TOUR,
  FIRST_BOT_GAME_WORD_BUILDER_STEP,
} from "@/components/onboarding/wordPokerTours";

type SortableBuilderTileProps = {
  tile: BuilderTile;
  onToggleDisabled: (id: string) => void;
  selectedLetter?: string;
  tileSize: WordTileSize;
};

function SortableBuilderTile({
  tile,
  onToggleDisabled,
  selectedLetter,
  tileSize,
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
            size={tileSize}
            variant={tile.source === "community" ? "community" : "default"}
          />
        </div>
      </div>
    </div>
  );
}

const BET_POSITION_CLASS: Record<"top" | "left" | "right" | "bottom", string> =
  {
    top: "left-[62%] top-[24%] -translate-x-1/2 -translate-y-1/2 sm:left-[60%] sm:top-[22%]",
    left: "left-[23%] top-[49%] -translate-x-1/2 -translate-y-1/2 sm:left-[25%]",
    right:
      "left-[77%] top-[49%] -translate-x-1/2 -translate-y-1/2 sm:left-[75%]",
    bottom:
      "left-[64%] top-[72%] -translate-x-1/2 -translate-y-1/2 sm:left-[62%] sm:top-[71%]",
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
  tutorialReplayControl,
}: RoomHandsBoardProps) {
  const { currentStep, currentTour, setCurrentStep } = useNextStep();
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
    callLabel,
    callAmount,
    raiseLabel,
    raiseAmount,
    raiseOptions,
    isCallingClock,
    turnClockTimeRemaining,
    turnClockCallerName,
    isShowdownSubmissionOpen,
  } = useRoomGameContext();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const isMediumViewport = useMediaQuery("(min-width: 768px)");
  const isLargeDesktop = useMediaQuery("(min-width: 1441px)");
  const boardTileSize: WordTileSize = isLargeDesktop
    ? "lg"
    : isMediumViewport
      ? "md"
      : "sm";

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
    wordScorePreview,
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
    canRaise &&
    !mySubmission &&
    !!raiseAmount &&
    (raiseOptions?.length ?? 0) > 1;
  const opponentBets = useMemo(
    () =>
      opponents
        .map((hand, opponentIndex) => ({
          id: hand._id,
          amount: hand.betThisRound ?? 0,
          position: getOpponentPosition(opponentIndex, opponents.length),
          ownerName: getPlayerName(hand.playerId),
        }))
        .filter((bet) => bet.amount > 0),
    [getPlayerName, opponents],
  );
  const advanceTutorialFromWordBuilderStep = () => {
    if (
      currentTour === FIRST_BOT_GAME_TOUR &&
      currentStep === FIRST_BOT_GAME_WORD_BUILDER_STEP
    ) {
      setCurrentStep(FIRST_BOT_GAME_WORD_BUILDER_STEP + 1, 50);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={(event) => {
        handleDragEnd(event);
        if (event.over && event.active.id !== event.over.id) {
          advanceTutorialFromWordBuilderStep();
        }
      }}
    >
      <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-black font-serif text-[#f1eee7] [@media(max-height:460px)]:h-[calc(100dvh-4rem)]">
        <main className="flex min-h-0 flex-1 flex-col pt-3 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {tutorialReplayControl ? (
            <div className="px-4 pb-2">{tutorialReplayControl}</div>
          ) : null}
          <RoomCommunityStrip
            tiles={communityTiles}
            hidden={isPhase0 || isPhase1}
            tileSize={boardTileSize}
          />

          <div className="relative flex min-h-0 flex-1 flex-col justify-center">
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
                <div
                  id="tutorial-room-table"
                  className="relative flex items-center justify-center"
                >
                  <RoomTable
                    isPhase1={isPhase1}
                    pot={pot}
                    communityTiles={communityTiles}
                    opponentBets={opponentBets}
                    bottomBet={bottomHand.betThisRound ?? 0}
                    bottomBetOwnerName={myName}
                    betPositionClass={BET_POSITION_CLASS}
                  />
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
                  <div className={ROOM_BOTTOM_BADGE_POSITION_CLASS}>
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
                  wordScorePreview={null}
                  shuffleTick={0}
                  gameStage="preflop"
                  isShowdownSubmissionOpen={true}
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
                wordScorePreview={wordScorePreview}
                shuffleTick={shuffleTick}
                gameStage={gameStage}
                isShowdownSubmissionOpen={isShowdownSubmissionOpen}
                handleSubmitWord={handleSubmitWord}
                onShuffleTiles={
                  showInlineBottomPanelShuffle ? handleShuffleTiles : undefined
                }
                disableShuffle={
                  showInlineBottomPanelShuffle ? isValidating : undefined
                }
                tileSize={boardTileSize}
                renderBuilderTile={(tile) => (
                  <SortableBuilderTile
                    tile={tile}
                    onToggleDisabled={(tileId) => {
                      handleToggleDisabled(tileId);
                      advanceTutorialFromWordBuilderStep();
                    }}
                    selectedLetter={choiceSelections[tile.id]}
                    tileSize={boardTileSize}
                  />
                )}
                hasFolded={bottomHand?.hasFolded}
              />
            )}

            {showTableRaiseSlider ? (
              <div className="w-full max-w-[42rem] px-3 sm:px-4">
                <RaiseAmountSlider
                  value={raiseAmount}
                  options={raiseOptions}
                  callAmount={callAmount}
                  disabled={isBetting || !isMyTurn}
                  onChange={(amount) => onRaiseAmountChange?.(amount)}
                  orientation="horizontal"
                />
              </div>
            ) : null}

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
            <PlayerHand
              tile={activeTile}
              selectedLetter={choiceSelections[activeTile.id]}
              tileSize={boardTileSize}
            />
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
