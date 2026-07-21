import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type {
  RoomTableContextValue,
  RoomBettingContextValue,
} from "../context/RoomGameContext";
import type { RoomPageContextValue } from "../context/RoomPageContext";
import { useRoomQueries } from "./useRoomQueries";
import { useRoomDisplay } from "./useRoomDisplay";
import { useRoomTimers } from "./useRoomTimers";
import { useRoomReady } from "./useRoomReady";
import { useRoomLeave } from "./useRoomLeave";
import { useAutoRejoin } from "./useAutoRejoin";
import { useAuthGate } from "./useAuthGate";
import { useAutoStartGame } from "./useAutoStartGame";
import { useRoomNavigation } from "./useRoomNavigation";
import { useAutoForfeit } from "./useAutoForfeit";
import { useRoomDevTools } from "./useRoomDevTools";
import { useBettingActions } from "./useBettingActions";
import { useMediaQuery } from "./useMediaQuery";
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
import { RAISE_LADDER } from "../../../../convex/gameState";
import { useRoomPresence } from "./useRoomPresence";

const ANTE_AMOUNT = 0;

export function useRoomDetailsController(
  code: string,
  options: { allowGuestTutorial?: boolean; paused?: boolean } = {},
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
  const clientIsMobile = !useMediaQuery("(min-width: 640px)", undefined, {
    getInitialValueInEffect: false,
  });

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
    options.paused,
  );

  // --- Betting actions ---
  const bettingActions = useBettingActions(
    game?._id,
    playerId,
    maxRaisesPerRound,
    raisesThisRound,
    selectedRaiseAmount,
    clientIsMobile,
    game ? { currentBet: game.currentBet, currentPlayerIndex: game.currentPlayerIndex, stage: game.stage } : null,
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

  // --- Auth gate (redirect unauthenticated users) ---
  useAuthGate({
    isAuthPending,
    hasSessionUser: Boolean(session?.user),
    allowGuestTutorial: options.allowGuestTutorial === true,
    roomData: roomData as {
      room: { tutorialId?: string | null };
    } | null | undefined,
  });

  // --- Auto-rejoin (rejoin viewer seat when available) ---
  useAutoRejoin({
    code,
    isAuthPending,
    hasSessionUser: Boolean(session?.user),
    isEmailVerified: session?.user?.emailVerified === true,
    userEmail: session?.user?.email || "",
    myPlayer,
    roomData: roomData as {
      room: { _id: string; status: string; tutorialId?: string | null };
    } | null | undefined,
    setGameMessage: bettingActions.setGameMessage,
    resetLeftFlag: leave.resetLeftFlag,
  });

  // --- Auto-start game (create game when room is full) ---
  useAutoStartGame(
    roomData?.room._id,
    game,
  );

  // --- Room lifecycle navigation (closure, results, lobby expiry) ---
  useRoomNavigation({
    code,
    roomData: roomData as {
      room: { _id: string; status: string };
    } | null | undefined,
    game: game as {
      _id: string;
      status: string;
    } | null | undefined,
    didLobbyExpire: timers.didLobbyExpire,
    leaveCurrentRoom: leave.leaveCurrentRoom,
  });

  // --- Showdown auto-forfeit ---
  useAutoForfeit({
    didShowdownExpire: timers.didShowdownExpire,
    gameId: game?._id,
    playerId,
    isTutorialRoom,
  });

  // --- Dev tools ---
  const devTools = useRoomDevTools(
    code,
    session?.user?.name,
    session?.user?.email,
  );

  // --- Context value construction ---
  const isShowdownSubmissionOpen = useMemo(
    () =>
      !(
        game?.stage === "showdown" &&
        game.status === "active" &&
        game.showdownStartedAt === undefined
      ),
    [game?.stage, game?.status, game?.showdownStartedAt],
  );

  const showBettingControls =
    game?.status === "active" &&
    game.stage !== "final" &&
    game.stage !== "showdown" &&
    !isTutorialBettingPaused;

  // --- Out-of-chips re-buy (table-stakes epic M1.7) ---
  const rebuyMutation = useMutation(api.rooms.rebuy);
  const walletData = useQuery(api.wallet.getMyBalance);
  const [isRebuying, setIsRebuying] = useState(false);

  const isBalanceRoom = roomData?.room.economyMode === "balance";
  const roomBuyIn = roomData?.room.buyIn ?? null;
  const myTableStack =
    roomData?.members.find((member) => String(member._id) === playerId)
      ?.tableStack ?? null;
  // Busted only counts between hands — never mid-active-hand.
  const isOutOfChips = Boolean(
    isBalanceRoom && game?.status !== "active" && myTableStack === 0,
  );
  const canAffordRebuy =
    roomBuyIn != null && (walletData?.balance ?? 0) >= roomBuyIn;

  const handleRebuy = useCallback(async () => {
    setIsRebuying(true);
    try {
      await rebuyMutation({ code });
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Could not re-buy. Try again.";
      toast.error(message);
    } finally {
      setIsRebuying(false);
    }
  }, [rebuyMutation, code]);

  const roomTableContextValue: RoomTableContextValue = useMemo(
    () => ({
      anteAmount: ANTE_AMOUNT,
      raisesThisRound,
      maxRaisesPerRound,
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
      turnClockTimeRemaining: timers.turnClockTimeRemaining,
      turnClockTargetName: timers.turnClockTargetName,
      isTurnClockTarget: timers.isTurnClockTarget,
      showdownTimeRemaining: timers.showdownTimeRemaining,
      turnTimeRemaining: timers.turnClockTimeRemaining,
      isShowdownSubmissionOpen,
      isTutorialBettingPaused,
      isTutorialRoom,
      isOutOfChips,
      buyIn: roomBuyIn,
      canAffordRebuy,
      isRebuying,
      onRebuy: isOutOfChips ? handleRebuy : undefined,
    }),
    [
      raisesThisRound,
      maxRaisesPerRound,
      game?.status,
      isOutOfChips,
      roomBuyIn,
      canAffordRebuy,
      isRebuying,
      handleRebuy,
      ready.handleToggleReady,
      ready.isTogglingReady,
      myPlayer?.readyStatus,
      timers.lobbyInactivityTimeRemainingMs,
      timers.turnClockTimeRemaining,
      timers.turnClockTargetName,
      timers.isTurnClockTarget,
      timers.showdownTimeRemaining,
      roomData?.members,
      isShowdownSubmissionOpen,
      isTutorialBettingPaused,
      isTutorialRoom,
    ],
  );

  const roomBettingContextValue: RoomBettingContextValue = useMemo(
    () => ({
      actionMessage: bettingActions.gameMessage,
      showBettingControls,
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
          ? (game?.currentBet ?? 0) === 0
            ? `Bet ${selectedRaiseAmount}`
            : `Raise to ${selectedRaiseAmount}`
          : "Maxed",
      raiseAmount: selectedRaiseAmount,
      raiseOptions,
      isOpeningBet: (game?.currentBet ?? 0) === 0,
    }),
    [
      bettingActions.gameMessage,
      bettingActions.handleCheck,
      bettingActions.handleCall,
      bettingActions.handleRaise,
      bettingActions.handleFold,
      bettingActions.isBetting,
      showBettingControls,
      myTurn,
      checkable,
      callable,
      raisable,
      currentTurnPlayerId,
      display,
      callAmt,
      selectedRaiseAmount,
      raiseOptions,
      setSelectedRaiseAmount,
      leave.handleBack,
      game?.currentBet,
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
    roomTableContextValue,
    roomBettingContextValue,
    roomPageContextValue,
    isDevRejoining: devTools.isDevRejoining,
    isDevFillingBots: devTools.isDevFillingBots,
    onDevRejoinRoom: devTools.handleDevRejoinRoom,
    onDevFillRoomWithBots: devTools.handleDevFillRoomWithBots,
  };
}
