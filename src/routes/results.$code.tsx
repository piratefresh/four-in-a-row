import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { useRoomPresence } from "@/components/rooms/hooks/useRoomPresence";
import { ShowdownResultsScreen } from "@/components/rooms/results/ShowdownResultsScreen";
import { authClient } from "@/lib/auth-client";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/results/$code")({
  head: ({ params }) => {
    const roomCode = params.code.toUpperCase();
    const title = `Results for Room ${roomCode} | Word Poker`;
    const description = `Showdown results for Room ${roomCode} in Word Poker.`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: ResultsPage,
});

function ResultsPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const leaveRoom = useMutation(api.rooms.leaveRoom);
  const createRoom = useMutation(api.rooms.createRoom);
  const debugFillRoomWithBots = useMutation(api.rooms.debugFillRoomWithBots);
  const createGameForRoom = useMutation(api.games.createGameForRoom);
  const [isStartingNewGame, setIsStartingNewGame] = useState(false);

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

  // Detect if this is an offline game (all other players are bots)
  const isOfflineGame = useMemo(() => {
    if (!roomData?.members) return false;
    const otherPlayers = roomData.members.filter(
      (member) => member._id !== myPlayer?._id,
    );
    return (
      otherPlayers.length > 0 &&
      otherPlayers.every((member) => member.authUserId?.startsWith("dev-bot:"))
    );
  }, [roomData?.members, myPlayer]);

  const handlePlayAnotherOffline = async () => {
    const displayName =
      session?.user?.name?.trim() || session?.user?.email || null;
    if (!displayName) {
      await navigate({ to: "/login" });
      return;
    }

    setIsStartingNewGame(true);

    try {
      await leaveRoom({});
      const room = await createRoom({ name: displayName });
      await debugFillRoomWithBots({ code: room.code, count: 3 });
      await createGameForRoom({ roomId: room.roomId });
      await navigate({ to: "/rooms/$code", params: { code: room.code } });
    } catch (error) {
      console.error("Error starting new offline game:", error);
    } finally {
      setIsStartingNewGame(false);
    }
  };

  const handleReturnToOnlineRooms = async () => {
    try {
      await leaveRoom({});
    } catch (error) {
      console.error("Error leaving room:", error);
    }
    void navigate({ to: "/rooms" });
  };

  const handleReturnToMainMenu = async () => {
    try {
      await leaveRoom({});
    } catch (error) {
      console.error("Error leaving room:", error);
    }
    void navigate({ to: "/" });
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
      onReturnToOnlineRooms={handleReturnToOnlineRooms}
      onReturnToMainMenu={handleReturnToMainMenu}
      isOfflineGame={isOfflineGame}
      onPlayAnotherOffline={handlePlayAnotherOffline}
      isStartingNewGame={isStartingNewGame}
    />
  );
}
