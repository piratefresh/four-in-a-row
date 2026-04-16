import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../../convex/_generated/api";
import { SHOWDOWN_TIMER_MS } from "../../../../convex/gameState";
import type { RoomGameContextValue } from "../context/RoomGameContext";
import type { RoomPageContextValue } from "../context/RoomPageContext";

const DEALER_PLAYER_ID = "ai_dealer";
const ANTE_AMOUNT = 20;
const RAISE_LADDER = [20, 40, 60, 80, 100, 120, 140, 160, 200];
const MAX_RAISES_PER_ROUND = 3;
const INITIAL_CHIPS = 1000;

function isTransientActionMessage(message: string | null) {
  return (
    !!message &&
    (message === "Checked." ||
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
  const createGameForRoom = useMutation(api.games.createGameForRoom);
  const toggleReady = useMutation(api.rooms.toggleReady);
  const debugRejoinRoom = useMutation(api.rooms.debugRejoinRoom);
  const debugFillRoomWithBots = useMutation(api.rooms.debugFillRoomWithBots);
  const check = useMutation((api as any).games.check);
  const call = useMutation((api as any).games.call);
  const raise = useMutation((api as any).games.raise);
  const fold = useMutation((api as any).games.fold);
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

  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState<string | null>(null);
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isBetting, setIsBetting] = useState(false);
  const [isTogglingReady, setIsTogglingReady] = useState(false);
  const [isDevRejoining, setIsDevRejoining] = useState(false);
  const [isDevFillingBots, setIsDevFillingBots] = useState(false);
  const [showdownTimeRemaining, setShowdownTimeRemaining] = useState<
    number | null
  >(null);

  useEffect(() => {
    myPlayerRef.current = myPlayer;
  }, [myPlayer]);

  useEffect(() => {
    roomCodeRef.current = code;
  }, [code]);

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
    (targetPlayerId: string, handIndex?: number) =>
      memberById.get(targetPlayerId)?.name ??
      (handIndex !== undefined ? `Player ${handIndex + 1}` : targetPlayerId),
    [memberById],
  );

  const getPlayerAvatar = useCallback(
    (targetPlayerId: string) => memberById.get(targetPlayerId)?.image ?? null,
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

  const isMyTurn =
    currentTurnPlayerId === playerId && game?.status === "active";
  const raisesThisRound = game?.raisesThisRound ?? 0;
  const nextRaiseLevel = useMemo(
    () => RAISE_LADDER.find((amount) => amount > (game?.currentBet ?? 0)),
    [game?.currentBet],
  );
  const effectiveNextRaiseLevel =
    raisesThisRound >= MAX_RAISES_PER_ROUND ? undefined : nextRaiseLevel;
  const canRaise =
    Boolean(game && myHand && effectiveNextRaiseLevel !== undefined) &&
    isMyTurn &&
    raisesThisRound < MAX_RAISES_PER_ROUND &&
    myHand!.chips >= effectiveNextRaiseLevel! - myHand!.betThisRound;

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

  useEffect(() => {
    const onPageHide = () => {
      void leaveCurrentRoom(true);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [leaveCurrentRoom]);

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
    if (!roomData?.room._id || game !== undefined || isCreatingGame) return;

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
        await navigate({ to: "/" });
      }
    } finally {
      setIsLeavingRoom(false);
    }
  }, [leaveCurrentRoom, navigate]);

  const handleBack = useCallback(async () => {
    if (isLeavingRoom) return;
    setIsLeavingRoom(true);
    setLeaveMessage(null);
    try {
      await leaveCurrentRoom(true);
      await navigate({ to: "/" });
    } finally {
      setIsLeavingRoom(false);
    }
  }, [isLeavingRoom, leaveCurrentRoom, navigate]);

  const handleViewResults = useCallback(async () => {
    await navigate({ to: "/results/$code", params: { code } });
  }, [code, navigate]);

  useEffect(() => {
    if (game?.status !== "completed" || !showdownResults) return;
    const timer = setTimeout(() => {
      void handleViewResults();
    }, 2000);
    return () => clearTimeout(timer);
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
    if (!game?._id || !playerId || effectiveNextRaiseLevel === undefined) {
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
        raiseToAmount: effectiveNextRaiseLevel,
      });
      setGameMessage(`Raised to ${effectiveNextRaiseLevel} chips.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to raise.";
      setGameMessage(message);
    } finally {
      setIsBetting(false);
    }
  }, [effectiveNextRaiseLevel, game?._id, playerId, raise, raisesThisRound]);

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
      canCheck,
      canCall,
      canRaise,
      canFold: isMyTurn,
      onCheck: canCheck ? handleCheck : undefined,
      onCall: canCall ? handleCall : undefined,
      onRaise: isMyTurn ? handleRaise : undefined,
      onFold: isMyTurn ? handleFold : undefined,
      onLeaveRoom: handleBack,
      callLabel: callAmount > 0 ? `Call ${callAmount}` : "Call",
      raiseLabel:
        effectiveNextRaiseLevel !== undefined
          ? `Raise to ${effectiveNextRaiseLevel}`
          : "Raise Maxed",
      showdownTimeRemaining,
    }),
    [
      callAmount,
      canCall,
      canCheck,
      canRaise,
      effectiveNextRaiseLevel,
      game?.stage,
      game?.status,
      gameMessage,
      handleBack,
      handleCall,
      handleCheck,
      handleFold,
      handleRaise,
      handleToggleReady,
      isBetting,
      isMyTurn,
      isTogglingReady,
      myPlayer?.readyStatus,
      raisesThisRound,
      roomData?.members,
      showdownTimeRemaining,
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
        callAmount,
        effectiveNextRaiseLevel,
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
        devRejoinRoom: import.meta.env.DEV ? handleDevRejoinRoom : undefined,
        devFillRoomWithBots: import.meta.env.DEV
          ? handleDevFillRoomWithBots
          : undefined,
      },
      meta: {
        getPlayerName,
      },
    }),
    [
      callAmount,
      canCall,
      canCheck,
      canRaise,
      code,
      effectiveNextRaiseLevel,
      game,
      gameMessage,
      getPlayerName,
      handleBack,
      handleCall,
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
      showdownResults,
    ],
  );

  return {
    session,
    isAuthPending,
    roomData,
    game,
    myPlayer,
    displayHands,
    bottomPlayerId,
    getPlayerName,
    getPlayerAvatar,
    roomGameContextValue,
    roomPageContextValue,
    isDevRejoining,
    isDevFillingBots,
    onDevRejoinRoom: handleDevRejoinRoom,
    onDevFillRoomWithBots: handleDevFillRoomWithBots,
  };
}
