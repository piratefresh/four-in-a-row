import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  clearDismissedRoomRejoin,
  dismissRoomRejoin,
  isRoomRejoinDismissed,
} from "@/lib/room-rejoin-dismissal";
import { api } from "../../../../convex/_generated/api";
import { getBotCharacterForAuthUserId } from "../../../../convex/aiStrategy";
import {
  RAISE_LADDER,
  SHOWDOWN_TIMER_MS,
  TURN_CLOCK_GRACE_PERIOD_MS,
} from "../../../../convex/gameState";
import type { RoomGameContextValue } from "../context/RoomGameContext";
import type { RoomPageContextValue } from "../context/RoomPageContext";
import { useRoomPresence } from "./useRoomPresence";

const DEALER_PLAYER_ID = "ai_dealer";
const ANTE_AMOUNT = 20;
const MAX_RAISES_PER_ROUND = 3;
const INITIAL_CHIPS = 1000;

function isTransientActionMessage(message: string | null) {
  return (
    !!message &&
    (message === "Checked." ||
      message === "Clock called." ||
      message === "Folded." ||
      message.startsWith("Matched ") ||
      message.startsWith("Raised to "))
  );
}

export function useRoomDetailsController(code: string) {
  const navigate = useNavigate();
  const { data: session, isPending: isAuthPending } = authClient.useSession();

  const roomData = useQuery(api.rooms.getRoomMembers, { code });
  const game = useQuery(api.games.getGameByRoom, {
    roomId: roomData?.room._id ?? "",
  });
  const playerHands = useQuery(
    api.games.getPlayerHands,
    game ? { gameId: game._id } : "skip",
  );
  const showdownResults = useQuery(
    api.games.getShowdownResults,
    game ? { gameId: game._id } : "skip",
  );
  const wordSubmissions = useQuery(
    api.games.getWordSubmissions,
    game ? { gameId: game._id } : "skip",
  );

  const leaveRoom = useMutation(api.rooms.leaveRoomByCode);
  const rejoinRoomByCode = useMutation(api.rooms.rejoinRoomByCode);
  const createGameForRoom = useMutation(api.games.createGameForRoom);
  const toggleReady = useMutation(api.rooms.toggleReady);
  const debugRejoinRoom = useMutation(api.rooms.debugRejoinRoom);
  const debugFillRoomWithBots = useMutation(api.rooms.debugFillRoomWithBots);
  const check = useMutation((api as any).games.check);
  const call = useMutation((api as any).games.call);
  const raise = useMutation((api as any).games.raise);
  const fold = useMutation((api as any).games.fold);
  const callClock = useMutation((api as any).games.callClock);
  const forfeitShowdown = useMutation(api.games.forfeitShowdown);

  const myPlayer = useMemo(() => {
    if (!roomData?.members) return null;

    if (session?.user) {
      const authMatched =
        roomData.members.find(
          (member) => member.authUserId === session.user.id,
        ) ?? null;
      if (authMatched) return authMatched;
    }

    if (roomData.viewerPlayerId) {
      return (
        roomData.members.find(
          (member) => member._id === roomData.viewerPlayerId,
        ) ?? null
      );
    }

    return null;
  }, [roomData, session?.user]);

  const sessionNameLower = session?.user?.name?.trim().toLowerCase() ?? null;
  const nameMatchedPlayerId = useMemo(() => {
    if (!sessionNameLower || !roomData?.members) return null;
    const byName =
      roomData.members.find(
        (member) => member.name.trim().toLowerCase() === sessionNameLower,
      ) ?? null;
    return byName?._id ? String(byName._id) : null;
  }, [roomData?.members, sessionNameLower]);

  const playerId = myPlayer?._id ? String(myPlayer._id) : null;
  const myPlayerRef = useRef<typeof myPlayer>(null);
  const roomCodeRef = useRef(code);
  const hasLeftRoomRef = useRef(false);
  const autoRejoinAttemptedCodeRef = useRef<string | null>(null);

  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState<string | null>(null);
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isBetting, setIsBetting] = useState(false);
  const [isCallingClock, setIsCallingClock] = useState(false);
  const [isTogglingReady, setIsTogglingReady] = useState(false);
  const [isDevRejoining, setIsDevRejoining] = useState(false);
  const [isDevFillingBots, setIsDevFillingBots] = useState(false);
  const [liveNow, setLiveNow] = useState(() => Date.now());
  const [showdownTimeRemaining, setShowdownTimeRemaining] = useState<
    number | null
  >(null);
  const [selectedRaiseAmount, setSelectedRaiseAmount] = useState<number | null>(
    null,
  );

  useEffect(() => {
    myPlayerRef.current = myPlayer;
  }, [myPlayer]);

  useEffect(() => {
    roomCodeRef.current = code;
  }, [code]);

  useEffect(() => {
    if (myPlayer) {
      autoRejoinAttemptedCodeRef.current = null;
      clearDismissedRoomRejoin(code);
    }
  }, [code, myPlayer]);

  useEffect(() => {
    if (game?.status !== "active") return;

    setLiveNow(Date.now());
    const interval = window.setInterval(() => {
      setLiveNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [game?.status]);

  const leaveCurrentRoom = useCallback(
    async (silent: boolean) => {
      if (hasLeftRoomRef.current) return true;
      if (!myPlayerRef.current) return false;

      hasLeftRoomRef.current = true;
      try {
        await leaveRoom({ code: roomCodeRef.current });
        return true;
      } catch (error) {
        hasLeftRoomRef.current = false;
        if (!silent) {
          const message =
            error instanceof Error ? error.message : "Failed to leave room.";
          setLeaveMessage(message);
        }
        return false;
      }
    },
    [leaveRoom],
  );

  const memberById = useMemo(
    () =>
      new Map(
        (roomData?.members ?? []).map((member) => [String(member._id), member]),
      ),
    [roomData?.members],
  );

  const getPlayerName = useCallback(
    (targetPlayerId: string, handIndex?: number) => {
      const member = memberById.get(targetPlayerId);
      const botCharacter = getBotCharacterForAuthUserId(member?.authUserId);
      return (
        botCharacter?.name ??
        member?.name ??
        (handIndex !== undefined ? `Player ${handIndex + 1}` : targetPlayerId)
      );
    },
    [memberById],
  );

  const getPlayerAvatar = useCallback(
    (targetPlayerId: string) => memberById.get(targetPlayerId)?.image ?? null,
    [memberById],
  );

  const getPlayerPersonality = useCallback(
    (targetPlayerId: string): string | null => {
      const member = memberById.get(targetPlayerId);
      const botCharacter = getBotCharacterForAuthUserId(member?.authUserId);
      return botCharacter?.title ?? null;
    },
    [memberById],
  );

  const nonDealerHands = useMemo(
    () =>
      [...(playerHands ?? [])]
        .filter((hand) => hand.playerId !== DEALER_PLAYER_ID)
        .sort((a, b) => {
          const seatA =
            memberById.get(a.playerId)?.seatIndex ?? Number.MAX_SAFE_INTEGER;
          const seatB =
            memberById.get(b.playerId)?.seatIndex ?? Number.MAX_SAFE_INTEGER;
          return seatA - seatB;
        }),
    [memberById, playerHands],
  );

  const bottomPlayerId =
    playerId ?? nameMatchedPlayerId ?? nonDealerHands[0]?.playerId ?? undefined;

  const rotatedHands = useMemo(() => {
    if (!bottomPlayerId || nonDealerHands.length === 0) return nonDealerHands;
    const bottomIndex = nonDealerHands.findIndex(
      (hand) => hand.playerId === bottomPlayerId,
    );
    if (bottomIndex <= 0) return nonDealerHands;
    return [
      ...nonDealerHands.slice(bottomIndex),
      ...nonDealerHands.slice(0, bottomIndex),
    ];
  }, [bottomPlayerId, nonDealerHands]);

  const turnOrderedHands = useMemo(
    () =>
      [...(playerHands ?? [])].sort((a, b) => {
        if (a.createdAt !== b.createdAt) {
          return a.createdAt - b.createdAt;
        }
        return a.playerId.localeCompare(b.playerId);
      }),
    [playerHands],
  );

  const currentTurnPlayerId = useMemo(
    () =>
      game
        ? (turnOrderedHands[game.currentPlayerIndex]?.playerId ?? null)
        : null,
    [game, turnOrderedHands],
  );
  const currentTurnPlayerName = useMemo(
    () => (currentTurnPlayerId ? getPlayerName(currentTurnPlayerId) : null),
    [currentTurnPlayerId, getPlayerName],
  );
  const currentTurnIsAutomated = useMemo(() => {
    if (!currentTurnPlayerId) return false;
    if (currentTurnPlayerId === DEALER_PLAYER_ID) return true;
    return (
      memberById.get(currentTurnPlayerId)?.authUserId?.startsWith("dev-bot:") ??
      false
    );
  }, [currentTurnPlayerId, memberById]);

  const myHand = useMemo(
    () =>
      playerId
        ? playerHands?.find((hand) => hand.playerId === playerId)
        : undefined,
    [playerHands, playerId],
  );

  const canCheck = useMemo(() => {
    if (
      !game ||
      !myHand ||
      currentTurnPlayerId !== playerId ||
      game.status !== "active"
    ) {
      return false;
    }
    return game.currentBet === 0 || myHand.betThisRound === game.currentBet;
  }, [currentTurnPlayerId, game, myHand, playerId]);

  const canCall = useMemo(() => {
    if (
      !game ||
      !myHand ||
      currentTurnPlayerId !== playerId ||
      game.status !== "active"
    ) {
      return false;
    }
    const amountNeeded = game.currentBet - myHand.betThisRound;
    return (
      game.currentBet > 0 && amountNeeded > 0 && myHand.chips >= amountNeeded
    );
  }, [currentTurnPlayerId, game, myHand, playerId]);

  const callAmount = useMemo(() => {
    if (!game || !myHand) return 0;
    return game.currentBet - myHand.betThisRound;
  }, [game, myHand]);
  const hasPendingTurnClock = game?.turnClockExpiresAt !== undefined;
  const turnClockTimeRemaining = useMemo(() => {
    if (game?.turnClockExpiresAt === undefined) return null;
    return Math.max(0, game.turnClockExpiresAt - liveNow);
  }, [game?.turnClockExpiresAt, liveNow]);
  const turnClockCallerName = useMemo(
    () =>
      game?.turnClockCallerPlayerId
        ? getPlayerName(game.turnClockCallerPlayerId)
        : null,
    [game?.turnClockCallerPlayerId, getPlayerName],
  );
  const canCallClock = useMemo(() => {
    if (
      !game ||
      game.status !== "active" ||
      game.stage === "final" ||
      game.stage === "showdown" ||
      !playerId ||
      !myHand ||
      myHand.hasFolded ||
      !currentTurnPlayerId ||
      currentTurnPlayerId === playerId ||
      currentTurnIsAutomated ||
      hasPendingTurnClock ||
      game.turnStartedAt === undefined
    ) {
      return false;
    }

    return liveNow - game.turnStartedAt >= TURN_CLOCK_GRACE_PERIOD_MS;
  }, [
    currentTurnIsAutomated,
    currentTurnPlayerId,
    game,
    hasPendingTurnClock,
    liveNow,
    myHand,
    playerId,
  ]);

  const isMyTurn =
    currentTurnPlayerId === playerId && game?.status === "active";
  const raisesThisRound = game?.raisesThisRound ?? 0;
  const availableRaiseOptions = useMemo(() => {
    if (
      !game ||
      !myHand ||
      !isMyTurn ||
      game.status !== "active" ||
      raisesThisRound >= MAX_RAISES_PER_ROUND
    ) {
      return [];
    }

    return RAISE_LADDER.filter(
      (amount) =>
        amount > game.currentBet &&
        amount - myHand.betThisRound <= myHand.chips,
    );
  }, [game, isMyTurn, myHand, raisesThisRound]);
  const canRaise = availableRaiseOptions.length > 0;

  useEffect(() => {
    if (availableRaiseOptions.length === 0) {
      setSelectedRaiseAmount(null);
      return;
    }

    setSelectedRaiseAmount((current) =>
      current !== null && availableRaiseOptions.includes(current)
        ? current
        : availableRaiseOptions[0],
    );
  }, [availableRaiseOptions]);

  const displayHands = useMemo(() => {
    if (game?.status === "waiting" && roomData?.members) {
      return roomData.members.map((member) => ({
        _id: String(member._id),
        playerId: String(member._id),
        tiles: [],
        chips: INITIAL_CHIPS,
        betThisRound: 0,
        totalBet: 0,
      }));
    }
    return rotatedHands;
  }, [game?.status, roomData?.members, rotatedHands]);

  useRoomPresence(code, Boolean(session?.user && roomData?.room && myPlayer));

  useEffect(() => {
    if (
      isAuthPending ||
      !session?.user ||
      myPlayer ||
      !roomData?.viewerSeatPreview ||
      isRoomRejoinDismissed(code) ||
      autoRejoinAttemptedCodeRef.current === code
    ) {
      return;
    }

    autoRejoinAttemptedCodeRef.current = code;
    const displayName =
      session.user.name?.trim() || session.user.email || "Player";

    void (async () => {
      try {
        await rejoinRoomByCode({ code, name: displayName });
        hasLeftRoomRef.current = false;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to rejoin room.";
        setGameMessage(message);
      }
    })();
  }, [
    code,
    isAuthPending,
    isRoomRejoinDismissed,
    myPlayer,
    rejoinRoomByCode,
    roomData?.viewerSeatPreview,
    session?.user,
  ]);

  useEffect(() => {
    if (isAuthPending) return;
    if (!session?.user) {
      void navigate({ to: "/login" });
    }
  }, [isAuthPending, navigate, session?.user]);

  useEffect(() => {
    if (!isTransientActionMessage(gameMessage)) return;
    setGameMessage(null);
  }, [game?.currentBet, game?.currentPlayerIndex, game?.stage, gameMessage]);

  useEffect(() => {
    if (!roomData?.room._id || game !== null || isCreatingGame) return;

    const autoCreateGame = async () => {
      setIsCreatingGame(true);
      try {
        await createGameForRoom({ roomId: roomData.room._id });
      } catch (error) {
        console.error("Failed to auto-create game:", error);
      } finally {
        setIsCreatingGame(false);
      }
    };

    void autoCreateGame();
  }, [createGameForRoom, game, isCreatingGame, roomData?.room._id]);

  const handleLeaveRoom = useCallback(async () => {
    if (!myPlayerRef.current) {
      setLeaveMessage("You are not a member of this room.");
      return;
    }

    setIsLeavingRoom(true);
    setLeaveMessage(null);

    try {
      const didLeave = await leaveCurrentRoom(false);
      if (didLeave) {
        dismissRoomRejoin(code);
        await navigate({ to: "/" });
      }
    } finally {
      setIsLeavingRoom(false);
    }
  }, [code, leaveCurrentRoom, navigate]);

  const handleBack = useCallback(async () => {
    if (isLeavingRoom) return;
    setIsLeavingRoom(true);
    setLeaveMessage(null);
    dismissRoomRejoin(code);
    try {
      await leaveCurrentRoom(true);
      await navigate({ to: "/" });
    } finally {
      setIsLeavingRoom(false);
    }
  }, [code, isLeavingRoom, leaveCurrentRoom, navigate]);

  const handleViewResults = useCallback(async () => {
    await navigate({ to: "/results/$code", params: { code } });
  }, [code, navigate]);

  useEffect(() => {
    if (game?.status !== "completed" || !showdownResults) return;
    void handleViewResults();
  }, [game?.status, handleViewResults, showdownResults]);

  useEffect(() => {
    if (game?.stage !== "showdown" || game?.status !== "active") {
      setShowdownTimeRemaining(null);
      return;
    }

    const showdownStart = game.showdownStartedAt ?? Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - showdownStart;
      const remaining = Math.max(0, SHOWDOWN_TIMER_MS - elapsed);

      setShowdownTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        const hasSubmitted = wordSubmissions?.submissions?.some(
          (submission) => submission.playerId === playerId,
        );
        if (
          !hasSubmitted &&
          playerId &&
          game._id &&
          myHand &&
          !myHand.hasFolded
        ) {
          void forfeitShowdown({ gameId: game._id, playerId });
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    game?.stage,
    game?.status,
    game?.showdownStartedAt,
    game?._id,
    myHand,
    playerId,
    wordSubmissions,
    forfeitShowdown,
  ]);

  const handleCheck = useCallback(async () => {
    if (!game?._id || !playerId) return;
    setIsBetting(true);
    setGameMessage(null);
    try {
      await check({ gameId: game._id, playerId });
      setGameMessage("Checked.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to check.";
      setGameMessage(message);
    } finally {
      setIsBetting(false);
    }
  }, [check, game?._id, playerId]);

  const handleCall = useCallback(async () => {
    if (!game?._id || !playerId) return;
    setIsBetting(true);
    setGameMessage(null);
    try {
      const result = await call({ gameId: game._id, playerId });
      setGameMessage(`Matched ${result.amountCalled} chips.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to call.";
      setGameMessage(message);
    } finally {
      setIsBetting(false);
    }
  }, [call, game?._id, playerId]);

  const handleRaise = useCallback(async () => {
    if (!game?._id || !playerId || selectedRaiseAmount === null) {
      return;
    }
    if (raisesThisRound >= MAX_RAISES_PER_ROUND) {
      setGameMessage(
        `Raise limit reached (${MAX_RAISES_PER_ROUND}/${MAX_RAISES_PER_ROUND}).`,
      );
      return;
    }
    setIsBetting(true);
    setGameMessage(null);
    try {
      await raise({
        gameId: game._id,
        playerId,
        raiseToAmount: selectedRaiseAmount,
      });
      setGameMessage(`Raised to ${selectedRaiseAmount} chips.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to raise.";
      setGameMessage(message);
    } finally {
      setIsBetting(false);
    }
  }, [game?._id, playerId, raise, raisesThisRound, selectedRaiseAmount]);

  const handleFold = useCallback(async () => {
    if (!game?._id || !playerId) return;
    setIsBetting(true);
    setGameMessage(null);
    try {
      await fold({ gameId: game._id, playerId });
      setGameMessage("Folded.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fold.";
      setGameMessage(message);
    } finally {
      setIsBetting(false);
    }
  }, [fold, game?._id, playerId]);

  const handleCallClock = useCallback(async () => {
    if (!game?._id || !playerId) return;

    setIsCallingClock(true);
    setGameMessage(null);
    try {
      await callClock({ gameId: game._id, playerId });
      setGameMessage("Clock called.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to call the clock.";
      setGameMessage(message);
    } finally {
      setIsCallingClock(false);
    }
  }, [callClock, game?._id, playerId]);

  const handleToggleReady = useCallback(async () => {
    setIsTogglingReady(true);
    setGameMessage(null);
    try {
      await toggleReady({ code });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to toggle ready status.";
      setGameMessage(message);
    } finally {
      setIsTogglingReady(false);
    }
  }, [code, toggleReady]);

  const handleDevRejoinRoom = useCallback(async () => {
    if (!import.meta.env.DEV) return;

    const displayName =
      session?.user?.name?.trim() || session?.user?.email || "Dev Player";

    setIsDevRejoining(true);
    setGameMessage(null);
    try {
      await debugRejoinRoom({ code, name: displayName });
      hasLeftRoomRef.current = false;
      setGameMessage("Rejoined room for development.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to rejoin room.";
      setGameMessage(message);
    } finally {
      setIsDevRejoining(false);
    }
  }, [code, debugRejoinRoom, session?.user?.email, session?.user?.name]);

  const handleDevFillRoomWithBots = useCallback(async () => {
    if (!import.meta.env.DEV) return;

    setIsDevFillingBots(true);
    setGameMessage(null);
    try {
      const result = await debugFillRoomWithBots({ code, count: 2 });
      setGameMessage(
        result.added > 0
          ? `Added ${result.added} test player${result.added === 1 ? "" : "s"}.`
          : "No open seats available for test players.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add test players.";
      setGameMessage(message);
    } finally {
      setIsDevFillingBots(false);
    }
  }, [code, debugFillRoomWithBots]);

  const roomGameContextValue: RoomGameContextValue = useMemo(
    () => ({
      anteAmount: ANTE_AMOUNT,
      raisesThisRound,
      maxRaisesPerRound: MAX_RAISES_PER_ROUND,
      actionMessage: gameMessage,
      showBettingControls:
        game?.status === "active" &&
        game.stage !== "final" &&
        game.stage !== "showdown",
      showReadyButton: game?.status === "waiting",
      onReady: game?.status === "waiting" ? handleToggleReady : undefined,
      isReady: myPlayer?.readyStatus ?? false,
      isTogglingReady,
      readyCount:
        roomData?.members.filter((member) => member.readyStatus).length ?? 0,
      totalPlayers: roomData?.members.length ?? 0,
      allPlayersReady:
        (roomData?.members?.length ?? 0) > 0 &&
        (roomData?.members?.every((member) => member.readyStatus) ?? false),
      isBetting,
      isMyTurn,
      canCheck,
      canCall,
      canRaise,
      canFold: isMyTurn,
      canCallClock,
      currentTurnPlayerName,
      onCheck: canCheck ? handleCheck : undefined,
      onCall: canCall ? handleCall : undefined,
      onRaise: isMyTurn ? handleRaise : undefined,
      onFold: isMyTurn ? handleFold : undefined,
      onCallClock: canCallClock ? handleCallClock : undefined,
      onRaiseAmountChange: canRaise ? setSelectedRaiseAmount : undefined,
      onLeaveRoom: handleBack,
      callLabel: callAmount > 0 ? `Call ${callAmount}` : "Call",
      callAmount,
      raiseLabel:
        selectedRaiseAmount !== null
          ? `Raise to ${selectedRaiseAmount}`
          : "Raise Maxed",
      raiseAmount: selectedRaiseAmount,
      raiseOptions: availableRaiseOptions,
      isCallingClock,
      turnClockTimeRemaining,
      turnClockCallerName,
      showdownTimeRemaining,
    }),
    [
      availableRaiseOptions,
      callAmount,
      canCall,
      canCallClock,
      canCheck,
      canRaise,
      currentTurnPlayerName,
      game?.stage,
      game?.status,
      gameMessage,
      handleBack,
      handleCall,
      handleCallClock,
      handleCheck,
      handleFold,
      handleRaise,
      handleToggleReady,
      isBetting,
      isCallingClock,
      isMyTurn,
      isTogglingReady,
      myPlayer?.readyStatus,
      raisesThisRound,
      roomData?.members,
      selectedRaiseAmount,
      showdownTimeRemaining,
      turnClockCallerName,
      turnClockTimeRemaining,
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
        isLeavingRoom,
        leaveMessage,
        gameMessage,
        isTogglingReady,
        isBetting,
        isMyTurn,
        canCheck,
        canCall,
        canRaise,
        canCallClock,
        callAmount,
        turnClockTimeRemaining,
        effectiveNextRaiseLevel: selectedRaiseAmount ?? undefined,
        hasDevTools: import.meta.env.DEV,
        isDevRejoining,
        isDevFillingBots,
      },
      actions: {
        leaveRoom: handleLeaveRoom,
        back: handleBack,
        toggleReady: handleToggleReady,
        check: handleCheck,
        call: handleCall,
        raise: handleRaise,
        fold: handleFold,
        callClock: handleCallClock,
        devRejoinRoom: import.meta.env.DEV ? handleDevRejoinRoom : undefined,
        devFillRoomWithBots: import.meta.env.DEV
          ? handleDevFillRoomWithBots
          : undefined,
      },
      meta: {
        getPlayerName,
        getPlayerAvatar,
        getPlayerPersonality,
      },
    }),
    [
      callAmount,
      canCall,
      canCallClock,
      canCheck,
      canRaise,
      code,
      game,
      gameMessage,
      getPlayerAvatar,
      getPlayerName,
      getPlayerPersonality,
      handleBack,
      handleCall,
      handleCallClock,
      handleCheck,
      handleDevFillRoomWithBots,
      handleDevRejoinRoom,
      handleFold,
      handleLeaveRoom,
      handleRaise,
      handleToggleReady,
      isBetting,
      isDevFillingBots,
      isDevRejoining,
      isLeavingRoom,
      isMyTurn,
      isTogglingReady,
      leaveMessage,
      myPlayer?.readyStatus,
      playerHands,
      playerId,
      roomData,
      selectedRaiseAmount,
      showdownResults,
      turnClockTimeRemaining,
    ],
  );

  return {
    session,
    isAuthPending,
    roomData,
    game,
    myPlayer,
    currentTurnPlayerId,
    displayHands,
    bottomPlayerId,
    getPlayerName,
    getPlayerAvatar,
    getPlayerPersonality,
    roomGameContextValue,
    roomPageContextValue,
    isDevRejoining,
    isDevFillingBots,
    onDevRejoinRoom: handleDevRejoinRoom,
    onDevFillRoomWithBots: handleDevFillRoomWithBots,
  };
}
