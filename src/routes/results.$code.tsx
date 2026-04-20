import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { useRoomPresence } from "@/components/rooms/hooks/useRoomPresence";
import { ShowdownResultsScreen } from "@/components/rooms/results/ShowdownResultsScreen";
import { authClient } from "@/lib/auth-client";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/results/$code")({
  component: ResultsPage,
});

function ResultsPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const continueToNextRoom = useMutation(api.rooms.continueToNextRoom);
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

  const memberById = useMemo(
    () =>
      new Map(
        (roomData?.members ?? []).map((member) => [String(member._id), member]),
      ),
    [roomData?.members],
  );

  const myPlayer = useMemo(() => {
    if (!roomData?.members) return null;

    if (session?.user) {
      const authMatched =
        roomData.members.find((member) => member.authUserId === session.user.id) ??
        null;
      if (authMatched) return authMatched;
    }

    if (roomData.viewerPlayerId) {
      return (
        roomData.members.find((member) => member._id === roomData.viewerPlayerId) ??
        null
      );
    }

    return null;
  }, [roomData, session?.user]);

  const handleNextHand = async () => {
    if (isStartingNextHand) {
      return;
    }

    const displayName =
      session?.user?.name?.trim() || session?.user?.email || null;
    if (!displayName) {
      await navigate({ to: "/login" });
      return;
    }

    setIsStartingNextHand(true);
    setNextHandError(null);

    try {
      const newRoom = await continueToNextRoom({
        code,
        name: displayName,
      });
      await navigate({ to: "/rooms/$code", params: { code: newRoom.code } });
    } catch (error) {
      console.error("Error starting next hand room:", error);

      setNextHandError(
        error instanceof Error
          ? error.message
          : "Failed to create a new room.",
      );
    } finally {
      setIsStartingNextHand(false);
    }
  };

  useRoomPresence(code, Boolean(session?.user && roomData?.room && myPlayer));

  const shouldReturnToRoom =
    Boolean(roomData) &&
    (game?.status === "active" || game?.status === "waiting") &&
    showdownResults === null;

  useEffect(() => {
    if (!shouldReturnToRoom) {
      return;
    }

    void navigate({ to: "/rooms/$code", params: { code } });
  }, [code, navigate, shouldReturnToRoom]);

  if (shouldReturnToRoom) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#2d2d2d]">
        <p className="text-2xl text-white">Returning to room...</p>
      </div>
    );
  }

  if (!roomData || !game || showdownResults === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#2d2d2d]">
        <p className="text-2xl text-white">Loading results...</p>
      </div>
    );
  }

  if (showdownResults === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#2d2d2d]">
        <p className="text-2xl text-white">Results unavailable.</p>
      </div>
    );
  }

  const currentPlayerId = myPlayer ? String(myPlayer._id) : null;
  const getPlayerName = (id: string) => memberById.get(id)?.name ?? "Player";
  const getPlayerAvatar = (id: string) => memberById.get(id)?.image ?? null;

  return (
    <ShowdownResultsScreen
      pot={game.pot}
      playerId={currentPlayerId}
      showdownResults={showdownResults}
      getPlayerName={getPlayerName}
      getPlayerAvatar={getPlayerAvatar}
      onNextHand={handleNextHand}
      isStartingNextHand={isStartingNextHand}
      nextHandError={nextHandError}
    />
  );
}
