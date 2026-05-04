import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import {
  describeTutorialGuestIdForDebug,
  getTutorialGuestId,
  logTutorialDebug,
} from "@/lib/tutorial-guest";
import { HomeModeMenu } from "@/components/home/HomeModeMenu";
import { OnboardingSetupScreen } from "@/components/home/OnboardingSetupScreen";
import { SplashScreen } from "@/components/home/SplashScreen";
import {
  LoadingOverlay,
  WORD_POKER_LOADING_TIPS,
} from "@/components/ui/loading-overlay";

type HomeSearch = {
  onboarding?: "bot";
};

type OfflineDifficulty = "easy" | "medium" | "hard";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    onboarding: search.onboarding === "bot" ? "bot" : undefined,
  }),
  component: App,
});

function App() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { data: session } = authClient.useSession();
  const convexAuthUser = useQuery(api.auth.getCurrentUser);
  const activeRoom = useQuery(api.rooms.getMyActiveRoom);
  const createRoom = useMutation(api.rooms.createRoom);
  const createTutorialBotRoom = useMutation(
    api.rooms.createTutorialBotRoom,
  );
  const createGameForRoom = useMutation(api.games.createGameForRoom);
  const debugFillRoomWithBots = useMutation(api.rooms.debugFillRoomWithBots);
  const onboardingBotGameStartedRef = useRef(false);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [isStartingOffline, setIsStartingOffline] = useState(false);
  const [isStartingTutorial, setIsStartingTutorial] = useState(false);
  const [offlineDifficulty, setOfflineDifficulty] = useState<OfflineDifficulty>("medium");
  const [onboardingSetupStage, setOnboardingSetupStage] = useState<
    "auth" | "room" | "bots" | "deal" | null
  >(null);
  const [showSplash, setShowSplash] = useState(true);
  const showOnboardingSetupScreen =
    search.onboarding === "bot" && onboardingSetupStage !== null;

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

  const getTutorialDisplayName = () => {
    return session?.user?.name?.trim() || session?.user?.email || "Guest";
  };

  const startOfflineGame = useEffectEvent(async (options?: {
    onboarding?: boolean;
    difficulty?: OfflineDifficulty;
  }) => {
    const displayName = getDisplayName();
    if (!displayName) return;

    const onboarding = options?.onboarding ?? false;
    const difficulty = options?.difficulty ?? offlineDifficulty;
    setIsStartingOffline(true);
    setOnboardingSetupStage(onboarding ? "room" : null);
    setJoinMessage(onboarding ? "Setting up your starter bot table..." : null);

    try {
      const room = onboarding
        ? await createTutorialBotRoom({ name: displayName })
        : await createRoom({ name: displayName, difficulty, isBotGame: true });

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

  const handleSelectOnline = () => {
    setJoinMessage(null);
    startTransition(() => {
      void navigate({
        to: "/rooms",
      });
    });
  };

  const handleSelectRiverRun = () => {
    setJoinMessage(null);
    startTransition(() => {
      void navigate({
        to: "/river-run",
      });
    });
  };

  const handleResumeRoom = async () => {
    if (!activeRoom?.code) return;
    await navigate({ to: "/rooms/$code", params: { code: activeRoom.code } });
  };

  const handlePlayTutorial = async () => {
    const displayName = getTutorialDisplayName();
    const guestAuthUserId = session?.user
      ? undefined
      : (getTutorialGuestId() ?? undefined);
    logTutorialDebug("home:start-tutorial:clicked", {
      hasSessionUser: Boolean(session?.user),
      convexAuthUserState:
        convexAuthUser === undefined
          ? "loading"
          : convexAuthUser
            ? "ready"
            : "missing",
      guest: describeTutorialGuestIdForDebug(guestAuthUserId),
      displayName,
    });
    if (!session?.user && !guestAuthUserId) {
      setJoinMessage("Tutorial guest setup is unavailable in this browser.");
      logTutorialDebug("home:start-tutorial:no-guest-id");
      return;
    }

    setIsStartingTutorial(true);
    setJoinMessage(null);

    try {
      setJoinMessage("Setting up a fresh tutorial table...");
      logTutorialDebug("home:start-tutorial:mutation:start", {
        guest: describeTutorialGuestIdForDebug(guestAuthUserId),
      });
      const room = await createTutorialBotRoom({ name: displayName, guestAuthUserId });
      logTutorialDebug("home:start-tutorial:mutation:success", {
        code: room.code,
        tutorialId: room.tutorialId,
        playerId: room.playerId,
      });
      await navigate({
        to: "/rooms/$code",
        params: { code: room.code },
        search: { tutorial: "intro" },
      });
      logTutorialDebug("home:start-tutorial:navigate:done", {
        code: room.code,
        search: "tutorial=intro",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start tutorial.";
      logTutorialDebug("home:start-tutorial:error", {
        message,
        error,
      });
      setJoinMessage(message);
    } finally {
      setIsStartingTutorial(false);
    }
  };

  const isSettingUpGame = isStartingOffline || isStartingTutorial;
  const isLoadingOverlayVisible = isSettingUpGame && !showOnboardingSetupScreen;

  const loadingOverlayMessage = isStartingOffline
    ? "Setting up table..."
    : isStartingTutorial
      ? "Setting up tutorial..."
      : "Loading...";

  return (
    <>
      {showSplash ? (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      ) : isLoadingOverlayVisible ? (
        <LoadingOverlay
          message={loadingOverlayMessage}
          subtitles={WORD_POKER_LOADING_TIPS}
        />
      ) : showOnboardingSetupScreen ? (
        <OnboardingSetupScreen stage={onboardingSetupStage} />
      ) : (
        <HomeModeMenu
          activeRoomCode={activeRoom?.code}
          activeRoomTutorialId={activeRoom?.tutorialId ?? null}
          isStartingOffline={isStartingOffline}
          isStartingTutorial={isStartingTutorial}
          offlineDifficulty={offlineDifficulty}
          statusMessage={joinMessage}
          onOfflineDifficultyChange={setOfflineDifficulty}
          onSelectOnline={handleSelectOnline}
          onSelectRiverRun={handleSelectRiverRun}
          onStartOffline={(difficulty) => {
            void startOfflineGame({ difficulty });
          }}
          onPlayTutorial={() => {
            void handlePlayTutorial();
          }}
          onResumeRoom={() => {
            void handleResumeRoom();
          }}
        />
      )}
    </>
  );
}
