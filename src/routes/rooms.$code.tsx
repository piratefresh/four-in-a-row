import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RoomHandsBoardV2 } from "@/components/rooms/RoomHandsBoardV2";
import { RoomGameProvider } from "@/components/rooms/RoomGameContext";
import { RoomLobbyPanel } from "@/components/rooms/RoomLobbyPanel";
import { RoomPageProvider } from "@/components/rooms/RoomPageContext";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { SHOWDOWN_TIMER_MS } from "../../convex/gameState";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

export const Route = createFileRoute("/rooms/$code")({
  component: RoomDetailsPage,
});

const DEALER_PLAYER_ID = "ai_dealer";
const ANTE_AMOUNT = 20;
const RAISE_LADDER = [20, 40, 60, 80, 100, 120, 140, 160, 200];
const MAX_RAISES_PER_ROUND = 3;
const INITIAL_CHIPS = 1000;
// SHOWDOWN_TIMER_MS is imported from gameState.ts

function StatusScreen({ message }: { message: string }) {
  return (
    <div className="relative min-h-screen bg-[#252525]">
      <LoadingOverlay message={message} />
    </div>
  );
}

function isTransientActionMessage(message: string | null) {
  return (
    !!message &&
    (message === "Checked." ||
      message === "Folded." ||
      message.startsWith("Matched ") ||
      message.startsWith("Raised to "))
  );
}

function RoomDetailsPage() {
  const { code } = Route.useParams();
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
      if (hasLeftRoomRef.current) {
        return true;
      }
      if (!myPlayerRef.current) {
        return false;
      }

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

  // Showdown timer - synced with backend showdownStartedAt timestamp
  useEffect(() => {
    if (game?.stage !== "showdown" || game?.status !== "active") {
      setShowdownTimeRemaining(null);
      return;
    }

    // Use backend showdownStartedAt if available, otherwise use current time
    const showdownStart = game.showdownStartedAt ?? Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - showdownStart;
      const remaining = Math.max(0, SHOWDOWN_TIMER_MS - elapsed);

      setShowdownTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        // Auto-forfeit if timer runs out and player hasn't submitted
        const hasSubmitted = wordSubmissions?.submissions?.some(
          (s) => s.playerId === playerId,
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
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [
    game?.stage,
    game?.status,
    game?.showdownStartedAt,
    game?._id,
    playerId,
    myHand,
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

  const roomGameContextValue = useMemo(
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

  const roomPageContextValue = useMemo(
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
      },
      actions: {
        leaveRoom: handleLeaveRoom,
        back: handleBack,
        toggleReady: handleToggleReady,
        check: handleCheck,
        call: handleCall,
        raise: handleRaise,
        fold: handleFold,
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
      handleFold,
      handleLeaveRoom,
      handleRaise,
      handleToggleReady,
      isBetting,
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

  if (isAuthPending) {
    return <StatusScreen message="Loading..." />;
  }

  if (!session?.user) {
    return <StatusScreen message="Redirecting to login..." />;
  }

  // Show loading overlay while initial data is loading
  if (roomData === undefined) {
    return <StatusScreen message="Joining room..." />;
  }

  return (
    <RoomPageProvider value={roomPageContextValue}>
      {game && displayHands.length > 0 ? (
        <RoomGameProvider value={roomGameContextValue}>
          <RoomHandsBoardV2
            gameId={game._id}
            roomCode={code}
            gameStage={game.stage}
            communityTiles={game.communityTiles}
            hands={displayHands}
            pot={game.pot}
            getPlayerName={getPlayerName}
          />
        </RoomGameProvider>
      ) : (
        <RoomLobbyPanel />
      )}
    </RoomPageProvider>
  );
}
