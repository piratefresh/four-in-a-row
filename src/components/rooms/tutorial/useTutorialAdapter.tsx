import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useNextStep } from "nextstepjs";
import { RoomTutorialLauncher } from "@/components/onboarding/RoomTutorialLauncher";
import { RoomTutorialPhaseSync } from "@/components/onboarding/RoomTutorialPhaseSync";
import {
  FIRST_BOT_GAME_SHUFFLE_STEP,
  FIRST_BOT_GAME_TOUR,
  FIRST_BOT_GAME_WORD_BUILDER_STEP,
  TUTORIAL_TARGET_WORD,
  getRoomCodeFromPathname,
  getTourPausedStepStorageKey,
  getTourStepStorageKey,
} from "@/components/onboarding/wordPokerTours";
import { getTutorialGuestId } from "@/lib/tutorial-guest";
import { api } from "../../../../convex/_generated/api";
import { type TutorialAdapter, NOOP_TUTORIAL_ADAPTER } from "./TutorialAdapter";

type RoomTutorialPhaseSyncProps = {
  gameStage: "preflop" | "flop" | "turn" | "river" | "final" | "showdown";
  roomCode: string;
  tutorialName: string | null;
  isTutorialBettingPaused: boolean;
};

export function useTutorialAdapter(
  code: string,
  tutorialId: string | null | undefined,
  gameStage: string | undefined,
  gameTurnStartedAt: number | undefined,
  forcedReplay: boolean,
): TutorialAdapter {
  const isTutorialRoom = tutorialId === FIRST_BOT_GAME_TOUR;

  const navigate = useNavigate();
  const {
    closeNextStep,
    currentStep,
    currentTour,
    setCurrentStep,
    startNextStep,
  } = useNextStep();

  const [isRestartingTutorial, setIsRestartingTutorial] = useState(false);
  const [tutorialGuestAuthUserId] = useState(() => getTutorialGuestId());
  const restartTutorialRoom = useMutation(api.rooms.restartTutorialRoom);

  if (!isTutorialRoom) {
    return NOOP_TUTORIAL_ADAPTER;
  }

  const isTutorialBettingPaused =
    gameStage !== "showdown" &&
    gameStage !== "final" &&
    gameTurnStartedAt === undefined;

  const onReadyClick = () => {
    if (currentTour === FIRST_BOT_GAME_TOUR && currentStep === 0) {
      if (typeof window !== "undefined") {
        const roomCode = getRoomCodeFromPathname(window.location.pathname);
        const pausedStepKey = getTourPausedStepStorageKey(
          FIRST_BOT_GAME_TOUR,
          roomCode,
        );
        window.localStorage.setItem(pausedStepKey, "0");
      }
      closeNextStep();
    }
  };

  const onBettingAction = () => {
    if (currentTour === FIRST_BOT_GAME_TOUR && currentStep === 1) {
      setCurrentStep(2, 50);
    }
  };

  const onMyTurn = () => {
    if (typeof window === "undefined") return;
    const roomCode = getRoomCodeFromPathname(window.location.pathname);
    const pausedStepKey = getTourPausedStepStorageKey(
      FIRST_BOT_GAME_TOUR,
      roomCode,
    );
    if (window.localStorage.getItem(pausedStepKey) !== "0") return;
    window.localStorage.removeItem(pausedStepKey);
    startNextStep(FIRST_BOT_GAME_TOUR);
    setCurrentStep(1, 50);
  };

  const onShuffleTiles = () => {
    if (
      currentTour === FIRST_BOT_GAME_TOUR &&
      currentStep === FIRST_BOT_GAME_SHUFFLE_STEP
    ) {
      if (typeof window !== "undefined") {
        const roomCode = getRoomCodeFromPathname(window.location.pathname);
        const stepKey = getTourStepStorageKey(
          FIRST_BOT_GAME_TOUR,
          "shuffle",
          roomCode,
        );
        window.localStorage.setItem(stepKey, "true");
      }
      setCurrentStep(FIRST_BOT_GAME_WORD_BUILDER_STEP, 50);
    }
  };

  const onWordBuilt = (builtWord: string) => {
    if (
      currentTour !== FIRST_BOT_GAME_TOUR ||
      currentStep !== FIRST_BOT_GAME_WORD_BUILDER_STEP ||
      builtWord !== TUTORIAL_TARGET_WORD
    ) {
      return;
    }
    setCurrentStep(FIRST_BOT_GAME_WORD_BUILDER_STEP + 1, 50);
  };

  const launcher: ReactNode = (
    <RoomTutorialLauncher
      tutorialName={isTutorialRoom ? FIRST_BOT_GAME_TOUR : null}
      roomCode={code}
      forceStart={forcedReplay}
    />
  );

  const phaseSync: ReactNode = (
    <RoomTutorialPhaseSync
      gameStage={
        (gameStage as RoomTutorialPhaseSyncProps["gameStage"]) ?? "preflop"
      }
      roomCode={code}
      tutorialName={isTutorialRoom ? FIRST_BOT_GAME_TOUR : null}
      isTutorialBettingPaused={isTutorialBettingPaused}
    />
  );

  const replayButton: ReactNode = (
    <button
      type="button"
      onClick={() => {
        if (isRestartingTutorial) return;
        void (async () => {
          setIsRestartingTutorial(true);
          try {
            await restartTutorialRoom({
              code,
              guestAuthUserId: tutorialGuestAuthUserId ?? undefined,
            });
            await navigate({
              to: "/rooms/$code",
              params: { code },
              search: { tutorial: "restart" },
            });
          } finally {
            setIsRestartingTutorial(false);
          }
        })();
      }}
      disabled={isRestartingTutorial}
      className="rounded-full border border-[#d7b45e]/30 bg-[#120f07]/90 px-4 py-2 text-sm font-medium text-[#f4d99d] shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur transition-colors hover:border-[#d7b45e]/55 hover:text-[#fff0cb]"
    >
      {isRestartingTutorial ? "Resetting tutorial..." : "Replay tutorial"}
    </button>
  );

  return {
    onReadyClick,
    onBettingAction,
    onMyTurn,
    onShuffleTiles,
    onWordBuilt,
    isTutorialRoom: true,
    isTutorialBettingPaused,
    launcher,
    phaseSync,
    replayButton,
  };
}
