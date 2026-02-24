import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RoomHandsBoard } from "@/components/rooms/RoomHandsBoard";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/rooms/$code")({
  component: RoomDetailsPage,
});

const DEALER_PLAYER_ID = "ai_dealer";

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
  const leaveRoom = useMutation(api.rooms.leaveRoomByCode);
  const createGameForRoom = useMutation(api.games.createGameForRoom);
  const startGame = useMutation(api.games.startGame);
  const advanceStage = useMutation(api.games.advanceStage);
  const check = useMutation((api as any).games.check);
  const call = useMutation((api as any).games.call);
  const raise = useMutation((api as any).games.raise);
  const fold = useMutation((api as any).games.fold);
  console.log("roomData", roomData);
  console.log("session", session);
  // Prefer server-identified viewer membership; fall back to auth ID match.
  const myPlayer = useMemo(() => {
    if (!roomData?.members) return null;

    if (roomData.viewerPlayerId) {
      return (
        roomData.members.find((m) => m._id === roomData.viewerPlayerId) ?? null
      );
    }

    if (!session?.user) return null;
    return roomData.members.find((m) => m.authUserId === session.user.id);
  }, [session, roomData]);

  const playerId = myPlayer?._id ? String(myPlayer._id) : null;
  const myPlayerRef = useRef<typeof myPlayer>(null);
  const roomCodeRef = useRef(code);
  const hasLeftRoomRef = useRef(false);

  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState<string | null>(null);
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isAdvancingStage, setIsAdvancingStage] = useState(false);
  const [isBetting, setIsBetting] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState("");

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

  const memberById = useMemo(() => {
    return new Map(
      (roomData?.members ?? []).map((member) => [String(member._id), member]),
    );
  }, [roomData?.members]);

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

  // Calculate turn order and current player
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
    [playerId, playerHands],
  );

  const canCheck = useMemo(() => {
    if (
      !game ||
      !myHand ||
      currentTurnPlayerId !== playerId ||
      game.status !== "active"
    )
      return false;
    return game.currentBet === 0 || myHand.betThisRound === game.currentBet;
  }, [game, myHand, currentTurnPlayerId, playerId]);

  const canCall = useMemo(() => {
    if (
      !game ||
      !myHand ||
      currentTurnPlayerId !== playerId ||
      game.status !== "active"
    )
      return false;
    return game.currentBet > 0 && myHand.betThisRound < game.currentBet;
  }, [game, myHand, currentTurnPlayerId, playerId]);

  const callAmount = useMemo(() => {
    if (!game || !myHand) return 0;
    return game.currentBet - myHand.betThisRound;
  }, [game, myHand]);

  const isMyTurn =
    currentTurnPlayerId === playerId && game?.status === "active";


  useEffect(() => {
    const onPageHide = () => {
      void leaveCurrentRoom(true);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [leaveCurrentRoom]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isAuthPending) return;
    if (!session?.user) {
      void navigate({ to: "/login" });
    }
  }, [session, isAuthPending, navigate]);

  const handleLeaveRoom = async () => {
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
  };

  const handleBack = async () => {
    if (isLeavingRoom) return;
    setIsLeavingRoom(true);
    setLeaveMessage(null);
    try {
      await leaveCurrentRoom(true);
      await navigate({ to: "/" });
    } finally {
      setIsLeavingRoom(false);
    }
  };

  const handleCreateGame = async () => {
    if (!roomData) return;
    setIsCreatingGame(true);
    setGameMessage(null);
    try {
      await createGameForRoom({ roomId: roomData.room._id });
      setGameMessage("Game created.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create game.";
      setGameMessage(message);
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleStartGame = async () => {
    if (!game?._id) return;
    setIsStartingGame(true);
    setGameMessage(null);
    try {
      await startGame({ gameId: game._id });
      setGameMessage("Game started.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start game.";
      setGameMessage(message);
    } finally {
      setIsStartingGame(false);
    }
  };

  const handleAdvanceStage = async () => {
    if (!game?._id) return;
    setIsAdvancingStage(true);
    setGameMessage(null);
    try {
      await advanceStage({ gameId: game._id });
      setGameMessage("Stage advanced.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to advance stage.";
      setGameMessage(message);
    } finally {
      setIsAdvancingStage(false);
    }
  };

  const handleCheck = async () => {
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
  };

  const handleCall = async () => {
    if (!game?._id || !playerId) return;
    setIsBetting(true);
    setGameMessage(null);
    try {
      await call({ gameId: game._id, playerId });
      setGameMessage(`Called ${callAmount} chips.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to call.";
      setGameMessage(message);
    } finally {
      setIsBetting(false);
    }
  };

  const handleRaise = async () => {
    if (!game?._id || !playerId) return;
    const amount = parseInt(raiseAmount, 10);
    if (!Number.isFinite(amount) || amount <= (game.currentBet ?? 0)) {
      setGameMessage(
        `Raise amount must be greater than current bet of ${game.currentBet ?? 0}.`,
      );
      return;
    }
    setIsBetting(true);
    setGameMessage(null);
    try {
      await raise({ gameId: game._id, playerId, raiseToAmount: amount });
      setGameMessage(`Raised to ${amount} chips.`);
      setRaiseAmount("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to raise.";
      setGameMessage(message);
    } finally {
      setIsBetting(false);
    }
  };

  const handleFold = async () => {
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
  };

  // Show loading while checking auth
  if (isAuthPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <p className="text-sm text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Will redirect to login in useEffect if not authenticated
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <p className="text-sm text-slate-300">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6 py-12">
      <div className="mx-auto rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Room {code}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleLeaveRoom()}
              disabled={!myPlayer || isLeavingRoom}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {isLeavingRoom ? "Leaving..." : "Leave room"}
            </button>
            <button
              type="button"
              onClick={() => void handleBack()}
              disabled={isLeavingRoom}
              className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              Back
            </button>
          </div>
        </div>

        {leaveMessage && (
          <p className="mb-4 text-sm text-rose-300">{leaveMessage}</p>
        )}

        {roomData === undefined && (
          <p className="text-sm text-slate-300">Loading room...</p>
        )}

        {roomData === null && (
          <p className="text-sm text-rose-300">Room not found.</p>
        )}

        {roomData && (
          <div className="space-y-6">
            <div>
              {roomData.members.length === 0 && (
                <p className="text-sm text-slate-400">No members joined yet.</p>
              )}
            </div>

            <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Game (MVP)</h2>
                <span className="text-xs text-slate-400">
                  Room ID: {roomData.room._id}
                </span>
              </div>

              {!game && (
                <p className="mb-3 text-sm text-slate-300">
                  No game has been created for this room.
                </p>
              )}

              {game && (
                <>
                  <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                    <p className="text-slate-300">
                      Stage: <span className="text-cyan-300">{game.stage}</span>
                    </p>
                    <p className="text-slate-300">
                      Status:{" "}
                      <span className="text-cyan-300">{game.status}</span>
                    </p>
                    <p className="text-slate-300">
                      Pot:{" "}
                      <span className="text-cyan-300">{game.pot} chips</span>
                    </p>
                    <p className="text-slate-300">
                      Current Bet:{" "}
                      <span className="text-cyan-300">
                        {game.currentBet ?? 0} chips
                      </span>
                    </p>
                    {myHand && (
                      <>
                        <p className="text-slate-300">
                          Your Chips:{" "}
                          <span className="text-cyan-300">
                            {myHand.chips} chips
                          </span>
                        </p>
                        <p className="text-slate-300">
                          Your Bet This Round:{" "}
                          <span className="text-cyan-300">
                            {myHand.betThisRound} chips
                          </span>
                        </p>
                      </>
                    )}
                    <p className="text-slate-300">
                      Current Turn:{" "}
                      <span className="text-cyan-300">
                        {currentTurnPlayerId === playerId
                          ? "You"
                          : currentTurnPlayerId || "Unknown"}
                      </span>
                    </p>
                    <p className="text-slate-300">
                      Your ID:{" "}
                      <span className="text-cyan-300">
                        {playerId || "None"}
                      </span>
                    </p>
                  </div>
                  {isMyTurn && (
                    <div className="mb-3 rounded-md border border-amber-500 bg-amber-500/10 p-3">
                      <p className="text-sm font-semibold text-amber-300">
                        It's your turn!
                      </p>
                    </div>
                  )}
                  <div className="mb-3 rounded-md border border-slate-700 bg-slate-950/40 p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                      Dealt Hands
                    </p>
                    {!playerHands && (
                      <p className="text-sm text-slate-400">Loading hands...</p>
                    )}
                    {playerHands && playerHands.length === 0 && (
                      <p className="text-sm text-slate-400">
                        No hands dealt yet. Start the game to distribute
                        letters.
                      </p>
                    )}
                    {playerHands && nonDealerHands.length > 0 && (
                      <RoomHandsBoard
                        gameId={game._id}
                        communityTiles={game.communityTiles}
                        hands={nonDealerHands}
                        bottomPlayerId={playerId ?? nonDealerHands[0]?.playerId}
                        getPlayerName={(playerId, handIndex) =>
                          memberById.get(playerId)?.name ??
                          `Player ${handIndex + 1}`
                        }
                      />
                    )}
                  </div>
                </>
              )}

              {gameMessage && (
                <p className="mb-3 text-sm text-cyan-300">{gameMessage}</p>
              )}

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCreateGame()}
                    disabled={!roomData || !!game || isCreatingGame}
                    className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    {isCreatingGame ? "Creating..." : "Create game"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStartGame()}
                    disabled={
                      !game || game.status !== "waiting" || isStartingGame
                    }
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    {isStartingGame ? "Starting..." : "Start game"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAdvanceStage()}
                    disabled={
                      !game || game.status !== "active" || isAdvancingStage
                    }
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    {isAdvancingStage
                      ? "Advancing..."
                      : "Advance stage (Debug)"}
                  </button>
                </div>

                {game?.status === "active" && isMyTurn && (
                  <div className="rounded-lg border border-amber-500 bg-amber-500/5 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">
                      Betting Actions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {canCheck && (
                        <button
                          type="button"
                          onClick={() => void handleCheck()}
                          disabled={isBetting}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                        >
                          {isBetting ? "Betting..." : "Check"}
                        </button>
                      )}
                      {canCall && (
                        <button
                          type="button"
                          onClick={() => void handleCall()}
                          disabled={isBetting}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                        >
                          {isBetting ? "Betting..." : `Call ${callAmount}`}
                        </button>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={raiseAmount}
                          onChange={(e) => setRaiseAmount(e.target.value)}
                          placeholder="Raise to..."
                          min={(game.currentBet ?? 0) + 1}
                          className="w-24 rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-white"
                        />
                        <button
                          type="button"
                          onClick={() => void handleRaise()}
                          disabled={isBetting || !raiseAmount}
                          className="rounded-md bg-amber-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                        >
                          {isBetting ? "Betting..." : "Raise"}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleFold()}
                        disabled={isBetting}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                      >
                        {isBetting ? "Betting..." : "Fold"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}


