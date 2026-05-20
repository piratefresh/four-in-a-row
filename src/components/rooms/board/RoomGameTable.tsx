import { useEffect, useMemo, type FormEvent } from "react";
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
import { Seat } from "../phases/Seat";
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
import type { BuilderTile, RoomGameTableProps } from "./RoomGameTable.types";
import { ROOM_BOTTOM_BADGE_POSITION_CLASS } from "./roomBoardLayout";
import { useRoomGameContext } from "../context/RoomGameContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useRoomWordBuilder } from "../hooks/useRoomWordBuilder";
import { useTutorialAdapterContext } from "../tutorial/TutorialAdapter";
import type { WordTileSize } from "../table/word-tile-v2";
import {
  IN_GAME_HELPER_STEPS,
} from "@/components/onboarding/wordPokerTours";
import { buildRoomHandLog } from "./roomHandLog";
import type { RoomHandLogEntry } from "./roomHandLog";
import { getVisibleOpponents } from "./roomOpponentVisibility";

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
    top: "left-[58%] top-[28%] -translate-x-1/2 -translate-y-1/2 sm:left-[58%] sm:top-[26%]",
    left: "left-[28%] top-[48%] -translate-x-1/2 -translate-y-1/2 sm:left-[27%]",
    right:
      "left-[72%] top-[48%] -translate-x-1/2 -translate-y-1/2 sm:left-[73%]",
    bottom:
      "left-[57%] top-[72%] -translate-x-1/2 -translate-y-1/2 sm:left-[57%] sm:top-[71%]",
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

function formatStageLabel(stage: RoomGameTableProps["gameStage"]) {
  switch (stage) {
    case "preflop":
      return "Hole letters";
    case "flop":
      return "Flop";
    case "turn":
      return "Turn";
    case "river":
      return "River";
    case "final":
      return "Final street";
    case "showdown":
      return "Showdown";
    default:
      return "Hand";
  }
}

function getNextRevealLabel(stage: RoomGameTableProps["gameStage"]) {
  switch (stage) {
    case "preflop":
      return "Flop";
    case "flop":
      return "Turn";
    case "turn":
      return "River";
    case "river":
      return "Final";
    case "final":
      return "Showdown";
    case "showdown":
      return "Results";
    default:
      return "Next street";
  }
}

function getLogDotClass(tone: RoomHandLogEntry["tone"]) {
  if (tone === "raise") return "bg-[#e6b450]";
  if (tone === "fold") return "bg-[#ff5d4e]";
  if (tone === "pot" || tone === "showdown") return "bg-[#d4af37]";
  if (tone === "turn") return "bg-[#7ec4cf]";
  return "bg-[#9ec27a]";
}

function formatChatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getVisibleTileCount(stage: RoomGameTableProps["gameStage"]) {
  if (stage === "preflop") return 0;
  if (stage === "flop") return 3;
  if (stage === "turn") return 4;
  return 5;
}

function getMoreTilesLabel(
  stage: RoomGameTableProps["gameStage"],
  revealedCommunityCount: number,
) {
  if (stage === "showdown") return "Showdown open";
  const remaining = Math.max(0, 5 - revealedCommunityCount);
  if (remaining === 0) return "All shared letters dealt";
  if (remaining === 1) return "1 more tile to come";
  return `${remaining} more tiles to come`;
}

export function RoomGameTable({
  gameId,
  activePlayerId,
  helperTipsEnabled,
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
  chatMessages = [],
  onChatDraftChange,
  onSendChatMessage,
  tutorialReplayControl,
}: RoomGameTableProps) {
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
    turnClockTimeRemaining,
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
  const isDesktopTable = useMediaQuery("(min-width: 1280px)");
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
  const showTurnUrgencyBubble =
    showBettingControls &&
    isMyTurn &&
    turnClockTimeRemaining !== null &&
    turnClockTimeRemaining > 0 &&
    turnClockTimeRemaining <= 10_000;

  const opponents = useMemo(
    () =>
      bottomHand
        ? orderedHands.filter((hand) => hand._id !== bottomHand._id)
        : [],
    [bottomHand, orderedHands],
  );
  const visibleOpponents = useMemo(
    () => getVisibleOpponents(opponents),
    [opponents],
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

  const boardPhase: "phase0" | RoomGameTableProps["gameStage"] =
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
      visibleOpponents
        .map((hand, opponentIndex) => ({
          id: hand._id,
          amount: hand.betThisRound ?? 0,
          position: getOpponentPosition(opponentIndex, visibleOpponents.length),
          ownerName: getPlayerName(hand.playerId),
        }))
        .filter((bet) => bet.amount > 0),
    [getPlayerName, visibleOpponents],
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
  const revealedCommunityCount = communityTiles.filter(
    (tile) => tile.revealed !== false,
  ).length;
  const visibleCommunityCount = isPhase0 ? 0 : getVisibleTileCount(gameStage);
  const communityProgressLabel = `${revealedCommunityCount} of 5 dealt`;
  const nextRevealLabel = getNextRevealLabel(gameStage);
  const currentRackScore =
    wordScorePreview?.total ??
    (mySubmission && typeof mySubmission.score === "number"
      ? mySubmission.score
      : null);
  const handLogEntries = useMemo(
    () =>
      buildRoomHandLog({
        gameStage,
        communityTiles,
        hands: orderedHands,
        currentTurnPlayerId,
        dealerButtonIndex,
        smallBlindIndex,
        bigBlindIndex,
        pot,
        builtWord,
        currentRackScore,
        getPlayerName,
      }),
    [
      bigBlindIndex,
      builtWord,
      communityTiles,
      currentRackScore,
      currentTurnPlayerId,
      dealerButtonIndex,
      gameStage,
      getPlayerName,
      orderedHands,
      pot,
      smallBlindIndex,
    ],
  );
  const recentChatMessages = chatMessages.slice(-3);
  const showRailChat = Boolean(onChatDraftChange && onSendChatMessage);
  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedDraft = chatDraft?.trim();
    if (!trimmedDraft) return;
    void onSendChatMessage?.(trimmedDraft);
  };
  const bestWordLabel = mySubmission?.word
    ? mySubmission.word.toUpperCase()
    : builtWord || "No word yet";
  const rackScoreLabel =
    currentRackScore === null ? "--" : `${currentRackScore}pts`;
  const tableStage = (
    <div
      id="tutorial-room-table"
      className={`relative flex items-center justify-center ${
        isDesktopTable ? "" : "w-[min(320px,calc(100vw-42px))]"
      }`}
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
        opponents={visibleOpponents}
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
        <Seat
          name={myName}
          avatarUrl={getPlayerAvatar(bottomHand.playerId)}
          chips={bottomHand.chips ?? 0}
          bet={0}
          actionLabel={formatPlayerActionLabel(bottomHand.lastAction)}
          chatBubbleMessage={activeChatDraft}
          urgentBubbleMessage={
            showTurnUrgencyBubble
              ? "Time is running out. Make a move."
              : null
          }
          isActiveTurn={currentTurnPlayerId === bottomHand.playerId}
          isCurrentPlayer
          blindPosition={getBlindPosition(bottomHand.playerId)}
          avatarSizeClass={
            isDesktopTable ? "h-14 w-14" : "h-10 w-10 xs:h-11 xs:w-11"
          }
          initialsClass={isDesktopTable ? "text-[12px]" : "text-[9px]"}
          betClassName="left-auto right-0 translate-x-1/4"
          mobileInfoPlacement="top"
          infoLayout="compact"
        />
      </div>
    </div>
  );

  const hiddenPhase0Builder = isPhase0 ? (
    <div className="hidden">
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
  ) : null;

  const rackBuilder = !isPhase0 ? (
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
        showInlineBottomPanelShuffle ? handleShuffleTilesClick : undefined
      }
      disableShuffle={showInlineBottomPanelShuffle ? isValidating : undefined}
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
  ) : null;

  const raiseSlider = showTableRaiseSlider ? (
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
  ) : null;

  const readyControls = showReadyButton ? (
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
  ) : null;

  const actionControls =
    !isPhase0 &&
    ((showBettingControls && !hasBottomPlayerFolded) ||
      (showShuffleControl && !showInlineBottomPanelShuffle)) ? (
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
      <div className="relative grid min-h-0 flex-1 grid-cols-1 overflow-hidden bg-[#06130f] font-serif text-[#f1eee7] xl:grid-cols-[minmax(0,1fr)_360px] [@media(max-height:460px)]:min-h-0">
        <div className="absolute right-3 top-3 z-40 sm:right-4 sm:top-4">
          <RoomHelpMenu />
        </div>
        {isDesktopTable ? (
          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_20%,rgba(20,82,63,0.45),rgba(5,20,16,0.96)_62%)]">
            {tutorialReplayControl ? (
              <div className="px-4 pb-2 pt-3">{tutorialReplayControl}</div>
            ) : null}
            <div className="border-b border-dashed border-[#d4af37]/20 bg-black/20 px-9 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
              <div className="mb-2 flex items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d4af37]">
                    Community letters / {communityProgressLabel}
                  </div>
                  <div className="mt-0.5 font-serif text-[18px] italic text-[#f4e4c1]">
                    The shared rack
                  </div>
                </div>
                <RoomCommunityStrip
                  tiles={communityTiles}
                  hidden={isPhase0 || isPhase1}
                  tileSize={boardTileSize}
                  helperTip={communityHelperTip}
                  showLabel={false}
                />
                <div className="text-right">
                  <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#e8dcc0]/50">
                    Next reveal
                  </div>
                  <div className="mt-0.5 font-mono text-[13px] uppercase tracking-[0.08em] text-[#f4e4c1]">
                    {nextRevealLabel}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-8 py-8">
              {isPhase0 ? (
                <BlankRoomPhase
                  opponents={visibleOpponents.map((hand, opponentIndex) => ({
                    id: hand._id,
                    name: getPlayerName(hand.playerId),
                    avatarUrl: getPlayerAvatar(hand.playerId),
                    chips: hand.chips ?? 0,
                    bet: hand.betThisRound ?? 0,
                    position: getPhase1OpponentPosition(
                      opponentIndex,
                      visibleOpponents.length,
                    ),
                  }))}
                  bottomPlayer={{
                    name: myName,
                    avatarUrl: getPlayerAvatar(bottomHand.playerId),
                    chips: bottomHand.chips ?? 0,
                    bet: bottomHand.betThisRound ?? 0,
                  }}
                />
              ) : (
                tableStage
              )}
            </div>

            <div className="grid flex-none grid-cols-[minmax(260px,auto)_minmax(180px,1fr)_minmax(320px,auto)] items-center gap-7 border-t border-[#d4af37]/20 bg-[linear-gradient(180deg,rgba(0,0,0,0.22),rgba(0,0,0,0.48))] px-7 py-5">
              <div className="min-w-0">
                <div className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-[#d4af37]">
                  Your rack / 2 hole + {visibleCommunityCount} shared
                </div>
                {hiddenPhase0Builder}
                {rackBuilder}
              </div>
              <div className="min-w-0 text-center">
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#e8dcc0]/50">
                  {gameStage === "showdown" ? "Final word" : "Best word so far"}
                </div>
                <div className="mt-1 truncate font-serif text-[26px] font-semibold italic text-[#f4e4c1]">
                  {bestWordLabel}
                  <span className="ml-2 font-mono text-[15px] not-italic text-[#d4af37]">
                    {rackScoreLabel}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#e8dcc0]/40">
                  {getMoreTilesLabel(gameStage, revealedCommunityCount)}
                </div>
              </div>
              <div className="flex min-w-0 flex-col items-center gap-3">
                {raiseSlider}
                {readyControls}
                {actionControls}
              </div>
            </div>
          </main>
        ) : (
          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,#0a1d17_0%,#051410_100%)] pb-[max(1rem,env(safe-area-inset-bottom))]">
            {tutorialReplayControl ? (
              <div className="px-4 pb-2 pt-3">{tutorialReplayControl}</div>
            ) : null}
            <div className="border-b border-[#d4af37]/20 px-3 py-2 text-center">
              <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
                {formatStageLabel(gameStage)} / {isMyTurn ? "Your turn" : "Watching"}
              </div>
              <div className="mt-1 font-mono text-[18px] font-semibold tracking-[0.08em] text-[#9ec27a]">
                {turnClockTimeRemaining == null
                  ? "--:--"
                  : `00:${Math.max(0, Math.ceil(turnClockTimeRemaining / 1000))
                      .toString()
                      .padStart(2, "0")}`}
              </div>
            </div>
            <div className="border-b border-dashed border-[#d4af37]/15 px-3 py-3">
              <div className="mb-2 text-center font-mono text-[8px] uppercase tracking-[0.18em] text-[#d4af37]">
                Community / {revealedCommunityCount}/5
              </div>
              <RoomCommunityStrip
                tiles={communityTiles}
                hidden={isPhase0 || isPhase1}
                tileSize="sm"
                helperTip={communityHelperTip}
                showLabel={false}
              />
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 py-4">
              {isPhase0 ? (
                <BlankRoomPhase
                  opponents={visibleOpponents.map((hand, opponentIndex) => ({
                    id: hand._id,
                    name: getPlayerName(hand.playerId),
                    avatarUrl: getPlayerAvatar(hand.playerId),
                    chips: hand.chips ?? 0,
                    bet: hand.betThisRound ?? 0,
                    position: getPhase1OpponentPosition(
                      opponentIndex,
                      visibleOpponents.length,
                    ),
                  }))}
                  bottomPlayer={{
                    name: myName,
                    avatarUrl: getPlayerAvatar(bottomHand.playerId),
                    chips: bottomHand.chips ?? 0,
                    bet: bottomHand.betThisRound ?? 0,
                  }}
                />
              ) : (
                tableStage
              )}
            </div>
            <div className="px-3 pb-1 text-center">
              <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#e8dcc0]/50">
                {gameStage === "showdown" ? "Final word" : "Best word so far"}
              </div>
              <div className="mt-1 truncate font-serif text-[22px] font-semibold italic text-[#f4e4c1]">
                {bestWordLabel}
                <span className="ml-2 font-mono text-[13px] not-italic text-[#d4af37]">
                  {rackScoreLabel}
                </span>
              </div>
            </div>
            <div className="flex flex-none flex-col items-center gap-2 border-t border-[#d4af37]/15 bg-black/25 px-3 py-3">
              {hiddenPhase0Builder}
              {rackBuilder}
              {raiseSlider}
              {readyControls}
              {actionControls}
            </div>
          </main>
        )}

        {isDesktopTable ? (
        <aside className="hidden min-h-0 flex-col border-l border-[#d4af37]/15 bg-black/25 xl:flex">
          <div className="border-b border-[#d4af37]/15 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#ff5d4e] shadow-[0_0_14px_rgba(255,93,78,0.6)]" />
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8dcc0]/60">
                Table log / Live
              </div>
            </div>
            <div className="mt-1 font-serif text-[19px] font-semibold italic text-[#f4e4c1]">
              This hand
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d4af37]/75">
              Room {roomCode ?? "table"}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
            <div className="py-1">
              {handLogEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-baseline gap-3 border-b border-[#d4af37]/[0.06] py-2.5"
                >
                  <span
                    className={`mt-1 h-1.5 w-1.5 flex-none rounded-full ${getLogDotClass(entry.tone)}`}
                  />
                  <span className="w-9 flex-none font-mono text-[10px] text-[#e8dcc0]/35">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium leading-snug text-[#f4e4c1]">
                      {entry.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#d4af37]/15 px-5 py-4">
            <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[#e8dcc0]/45">
              Chat
            </div>
            {recentChatMessages.length === 0 ? (
              <div className="mb-3 text-[12px] text-[#e8dcc0]/45">
                No messages yet.
              </div>
            ) : (
              <div className="mb-3 space-y-3">
                {recentChatMessages.map((message) => (
                  <div key={message.id} className="text-[12px]">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate font-semibold text-[#d4af37]">
                        {message.senderName}
                      </span>
                      <span className="font-mono text-[9px] text-[#e8dcc0]/40">
                        {formatChatTime(message.timestamp)}
                      </span>
                    </div>
                    <div className="mt-0.5 break-words text-[#e8dcc0]">
                      {message.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showRailChat ? (
              <form
                onSubmit={handleChatSubmit}
                className="flex items-center gap-2 rounded-md border border-[#d4af37]/15 bg-black/30 px-3 py-2"
              >
                <input
                  value={chatDraft ?? ""}
                  onChange={(event) => onChatDraftChange?.(event.target.value)}
                  placeholder="Type a message..."
                  className="min-w-0 flex-1 bg-transparent text-[12px] text-[#e8dcc0] placeholder:text-[#e8dcc0]/35 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-md border border-[#806316] bg-[linear-gradient(180deg,#f4d35e_0%,#d4af37_60%,#a8801f_100%)] font-mono text-[11px] font-bold text-[#1a1208]"
                  aria-label="Send chat message"
                >
                  &gt;
                </button>
              </form>
            ) : null}
          </div>
        </aside>
        ) : null}

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
