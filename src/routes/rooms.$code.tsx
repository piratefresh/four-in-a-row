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
const ANTE_AMOUNT = 20;
const RAISE_LADDER = [20, 40, 60, 80, 100, 120, 140, 160, 200];
const MAX_RAISES_PER_ROUND = 3;

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
  const leaveRoom = useMutation(api.rooms.leaveRoomByCode);
  const createGameForRoom = useMutation(api.games.createGameForRoom);
  const startGame = useMutation(api.games.startGame);
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
  const [isBetting, setIsBetting] = useState(false);

  const isTransientActionMessage = (message: string | null) =>
    !!message &&
    (message === "Checked." ||
      message === "Folded." ||
      message.startsWith("Matched ") ||
      message.startsWith("Raised to "));

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
    const amountNeeded = game.currentBet - myHand.betThisRound;
    return game.currentBet > 0 && amountNeeded > 0 && myHand.chips >= amountNeeded;
  }, [game, myHand, currentTurnPlayerId, playerId]);

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
    myHand!.chips >= (effectiveNextRaiseLevel! - myHand!.betThisRound);


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

  useEffect(() => {
    if (!isTransientActionMessage(gameMessage)) return;
    setGameMessage(null);
  }, [game?.currentBet, game?.currentPlayerIndex, game?.stage, gameMessage]);

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
      const result = await call({ gameId: game._id, playerId });
      setGameMessage(`Matched ${result.amountCalled} chips.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to call.";
      setGameMessage(message);
    } finally {
      setIsBetting(false);
    }
  };

  const handleRaise = async () => {
    if (!game?._id || !playerId || effectiveNextRaiseLevel === undefined) return;
    if (raisesThisRound >= MAX_RAISES_PER_ROUND) {
      setGameMessage(`Raise limit reached (${MAX_RAISES_PER_ROUND}/${MAX_RAISES_PER_ROUND}).`);
      return;
    }
    setIsBetting(true);
    setGameMessage(null);
    try {
      await raise({ gameId: game._id, playerId, raiseToAmount: effectiveNextRaiseLevel });
      setGameMessage(`Raised to ${effectiveNextRaiseLevel} chips.`);
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
                      Ante:{" "}
                      <span className="text-cyan-300">{ANTE_AMOUNT} chips/player</span>
                    </p>
                    <p className="text-slate-300">
                      Current Bet:{" "}
                      <span className="text-cyan-300">
                        {game.currentBet ?? 0} chips
                      </span>
                    </p>
                    <p className="text-slate-300">
                      Raises This Round:{" "}
                      <span className="text-cyan-300">
                        {raisesThisRound}/{MAX_RAISES_PER_ROUND}
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
                  {game.status === "active" && game.stage === "showdown" && (
                    <div className="mb-3 rounded-md border border-cyan-500 bg-cyan-500/10 p-3">
                      <p className="text-sm font-semibold text-cyan-300">
                        Final tile revealed. Showdown is active.
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
                        gameStage={game.stage}
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

                  {/* Showdown Results Section */}
                  {showdownResults && (
                    <div className="mb-3 rounded-md border border-purple-700 bg-purple-950/40 p-4">
                      <h3 className="mb-3 text-lg font-bold text-purple-300">
                        🏆 Showdown Results
                      </h3>

                      {showdownResults.hasWinner ? (
                        <>
                          <div className="mb-4 rounded-md border border-amber-500 bg-amber-500/10 p-3">
                            <p className="mb-1 text-sm font-semibold text-amber-300">
                              Winner: {showdownResults.winnerId === playerId ? "You!" : memberById.get(showdownResults.winnerId ?? "")?.name ?? showdownResults.winnerId}
                            </p>
                            {showdownResults.winningWord ? (
                              <>
                                <p className="mb-1 text-xl font-bold text-white">
                                  {showdownResults.winningWord.toUpperCase()}
                                </p>
                                <p className="mb-2 text-2xl font-bold text-amber-400">
                                  {showdownResults.winningScore} points
                                </p>
                                {showdownResults.winningScoreBreakdown && (
                                  <div className="text-xs text-slate-300">
                                    <p>Length Points: {showdownResults.winningScoreBreakdown.lengthPoints}</p>
                                    <p>Speed Bonus: {showdownResults.winningScoreBreakdown.speedBonus}</p>
                                    <p>Valid Word Bonus: {showdownResults.winningScoreBreakdown.validWordBonus}</p>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="mt-2 text-sm italic text-slate-300">
                                Won by default (all other players folded)
                              </p>
                            )}
                          </div>

                          {showdownResults.allSubmissions && showdownResults.allSubmissions.length > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-300">
                                All Submissions
                              </p>
                              <div className="space-y-2">
                                {showdownResults.allSubmissions.map((submission) => (
                                  <div
                                    key={submission.playerId}
                                    className={`rounded-md border p-2 text-sm ${
                                      submission.playerId === showdownResults.winnerId
                                        ? "border-amber-500 bg-amber-500/5"
                                        : "border-slate-600 bg-slate-800/50"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="font-semibold text-slate-200">
                                          {submission.playerId === playerId ? "You" : memberById.get(submission.playerId)?.name ?? submission.playerId}
                                        </span>
                                        <span className="mx-2 text-slate-400">•</span>
                                        <span className="font-bold text-white">
                                          {submission.word.toUpperCase()}
                                        </span>
                                      </div>
                                      <span className="font-bold text-cyan-300">
                                        {submission.score} pts
                                      </span>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-400">
                                      Length: {submission.scoreBreakdown.lengthPoints} | Speed: {submission.scoreBreakdown.speedBonus} | Valid: {submission.scoreBreakdown.validWordBonus}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-slate-300">
                          No winner - no eligible submissions.
                        </p>
                      )}
                    </div>
                  )}
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
                </div>

                {game?.status === "active" &&
                  game.stage !== "final" &&
                  game.stage !== "showdown" &&
                  isMyTurn && (
                  <div className="rounded-lg border border-amber-500 bg-amber-500/5 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">
                      Betting Actions
                    </p>
                    <p className="mb-2 text-xs text-slate-300">
                      Next Raise:{" "}
                      <span className="text-cyan-300">
                        {effectiveNextRaiseLevel !== undefined
                          ? `${effectiveNextRaiseLevel} chips`
                          : "Max level reached"}
                      </span>
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
                          {isBetting ? "Betting..." : `Match ${callAmount}`}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleRaise()}
                        disabled={isBetting || !canRaise}
                        className="rounded-md bg-amber-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                      >
                        {isBetting
                          ? "Betting..."
                          : effectiveNextRaiseLevel !== undefined
                            ? `Raise to ${effectiveNextRaiseLevel}`
                            : "Raise Maxed"}
                      </button>
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


