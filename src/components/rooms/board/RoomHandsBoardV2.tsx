import { useEffect, useMemo } from "react";
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
import { WordTile } from "../table/word-tile-v2";
import { RoomActionControls } from "../controls/RoomActionControls";
import { RaiseAmountSlider } from "../controls/RaiseAmountSlider";
import { BlankRoomPhase } from "../phases/BlankRoomPhase";
import { PhasePlayerBadge } from "../phases/PhasePlayerBadge";
import { RoomBottomPanel } from "./RoomBottomPanel";
import { RoomCommunityStrip } from "./RoomCommunityStrip";
import { RoomHelpMenu } from "./RoomHelpMenu";
import { RoomHelperTipTrigger } from "@/components/onboarding/RoomHelperTipTrigger";
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
import { useTutorialAdapterContext } from "../tutorial/TutorialAdapter";
import type { WordTileSize } from "../table/word-tile-v2";
import {
  IN_GAME_HELPER_STEPS,
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
    top: "left-[59%] top-[34%] -translate-x-1/2 -translate-y-1/2 sm:left-[58%] sm:top-[32%]",
    left: "left-[34%] top-[50%] -translate-x-1/2 -translate-y-1/2 sm:left-[35%]",
    right:
      "left-[66%] top-[50%] -translate-x-1/2 -translate-y-1/2 sm:left-[65%]",
    bottom:
      "left-[58%] top-[64%] -translate-x-1/2 -translate-y-1/2 sm:left-[57%] sm:top-[63%]",
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
  activePlayerId,
  helperTipsEnabled,
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
  const tutorial = useTutorialAdapterContext();
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
    lobbyInactivityTimeRemainingMs,
    readyCount,
    totalPlayers,
    allPlayersReady,
    isBetting,
    isMyTurn,
    canCheck,
    canCall,
    canRaise,
    canFold,
    currentTurnPlayerName,
    onCheck,
    onCall,
    onRaise,
    onFold,
    onRaiseAmountChange,
    callLabel,
    callAmount,
    raiseLabel,
    raiseAmount,
    raiseOptions,
    isShowdownSubmissionOpen,
  } = useRoomGameContext();

  useEffect(() => {
    if (isMyTurn) {
      const audio = new Audio("/your-round-sound.mp3");
      audio.play().catch(() => {});
    }
  }, [isMyTurn]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const isMediumViewport = useMediaQuery("(min-width: 768px)");
  const boardTileSize: WordTileSize = isMediumViewport ? "md" : "sm";

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

  const normalizedWordPreview = wordPreview.replace(/[^a-z]/gi, "").toUpperCase();
  const normalizedActiveBuilderWord = useMemo(
    () =>
      builderTiles
        .filter((tile) => !tile.disabled)
        .map((tile) => {
          if (tile.isChoice) {
            return choiceSelections[tile.id] ?? tile.letters?.[0] ?? "";
          }

          return tile.letter ?? "";
        })
        .join("")
        .replace(/[^a-z]/gi, "")
        .toUpperCase(),
    [builderTiles, choiceSelections],
  );

  const builtWord = normalizedWordPreview || normalizedActiveBuilderWord;

  useEffect(() => {
    if (builtWord.length >= 2) {
      tutorial.onWordBuilt(builtWord);
    }
  }, [builtWord, tutorial]);

  const handleShuffleTilesClick = () => {
    handleShuffleTiles();
    tutorial.onShuffleTiles();
  };

  if (!bottomHand) return null;

  const myName = getPlayerName(bottomHand.playerId);
  const hasBottomPlayerFolded =
    !!activePlayerId &&
    bottomHand.playerId === activePlayerId &&
    !!bottomHand.hasFolded;
  const hasRevealedSpecialTile = useMemo(() => {
    const visibleTiles = [
      ...(bottomHand?.tiles ?? []),
      ...communityTiles.filter((tile) => tile.revealed !== false),
    ];
    return visibleTiles.some(
      (tile) => tile.kind === "choice" || Boolean(tile.multiplier),
    );
  }, [bottomHand?.tiles, communityTiles]);

  const boardPhase: "phase0" | RoomHandsBoardProps["gameStage"] =
    showReadyButton ? "phase0" : gameStage;
  const isPhase0 = boardPhase === "phase0";
  const isPhase1 = boardPhase === "preflop";
  const canRevealSubmittedWords = false;
  const showShuffleControl =
    !isPhase0 &&
    !isPhase1 &&
    !mySubmission &&
    !hasBottomPlayerFolded &&
    builderTiles.length > 1;
  const showInlineBottomPanelShuffle =
    !showBettingControls && gameStage === "showdown" && showShuffleControl;
  const showTableRaiseSlider =
    !hasBottomPlayerFolded &&
    canRaise &&
    !mySubmission &&
    !!raiseAmount &&
    (raiseOptions?.length ?? 0) > 1 &&
    gameStage !== "showdown";
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
  const actionsHelperStep = showReadyButton
    ? IN_GAME_HELPER_STEPS.ready
    : showBettingControls && isMyTurn
      ? IN_GAME_HELPER_STEPS.betting
      : IN_GAME_HELPER_STEPS.waiting;
  const builderHelperStep =
    gameStage === "showdown"
      ? IN_GAME_HELPER_STEPS.showdown
      : hasRevealedSpecialTile
        ? IN_GAME_HELPER_STEPS.tileDetails
        : IN_GAME_HELPER_STEPS.wordBuilder;
  const communityHelperTip = helperTipsEnabled ? (
    <RoomHelperTipTrigger step={IN_GAME_HELPER_STEPS.communityReveal} />
  ) : null;
  const builderHelperTip = helperTipsEnabled ? (
    <RoomHelperTipTrigger step={builderHelperStep} />
  ) : null;
  const actionsHelperTip = helperTipsEnabled ? (
    <RoomHelperTipTrigger step={actionsHelperStep} />
  ) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={(event) => {
        handleDragEnd(event);
      }}
    >
      <div className="relative flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-gradient-felt-table font-serif text-[#f1eee7] [@media(max-height:460px)]:h-[calc(100dvh-4rem)]">
        <div className="absolute right-3 top-3 z-40 sm:right-4 sm:top-4">
          <RoomHelpMenu />
        </div>
        <main className="flex min-h-0 flex-1 flex-col pt-3 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {tutorialReplayControl ? (
            <div className="px-4 pb-2">{tutorialReplayControl}</div>
          ) : null}
          <RoomCommunityStrip
            tiles={communityTiles}
            hidden={isPhase0 || isPhase1}
            tileSize={boardTileSize}
            helperTip={communityHelperTip}
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
                      bet={0}
                      actionLabel={formatPlayerActionLabel(
                        bottomHand.lastAction,
                      )}
                      chatBubbleMessage={activeChatDraft}
                      isActiveTurn={currentTurnPlayerId === bottomHand.playerId}
                      isCurrentPlayer
                      blindPosition={getBlindPosition(bottomHand.playerId)}
                      avatarSizeClass="h-9 w-9 xs:h-10 xs:w-10 sm:h-14 sm:w-14"
                      initialsClass="text-[8px] xs:text-[9px] sm:text-[12px]"
                      betClassName="left-auto right-0 translate-x-1/4"
                      mobileInfoPlacement="top"
                      infoLayout="compact"
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
                  helperTip={builderHelperTip}
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
                  showInlineBottomPanelShuffle
                    ? handleShuffleTilesClick
                    : undefined
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
                    }}
                    selectedLetter={choiceSelections[tile.id]}
                    tileSize={boardTileSize}
                  />
                )}
                hasFolded={hasBottomPlayerFolded}
                helperTip={builderHelperTip}
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
                  lobbyInactivityTimeRemainingMs,
                  onReady,
                }}
                helperTip={actionsHelperTip}
              />
            )}

            {((showBettingControls && !hasBottomPlayerFolded) ||
              (showShuffleControl && !showInlineBottomPanelShuffle)) && (
              <RoomActionControls
                betting={
                  showBettingControls && !hasBottomPlayerFolded
                    ? {
                        isBetting,
                        isMyTurn,
                        canCheck,
                        canCall,
                        canRaise,
                        canFold,
                        currentTurnPlayerName,
                        onCheck,
                        onCall,
                        onRaise,
                        onFold,
                        onRaiseAmountChange,
                        callLabel,
                        callAmount,
                        raiseLabel,
                        raiseAmount,
                        raiseOptions,
                      }
                    : undefined
                }
                utility={
                  showShuffleControl && !showInlineBottomPanelShuffle
                    ? {
                        onShuffleTiles: handleShuffleTilesClick,
                        disableShuffle: isValidating,
                      }
                    : undefined
                }
                helperTip={actionsHelperTip}
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
