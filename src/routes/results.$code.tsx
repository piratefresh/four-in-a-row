import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useRoomPresence } from "@/components/rooms/hooks/useRoomPresence";
import { ShowdownResultsScreen } from "@/components/rooms/results/ShowdownResultsScreen";
import { TutorialSignupWall } from "@/components/rooms/results/TutorialSignupWall";
import { authClient } from "@/lib/auth-client";
import { getTutorialGuestId } from "@/lib/tutorial-guest";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/results/$code")({
  validateSearch: (search: Record<string, unknown>) => ({
    gameId: typeof search.gameId === "string" ? search.gameId : undefined,
  }),
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
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const leaveRoom = useMutation(api.rooms.leaveRoom);
  const leaveRoomByCode = useMutation(api.rooms.leaveRoomByCode);
  const rejoinRoomByCode = useMutation(api.rooms.rejoinRoomByCode);
  const createRoom = useMutation(api.rooms.createRoom);
  const debugFillRoomWithBots = useMutation(api.rooms.debugFillRoomWithBots);
  const createGameForRoom = useMutation(api.games.createGameForRoom);
  const redealGameForRoom = useMutation(api.games.redealGameForRoom);
  const toggleReady = useMutation(api.rooms.toggleReady);
  const [isStartingNewGame, setIsStartingNewGame] = useState(false);
  const [isStartingPlayAgain, setIsStartingPlayAgain] = useState(false);
  const [showTutorialSignupWall, setShowTutorialSignupWall] = useState(false);
  const [tutorialGuestAuthUserId] = useState(() => getTutorialGuestId());
  const [resultMembersById, setResultMembersById] = useState<
    Map<string, { name: string; image: string | null }>
  >(() => new Map());
  const [resultPlayerId, setResultPlayerId] = useState<string | null>(null);
  const autoLeftResultKeyRef = useRef<string | null>(null);

  const COUNTDOWN_SECONDS = 60;
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      void handleReturnToOnlineRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const roomData = useQuery(api.rooms.getRoomMembers, {
    code,
    guestAuthUserId: session?.user
      ? undefined
      : (tutorialGuestAuthUserId ?? undefined),
  });
  const game = useQuery(api.games.getGameByRoom, {
    roomId: roomData?.room._id ?? "",
  });
  const anchoredGame = useQuery(
    api.games.getGameById,
    search.gameId
      ? { gameId: search.gameId as Id<"games"> }
      : "skip",
  );
  const resultsGame = search.gameId ? anchoredGame : game;
  const showdownResults = useQuery(
    api.games.getShowdownResults,
    resultsGame ? { gameId: resultsGame._id } : "skip",
  );

  const memberById = useMemo(
    () =>
      new Map(
        (roomData?.members ?? []).map((member) => [String(member._id), member]),
      ),
    [roomData?.members],
  );

  useEffect(() => {
    if (!roomData?.members?.length) return;
    setResultMembersById((current) => {
      const next = new Map(current);
      for (const member of roomData.members) {
        next.set(String(member._id), {
          name: member.name,
          image: member.image ?? null,
        });
      }
      return next;
    });
  }, [roomData?.members]);

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

  useEffect(() => {
    if (myPlayer?._id) {
      setResultPlayerId(String(myPlayer._id));
    }
  }, [myPlayer?._id]);

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
  const isGuestTutorialGame =
    !session?.user && roomData?.room.tutorialId === "first-bot-game";

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
      const room = await createRoom({ name: displayName, isBotGame: true });
      await debugFillRoomWithBots({ code: room.code, count: 3 });
      await createGameForRoom({ roomId: room.roomId });
      await navigate({ to: "/rooms/$code", params: { code: room.code } });
    } catch (error) {
      console.error("Error starting new offline game:", error);
    } finally {
      setIsStartingNewGame(false);
    }
  };

  const handlePlayAgainOnline = async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);

    setIsStartingPlayAgain(true);

    try {
      const displayName =
        session?.user?.name?.trim() || session?.user?.email || "Player";
      await rejoinRoomByCode({ code, name: displayName });
      const result = await redealGameForRoom({ roomId: roomData?.room._id ?? "" });
      if (!result.ok) {
        console.error("Failed to redeal:", result.reason);
        return;
      }
      await toggleReady({
        code,
        guestAuthUserId:
          isGuestTutorialGame && !session?.user
            ? (tutorialGuestAuthUserId ?? undefined)
            : undefined,
      });
      await navigate({ to: "/rooms/$code", params: { code } });
    } catch (error) {
      console.error("Error playing again:", error);
    } finally {
      setIsStartingPlayAgain(false);
    }
  };

  const handleReturnToOnlineRooms = async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    try {
      await leaveRoom({});
    } catch (error) {
      console.error("Error leaving room:", error);
    }
    void navigate({ to: "/rooms" });
  };

  const handleReturnToMainMenu = async () => {
    if (isGuestTutorialGame && !showTutorialSignupWall) {
      setShowTutorialSignupWall(true);
      return;
    }

    if (!session?.user) {
      void navigate({ to: "/" });
      return;
    }

    try {
      await leaveRoom({});
    } catch (error) {
      console.error("Error leaving room:", error);
    }
    void navigate({ to: "/" });
  };

  useEffect(() => {
    if (!search.gameId || !roomData?.room || !myPlayer || showdownResults === undefined) {
      return;
    }

    const resultKey = `${code}:${search.gameId}`;
    if (autoLeftResultKeyRef.current === resultKey) return;
    autoLeftResultKeyRef.current = resultKey;

    void leaveRoomByCode({ code }).catch((error) => {
      console.error("Error leaving room on results page:", error);
    });
  }, [code, leaveRoomByCode, myPlayer, roomData?.room, search.gameId, showdownResults]);

  useRoomPresence(code, false);

  const shouldReturnToRoom =
    !search.gameId &&
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

  if (!roomData || !resultsGame || showdownResults === undefined) {
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

  const currentPlayerId = resultPlayerId ?? (myPlayer ? String(myPlayer._id) : null);
  const getPlayerName = (id: string) =>
    resultMembersById.get(id)?.name ?? memberById.get(id)?.name ?? "Player";
  const getPlayerAvatar = (id: string) =>
    resultMembersById.get(id)?.image ?? memberById.get(id)?.image ?? null;

  if (showTutorialSignupWall) {
    return (
      <TutorialSignupWall
        onCreateAccount={() => {
          void navigate({ to: "/register" });
        }}
        onContinueGuest={() => {
          void handleReturnToMainMenu();
        }}
      />
    );
  }

  return (
    <ShowdownResultsScreen
      pot={resultsGame.pot}
      playerId={currentPlayerId}
      showdownResults={showdownResults}
      getPlayerName={getPlayerName}
      getPlayerAvatar={getPlayerAvatar}
      onReturnToOnlineRooms={handleReturnToOnlineRooms}
      onReturnToMainMenu={handleReturnToMainMenu}
      isOfflineGame={isOfflineGame}
      isGuestTutorialGame={isGuestTutorialGame}
      onPlayAnotherOffline={handlePlayAnotherOffline}
      isStartingNewGame={isStartingNewGame}
      onPlayAgainOnline={handlePlayAgainOnline}
      isStartingPlayAgain={isStartingPlayAgain}
      countdown={countdown}
    />
  );
}
