import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useBalanceDelta } from "@/components/wallet/useBalanceDelta";
import type { Id } from "../../convex/_generated/dataModel";
import { useMemberLookup } from "@/components/rooms/hooks/useMemberLookup";
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
  const tutorialRewardStatus = useQuery(
    api.tutorialReward.getTutorialRewardStatus,
    session?.user ? {} : "skip",
  );
  // Best-effort toast for tutorial completion reward (STO-239).
  // (Gameplay reward + achievement toasts are handled globally by
  // AchievementToastListener in __root.tsx \u2014 no per-page logic needed.)
  const tutorialToastShownRef = useRef(false);
  useEffect(() => {
    if (!session?.user) return;
    if (tutorialRewardStatus === undefined) return;
    if (tutorialToastShownRef.current) return;
    if (!tutorialRewardStatus.hasReceived) return;
    if (roomData?.room.tutorialId !== "first-bot-game") return;
    tutorialToastShownRef.current = true;
    toast.success("+100 coins for completing the tutorial! \uD83C\uDF81");
  }, [session?.user, tutorialRewardStatus, roomData?.room.tutorialId]);

  const walletBalance = useQuery(
    api.wallet.getMyBalance,
    session?.user ? {} : "skip",
  );
  const coinBalance = walletBalance?.balance ?? null;
  const { delta, settleId } = useBalanceDelta(coinBalance);
  const {
    memberById,
    myPlayer,
    getPlayerName: lookupPlayerName,
    getPlayerAvatar: lookupPlayerAvatar,
  } = useMemberLookup(roomData?.members, {
    sessionUserId: session?.user?.id,
    viewerPlayerId: roomData?.viewerPlayerId ?? undefined,
  });

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
  // Layer the snapshot results map on top of the shared lookup for
  // results that may have been captured before the latest member update.
  const getPlayerName = (id: string) =>
    resultMembersById.get(id)?.name ?? lookupPlayerName(id);
  const getPlayerAvatar = (id: string) =>
    resultMembersById.get(id)?.image ?? lookupPlayerAvatar(id);

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
      showFeedback={Boolean(session?.user)}
      feedbackRoutePath={`/results/${code}`}
      feedbackRoomId={roomData.room._id}
      feedbackGameId={resultsGame._id}
      coinBalance={coinBalance}
      delta={delta}
      settleId={settleId}
      roomCode={code.toUpperCase()}
    />
  );
}
