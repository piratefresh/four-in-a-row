import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { ShowdownResultsScreen } from "@/components/rooms/results/ShowdownResultsScreen";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/results/$code")({
  component: ResultsPage,
});

function ResultsPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const leaveRoom = useMutation(api.rooms.leaveRoomByCode);
  const redealGameForRoom = useMutation(api.games.redealGameForRoom);
  const [isStartingNextHand, setIsStartingNextHand] = useState(false);
  const [nextHandError, setNextHandError] = useState<string | null>(null);

  const roomData = useQuery(api.rooms.getRoomMembers, { code });
  const game = useQuery(api.games.getGameByRoom, {
    roomId: roomData?.room._id ?? "",
  });
  const showdownResults = useQuery(
    api.games.getShowdownResults,
    game ? { gameId: game._id } : "skip",
  );

  const memberById = useMemo(() => new Map(
    (roomData?.members ?? []).map((member) => [String(member._id), member]),
  ), [roomData?.members]);

  const handleReturnHome = async () => {
    try {
      await leaveRoom({ code });
    } catch (error) {
      console.error("Error leaving room:", error);
    }
    await navigate({ to: "/" });
  };

  const handleNextHand = async () => {
    if (!roomData?.room?._id || isStartingNextHand) {
      return;
    }

    setIsStartingNextHand(true);
    setNextHandError(null);

    try {
      const result = await redealGameForRoom({ roomId: roomData.room._id });
      if (!result.ok) {
        setNextHandError(
          result.reason === "Not enough players"
            ? "Not enough active players to start the next hand."
            : "Failed to start the next hand.",
        );
        return;
      }

      await navigate({ to: "/rooms/$code", params: { code } });
    } catch (error) {
      console.error("Error starting next hand:", error);
      setNextHandError("Failed to start the next hand.");
    } finally {
      setIsStartingNextHand(false);
    }
  };

  // Find current player
  const myPlayer = useMemo(() => {
    if (!roomData?.members) return null;

    if (session?.user) {
      const authMatched = roomData.members.find((m) => m.authUserId === session.user.id);
      if (authMatched) return authMatched;
    }

    if (roomData.viewerPlayerId) {
      return roomData.members.find((m) => m._id === roomData.viewerPlayerId) ?? null;
    }

    return null;
  }, [session, roomData]);

  const didIWin = showdownResults?.winnerId === String(myPlayer?._id);

  if (!showdownResults || !roomData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#2d2d2d]">
        <p className="text-2xl text-white">Loading results...</p>
      </div>
    );
  }

  const currentPlayerId = myPlayer ? String(myPlayer._id) : null;
  const getPlayerName = (id: string) => memberById.get(id)?.name ?? "Player";

  return (
    <ShowdownResultsScreen
      roomCode={code}
      pot={game?.pot ?? 0}
      playerId={currentPlayerId}
      showdownResults={showdownResults}
      getPlayerName={getPlayerName}
      onNextHand={handleNextHand}
      isStartingNextHand={isStartingNextHand}
      nextHandError={nextHandError}
    />
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a] font-serif text-white">
      {/* Main Content */}
      <div className="flex min-h-screen flex-col items-center justify-center px-8 py-16">
        <div className="w-full max-w-5xl space-y-12">
          {/* Title with Animation */}
          <h2 className="animate-fade-in text-center text-7xl font-bold tracking-tight">
            🎮 Game Over
          </h2>

          {/* Win/Loss Message */}
          <div className="relative animate-slide-up text-center">
            <div
              className={`text-5xl font-bold ${
                didIWin
                  ? "animate-bounce bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent"
                  : "text-slate-300"
              }`}
            >
              {didIWin ? (
                <>
                  🏆 Victory! 🏆
                  <div className="mt-4 text-4xl font-semibold text-emerald-400">
                    +${game?.pot ?? 0} Credits
                  </div>
                </>
              ) : (
                "Better Luck Next Time"
              )}
            </div>
          </div>

          {/* Leaderboard with Staggered Animations */}
          <div className="space-y-4">
            {showdownResults.allSubmissions
              .sort((a, b) => b.score - a.score)
              .map((submission, index) => {
                const playerName =
                  memberById.get(submission.playerId)?.name ??
                  `Player ${index + 1}`;
                const isForfeited = submission.status === "forfeited" || submission.status === "no-submission";
                const isInvalid = submission.score === 0 && submission.status === "submitted";
                const isWinner = index === 0 && !isForfeited && !isInvalid;
                const isMe = submission.playerId === String(myPlayer?._id);

                return (
                  <div
                    key={submission.playerId}
                    className="animate-slide-up opacity-0"
                    style={{
                      animationDelay: `${index * 150}ms`,
                      animationFillMode: "forwards",
                    }}
                  >
                    <div
                      className={`group grid grid-cols-[100px_1fr_1fr_140px] items-center gap-4 rounded-xl p-4 transition-all duration-300 hover:scale-105 ${
                        isWinner
                          ? "bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400"
                          : isMe
                            ? "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 ring-2 ring-blue-400/50"
                            : "bg-[#1a1a1a]/60 ring-1 ring-slate-600/30"
                      }`}
                    >
                      {/* Position Badge */}
                      <div className="flex justify-center">
                        <div
                          className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold shadow-lg transition-transform group-hover:rotate-12 ${
                            isWinner
                              ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-white ring-4 ring-amber-300/50"
                              : index === 1
                                ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white ring-4 ring-slate-400/30"
                                : index === 2
                                  ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white ring-4 ring-orange-300/30"
                                  : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {isWinner ? "👑" : index + 1}
                        </div>
                      </div>

                      {/* Player Name */}
                      <div className="text-2xl font-bold text-white">
                        {playerName}
                        {isMe && (
                          <span className="ml-2 rounded-full bg-blue-500 px-3 py-1 text-sm font-semibold">
                            YOU
                          </span>
                        )}
                      </div>

                      {/* Word */}
                      <div className="flex items-center justify-center gap-3">
                        {isForfeited ? (
                          <>
                            <span className="text-3xl font-bold italic text-slate-500">
                              —
                            </span>
                            <span className="rounded-md bg-slate-700 px-3 py-1.5 text-sm font-bold text-slate-300 shadow-lg">
                              FORFEITED
                            </span>
                          </>
                        ) : (
                          <>
                            <span
                              className={`text-3xl font-bold tracking-[0.2em] ${
                                isInvalid
                                  ? "text-red-500 line-through decoration-4 decoration-red-600"
                                  : "text-slate-100"
                              }`}
                            >
                              {submission.word?.toUpperCase()}
                            </span>
                            {isInvalid && (
                              <span className="animate-pulse rounded-md bg-red-600 px-3 py-1.5 text-sm font-bold text-white shadow-lg">
                                ❌ INVALID
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <div
                          className={`text-4xl font-black ${
                            isForfeited || isInvalid
                              ? "text-slate-600"
                              : isWinner
                                ? "bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent"
                                : "text-slate-200"
                          }`}
                        >
                          {submission.score}
                        </div>
                        <div className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                          points
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Return Button with Animation */}
          <div className="flex justify-center pt-8">
            <button
              onClick={handleReturnHome}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 px-16 py-5 text-2xl font-bold text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:from-slate-600 hover:to-slate-700"
            >
              <span className="relative z-10">🏠 Return to Home</span>
              <div className="absolute inset-0 -z-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
