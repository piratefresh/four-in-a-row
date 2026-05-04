import { useEffect, useMemo, useState } from "react";
import type { RoomGameContextValue } from "../context/RoomGameContext";
import type { RoomPageContextValue } from "../context/RoomPageContext";
import { useRoomQueries } from "./useRoomQueries";
import { useRoomDisplay } from "./useRoomDisplay";
import { useRoomTimers } from "./useRoomTimers";
import { useRoomReady } from "./useRoomReady";
import { useRoomLeave } from "./useRoomLeave";
import { useRoomReactions } from "./useRoomReactions";
import { useRoomDevTools } from "./useRoomDevTools";
import { useBettingActions } from "./useBettingActions";
import {
  isMyTurn,
  canCheck,
  canCall,
  callAmount,
  getAvailableRaiseOptions,
  getRaisesThisRound,
  getMaxRaisesPerRound,
  type BettingInput,
} from "./bettingDerived";
import {
  RAISE_LADDER,
  SHOWDOWN_TIMER_MS,
} from "../../../../convex/gameState";
import { useRoomPresence } from "./useRoomPresence";

const ANTE_AMOUNT = 20;

export function useRoomDetailsController(
  code: string,
  options: { allowGuestTutorial?: boolean } = {},
) {
  // --- Data layer ---
  const queries = useRoomQueries(code, options);
  const {
    session,
    isAuthPending,
    tutorialGuestAuthUserId,
    roomData,
    game,
    playerHands,
    showdownResults,
    myPlayer,
    playerId,
    nameMatchedPlayerId,
  } = queries;

  // --- Display (hand ordering, player lookups) ---
  const display = useRoomDisplay(
    roomData,
    playerHands,
    game,
    playerId,
    nameMatchedPlayerId,
  );

  // --- Betting derivation ---
  const myHand = useMemo(
    () =>
      playerId
        ? playerHands?.find((hand) => hand.playerId === playerId)
        : undefined,
    [playerHands, playerId],
  );

  const turnOrderedPlayerIds = useMemo(
    () => display.turnOrderedHands.map((h) => h.playerId),
    [display.turnOrderedHands],
  );

  const bettingInput: BettingInput = useMemo(
    () => ({
      game: game as BettingInput["game"],
      myHand: myHand as BettingInput["myHand"],
      playerId,
      turnOrderedPlayerIds,
      raiseLadder: RAISE_LADDER,
    }),
    [game, myHand, playerId, turnOrderedPlayerIds],
  );

  const myTurn = isMyTurn(bettingInput);
  const checkable = canCheck(bettingInput);
  const callable = canCall(bettingInput);
  const callAmt = callAmount(game, myHand);
  const raiseOptions = getAvailableRaiseOptions(bettingInput);
  const raisable = raiseOptions.length > 0;
  const raisesThisRound = getRaisesThisRound(game);
  const maxRaisesPerRound = getMaxRaisesPerRound(game);

  // Raise amount state
  const [selectedRaiseAmount, setSelectedRaiseAmount] = useState<number | null>(
    null,
  );
  useEffect(() => {
    if (raiseOptions.length === 0) {
      setSelectedRaiseAmount(null);
      return;
    }
    setSelectedRaiseAmount((current) =>
      current !== null && raiseOptions.includes(current)
        ? current
        : raiseOptions[0],
    );
  }, [raiseOptions]);

  // --- Tutorial flags ---
  const isTutorialRoom = roomData?.room.tutorialId === "first-bot-game";
  const isTutorialBettingPaused =
    isTutorialRoom &&
    game?.status === "active" &&
    game.stage !== "showdown" &&
    game.stage !== "final" &&
    game.turnStartedAt === undefined;

  // --- Current turn ---
  const currentTurnPlayerId = useMemo(
    () =>
      game
        ? (display.turnOrderedHands[game.currentPlayerIndex]?.playerId ?? null)
        : null,
    [game, display.turnOrderedHands],
  );

  // --- Timers ---
  const timers = useRoomTimers(
    game,
    roomData,
    playerId,
    display.getPlayerName,
    isTutorialRoom,
  );

  // --- Betting actions ---
  const bettingActions = useBettingActions(
    game?._id,
    playerId,
    maxRaisesPerRound,
    raisesThisRound,
    selectedRaiseAmount,
  );

  // --- Ready ---
  const ready = useRoomReady(
    code,
    isTutorialRoom,
    Boolean(session?.user),
    tutorialGuestAuthUserId,
  );

  // --- Leave ---
  const leave = useRoomLeave(code);

  // --- Presence ---
  useRoomPresence(code, Boolean(session?.user && roomData?.room && myPlayer));

  // --- Reactions (auto-rejoin, redirects, auto-create game, expiry forfeits) ---
  useRoomReactions({
    code,
    isAuthPending,
    hasSessionUser: Boolean(session?.user),
    allowGuestTutorial: options.allowGuestTutorial === true,
    roomData: roomData as {
      room: { _id: string; status: string; tutorialId?: string | null };
    } | null | undefined,
    game: game as {
      _id: string;
      status: string;
      currentBet?: number;
      currentPlayerIndex?: number;
      stage?: string;
    } | null | undefined,
    myPlayer,
    playerId,
    didShowdownExpire: timers.didShowdownExpire,
    didLobbyExpire: timers.didLobbyExpire,
    isTutorialRoom,
    gameMessage: bettingActions.gameMessage,
    setGameMessage: bettingActions.setGameMessage,
    resetLeftFlag: leave.resetLeftFlag,
    leaveCurrentRoom: leave.leaveCurrentRoom,
  });

  // --- Dev tools ---
  const devTools = useRoomDevTools(
    code,
    session?.user?.name,
    session?.user?.email,
  );

  // --- Context value construction ---
  const showdownTimerMs =
    game?.config?.showdownTimerMs ?? SHOWDOWN_TIMER_MS;

  const roomGameContextValue: RoomGameContextValue = useMemo(
    () => ({
      anteAmount: ANTE_AMOUNT,
      raisesThisRound,
      maxRaisesPerRound,
      actionMessage: bettingActions.gameMessage,
      showBettingControls:
        game?.status === "active" &&
        game.stage !== "final" &&
        game.stage !== "showdown" &&
        !isTutorialBettingPaused,
      showReadyButton: game?.status === "waiting",
      onReady: game?.status === "waiting" ? ready.handleToggleReady : undefined,
      isReady: myPlayer?.readyStatus ?? false,
      isTogglingReady: ready.isTogglingReady,
      lobbyInactivityTimeRemainingMs: timers.lobbyInactivityTimeRemainingMs,
      readyCount:
        roomData?.members.filter((member) => member.readyStatus).length ?? 0,
      totalPlayers: roomData?.members.length ?? 0,
      allPlayersReady:
        (roomData?.members?.length ?? 0) >= 2 &&
        (roomData?.members?.every((member) => member.readyStatus) ?? false),
      isBetting: bettingActions.isBetting,
      isMyTurn: myTurn,
      canCheck: checkable,
      canCall: callable,
      canRaise: raisable,
      canFold: myTurn,
      currentTurnPlayerName:
        currentTurnPlayerId
          ? display.getPlayerName(currentTurnPlayerId)
          : null,
      onCheck: checkable ? bettingActions.handleCheck : undefined,
      onCall: callable ? bettingActions.handleCall : undefined,
      onRaise: myTurn ? bettingActions.handleRaise : undefined,
      onFold: myTurn ? bettingActions.handleFold : undefined,
      onRaiseAmountChange: raisable ? setSelectedRaiseAmount : undefined,
      onLeaveRoom: leave.handleBack,
      callLabel: callAmt > 0 ? `Call ${callAmt}` : "Call",
      callAmount: callAmt,
      raiseLabel:
        selectedRaiseAmount !== null
          ? `Raise to ${selectedRaiseAmount}`
          : "Raise Maxed",
      raiseAmount: selectedRaiseAmount,
      raiseOptions,
      turnClockTimeRemaining: timers.turnClockTimeRemaining,
      turnClockTargetName: timers.turnClockTargetName,
      isTurnClockTarget: timers.isTurnClockTarget,
      showdownTimeRemaining: timers.showdownTimeRemaining,
      turnTimeRemaining: timers.turnClockTimeRemaining,
      isShowdownSubmissionOpen:
        !(
          game?.stage === "showdown" &&
          game.status === "active" &&
          game.showdownStartedAt === undefined
        ),
      isTutorialBettingPaused,
      isTutorialRoom,
    }),
    [
      bettingActions.gameMessage,
      bettingActions.handleCheck,
      bettingActions.handleCall,
      bettingActions.handleRaise,
      bettingActions.handleFold,
      bettingActions.isBetting,
      callAmt,
      callable,
      checkable,
      currentTurnPlayerId,
      display,
      game?.stage,
      game?.status,
      game?.showdownStartedAt,
      isTutorialBettingPaused,
      isTutorialRoom,
      leave.handleBack,
      maxRaisesPerRound,
      myPlayer?.readyStatus,
      myTurn,
      raisable,
      raiseOptions,
      raisesThisRound,
      ready.handleToggleReady,
      ready.isTogglingReady,
      roomData?.members,
      selectedRaiseAmount,
      showdownTimerMs,
      timers.lobbyInactivityTimeRemainingMs,
      timers.turnClockTimeRemaining,
      timers.turnClockTargetName,
      timers.isTurnClockTarget,
      timers.showdownTimeRemaining,
    ],
  );

  const roomPageContextValue: RoomPageContextValue = useMemo(
    () => ({
      state: {
        code,
        roomData,
        game,
        playerHands,
        showdownResults: showdownResults ?? undefined,
        playerId,
        myPlayerReady: myPlayer?.readyStatus ?? false,
        isLeavingRoom: leave.isLeavingRoom,
        leaveMessage: leave.leaveMessage,
        gameMessage: bettingActions.gameMessage,
        isTogglingReady: ready.isTogglingReady,
        isBetting: bettingActions.isBetting,
        isMyTurn: myTurn,
        canCheck: checkable,
        canCall: callable,
        canRaise: raisable,
        callAmount: callAmt,
        turnClockTimeRemaining: timers.turnClockTimeRemaining,
        effectiveNextRaiseLevel: selectedRaiseAmount ?? undefined,
        hasDevTools: import.meta.env.DEV,
        isDevRejoining: devTools.isDevRejoining,
        isDevFillingBots: devTools.isDevFillingBots,
      },
      actions: {
        leaveRoom: leave.handleLeaveRoom,
        back: leave.handleBack,
        toggleReady: ready.handleToggleReady,
        check: bettingActions.handleCheck,
        call: bettingActions.handleCall,
        raise: bettingActions.handleRaise,
        fold: bettingActions.handleFold,
        devRejoinRoom: import.meta.env.DEV
          ? devTools.handleDevRejoinRoom
          : undefined,
        devFillRoomWithBots: import.meta.env.DEV
          ? devTools.handleDevFillRoomWithBots
          : undefined,
      },
      meta: {
        getPlayerName: display.getPlayerName,
        getPlayerAvatar: display.getPlayerAvatar,
        getPlayerPersonality: display.getPlayerPersonality,
      },
    }),
    [
      bettingActions.gameMessage,
      bettingActions.handleCall,
      bettingActions.handleCheck,
      bettingActions.handleFold,
      bettingActions.handleRaise,
      bettingActions.isBetting,
      callAmt,
      callable,
      checkable,
      code,
      devTools.handleDevRejoinRoom,
      devTools.handleDevFillRoomWithBots,
      devTools.isDevRejoining,
      devTools.isDevFillingBots,
      display.getPlayerAvatar,
      display.getPlayerName,
      display.getPlayerPersonality,
      game,
      leave.handleBack,
      leave.handleLeaveRoom,
      leave.isLeavingRoom,
      leave.leaveMessage,
      myPlayer?.readyStatus,
      myTurn,
      playerHands,
      playerId,
      raisable,
      ready.handleToggleReady,
      ready.isTogglingReady,
      roomData,
      selectedRaiseAmount,
      showdownResults,
      timers.turnClockTimeRemaining,
    ],
  );

  return {
    session: session ?? undefined,
    isAuthPending,
    roomData,
    game,
    myPlayer,
    currentTurnPlayerId,
    displayHands: display.displayHands,
    bottomPlayerId: display.bottomPlayerId,
    getPlayerName: display.getPlayerName,
    getPlayerAvatar: display.getPlayerAvatar,
    getPlayerPersonality: display.getPlayerPersonality,
    roomGameContextValue,
    roomPageContextValue,
    isDevRejoining: devTools.isDevRejoining,
    isDevFillingBots: devTools.isDevFillingBots,
    onDevRejoinRoom: devTools.handleDevRejoinRoom,
    onDevFillRoomWithBots: devTools.handleDevFillRoomWithBots,
  };
}
