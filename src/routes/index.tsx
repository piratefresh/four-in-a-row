import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { HomeModeMenu } from "@/components/home/HomeModeMenu";
import { OnboardingSetupScreen } from "@/components/home/OnboardingSetupScreen";
import { OnlineRooms } from "@/components/rooms/OnlineRooms";
import { RoomDrawer } from "@/components/RoomDrawer";

type HomeSearch = {
  onboarding?: "bot";
  view?: "online";
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    onboarding: search.onboarding === "bot" ? "bot" : undefined,
    view: search.view === "online" ? "online" : undefined,
  }),
  component: App,
});

function App() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { data: session } = authClient.useSession();
  const convexAuthUser = useQuery(api.auth.getCurrentUser);
  const activeRoom = useQuery(api.rooms.getMyActiveRoom);
  const rooms = useQuery(api.rooms.listRooms);
  const stats = useQuery(api.stats.getAllTimeStats);
  const ensureSeedRooms = useMutation(api.rooms.ensureSeedRooms);
  const refreshOpenRooms = useMutation(api.rooms.refreshOpenRooms);
  const createRoom = useMutation(api.rooms.createRoom);
  const createTutorialBotRoom = useMutation(api.rooms.createTutorialBotRoom);
  const restartTutorialRoom = useMutation((api as any).rooms.restartTutorialRoom);
  const joinRoom = useMutation(api.rooms.joinRoom);
  const createGameForRoom = useMutation(api.games.createGameForRoom);
  const debugRejoinRoom = useMutation(api.rooms.debugRejoinRoom);
  const debugFillRoomWithBots = useMutation(api.rooms.debugFillRoomWithBots);
  const seededRef = useRef(false);
  const onboardingBotGameStartedRef = useRef(false);
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);
  const [isDevRejoining, setIsDevRejoining] = useState(false);
  const [isRefreshingRooms, setIsRefreshingRooms] = useState(false);
  const [isStartingOffline, setIsStartingOffline] = useState(false);
  const [isStartingTutorial, setIsStartingTutorial] = useState(false);
  const [onboardingSetupStage, setOnboardingSetupStage] = useState<
    "auth" | "room" | "bots" | "deal" | null
  >(null);
  const homeView = search.view === "online" ? "online" : "menu";
  const showOnboardingSetupScreen =
    search.onboarding === "bot" && onboardingSetupStage !== null;

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    void ensureSeedRooms({});
  }, [ensureSeedRooms]);

  useEffect(() => {
    if (homeView !== "menu") return;
    setSelectedRoomCode(null);
    setJoinMessage(null);
  }, [homeView]);

  useEffect(() => {
    if (search.onboarding === "bot") return;
    setOnboardingSetupStage(null);
  }, [search.onboarding]);

  const getDisplayName = () => {
    if (!session?.user) {
      void navigate({ to: "/login" });
      return null;
    }

    if (convexAuthUser === undefined) {
      setJoinMessage("Checking authentication, please try again in a moment.");
      return null;
    }

    if (!convexAuthUser) {
      setJoinMessage(
        "Convex auth is not ready. Please sign out and sign back in.",
      );
      return null;
    }

    return session.user.name?.trim() || session.user.email || "Player";
  };

  const handleOpenDrawer = (roomCode: string) => {
    if (!getDisplayName()) {
      return;
    }

    setSelectedRoomCode(roomCode);
  };

  const handleJoinSeat = async () => {
    if (!selectedRoomCode) return;

    const displayName = getDisplayName();
    if (!displayName) return;
    setJoiningRoomCode(selectedRoomCode);
    setJoinMessage(null);

    try {
      const result = await joinRoom({
        code: selectedRoomCode,
        name: displayName,
      });
      await navigate({ to: "/rooms/$code", params: { code: result.code } });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join room.";
      setJoinMessage(message);
    } finally {
      setJoiningRoomCode(null);
    }
  };

  const handleDevRejoin = async () => {
    if (!import.meta.env.DEV || !selectedRoomCode) return;

    const displayName = getDisplayName();
    if (!displayName) return;
    setIsDevRejoining(true);
    setJoinMessage(null);

    try {
      const result = await debugRejoinRoom({
        code: selectedRoomCode,
        name: displayName,
      });
      await navigate({ to: "/rooms/$code", params: { code: result.code } });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to rejoin room.";
      setJoinMessage(message);
    } finally {
      setIsDevRejoining(false);
    }
  };

  const startOfflineGame = useEffectEvent(async (options?: { onboarding?: boolean }) => {
    const displayName = getDisplayName();
    if (!displayName) return;

    const onboarding = options?.onboarding ?? false;
    setIsStartingOffline(true);
    setOnboardingSetupStage(onboarding ? "room" : null);
    setJoinMessage(onboarding ? "Setting up your starter bot table..." : null);

    try {
      const room = onboarding
        ? await createTutorialBotRoom({ name: displayName })
        : await createRoom({ name: displayName });

      setOnboardingSetupStage(onboarding ? "bots" : null);
      if (!onboarding) {
        await debugFillRoomWithBots({ code: room.code, count: 3 });
      }

      setOnboardingSetupStage(onboarding ? "deal" : null);
      await createGameForRoom({ roomId: room.roomId });
      await navigate(
        onboarding
          ? {
              to: "/rooms/$code",
              params: { code: room.code },
            }
          : { to: "/rooms/$code", params: { code: room.code } },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start an offline table.";
      setJoinMessage(message);
      setOnboardingSetupStage(null);
    } finally {
      setIsStartingOffline(false);
    }
  });

  useEffect(() => {
    if (search.onboarding !== "bot") return;
    if (onboardingBotGameStartedRef.current) return;
    if (!session?.user) return;

    if (activeRoom === undefined || convexAuthUser === undefined || !convexAuthUser) {
      setOnboardingSetupStage("auth");
      setJoinMessage("Finishing account setup...");
      return;
    }

    if (activeRoom?.code) {
      onboardingBotGameStartedRef.current = true;
      void navigate({
        to: "/rooms/$code",
        params: { code: activeRoom.code },
      });
      return;
    }

    setOnboardingSetupStage("room");
    onboardingBotGameStartedRef.current = true;
    void startOfflineGame({ onboarding: true });
  }, [
    activeRoom,
    convexAuthUser,
    navigate,
    search.onboarding,
    session?.user,
    startOfflineGame,
  ]);

  const handleRefreshRooms = async () => {
    setIsRefreshingRooms(true);
    setJoinMessage(null);

    try {
      const result = await refreshOpenRooms({ count: 1 });
      setJoinMessage(
        `Created ${result.created} fresh room code${result.created === 1 ? "" : "s"}${result.closed > 0 ? ` and retired ${result.closed} empty room${result.closed === 1 ? "" : "s"}` : ""}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to refresh rooms.";
      setJoinMessage(message);
    } finally {
      setIsRefreshingRooms(false);
    }
  };

  const handleSelectOnline = () => {
    setJoinMessage(null);
    startTransition(() => {
      void navigate({
        to: "/",
        search: { view: "online" },
      });
    });
  };

  const handleResumeRoom = async () => {
    if (!activeRoom?.code) return;
    await navigate({ to: "/rooms/$code", params: { code: activeRoom.code } });
  };

  const handleReplayTutorial = async () => {
    if (!activeRoom?.code || !activeRoom.tutorialId) return;
    setJoinMessage(null);
    await restartTutorialRoom({ code: activeRoom.code });
    await navigate({
      to: "/rooms/$code",
      params: { code: activeRoom.code },
      search: { tutorial: "restart" },
    });
  };

  const handlePlayTutorial = async () => {
    const displayName = getDisplayName();
    if (!displayName) return;

    setIsStartingTutorial(true);
    setJoinMessage(null);

    try {
      if (activeRoom?.code && activeRoom.tutorialId) {
        setJoinMessage("Resetting your tutorial table...");
        await restartTutorialRoom({ code: activeRoom.code });
        await navigate({
          to: "/rooms/$code",
          params: { code: activeRoom.code },
          search: { tutorial: "restart" },
        });
        return;
      }

      setJoinMessage("Setting up a fresh tutorial table...");
      const room = await createTutorialBotRoom({ name: displayName });
      await navigate({
        to: "/rooms/$code",
        params: { code: room.code },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start tutorial.";
      setJoinMessage(message);
    } finally {
      setIsStartingTutorial(false);
    }
  };

  return (
    <>
      {showOnboardingSetupScreen ? (
        <OnboardingSetupScreen stage={onboardingSetupStage} />
      ) : homeView === "menu" ? (
        <HomeModeMenu
          activeRoomCode={activeRoom?.code}
          activeRoomTutorialId={activeRoom?.tutorialId}
          isStartingOffline={isStartingOffline}
          isStartingTutorial={isStartingTutorial}
          statusMessage={joinMessage}
          onSelectOnline={handleSelectOnline}
          onStartOffline={() => {
            void startOfflineGame();
          }}
          onPlayTutorial={() => {
            void handlePlayTutorial();
          }}
          onResumeRoom={() => {
            void handleResumeRoom();
          }}
          onReplayTutorial={() => {
            void handleReplayTutorial();
          }}
        />
      ) : (
        <OnlineRooms
          activeRoomCode={activeRoom?.code}
          activeRoomTutorialId={activeRoom?.tutorialId}
          joinMessage={joinMessage}
          joiningRoomCode={joiningRoomCode}
          isRefreshingRooms={isRefreshingRooms}
          rooms={rooms}
          stats={stats}
          onOpenRoom={handleOpenDrawer}
          onRefreshRooms={() => {
            void handleRefreshRooms();
          }}
          onResumeRoom={() => {
            void handleResumeRoom();
          }}
        />
      )}

      <RoomDrawer
        roomCode={selectedRoomCode}
        onClose={() => setSelectedRoomCode(null)}
        onJoinSeat={handleJoinSeat}
        isJoining={joiningRoomCode !== null}
        onDevRejoin={handleDevRejoin}
        isDevRejoining={isDevRejoining}
        showDevTools={import.meta.env.DEV}
      />
    </>
  );
}
