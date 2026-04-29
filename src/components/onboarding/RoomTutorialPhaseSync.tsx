import { useEffect } from "react";
import { useNextStep } from "nextstepjs";
import {
  FIRST_BOT_GAME_PAUSEABLE_STEPS,
  FIRST_BOT_GAME_SHUFFLE_STEP,
  FIRST_BOT_GAME_SHOWDOWN_STEP,
  FIRST_BOT_GAME_SHOWDOWN_WAIT_STEP,
  FIRST_BOT_GAME_TOUR,
  FIRST_BOT_GAME_WORD_BUILDER_STEP,
  FIRST_BOT_GAME_WORD_BUILDER_WAIT_STEP,
  getTourCompletionStorageKey,
  getTourPausedStepStorageKey,
  getTourStepStorageKey,
} from "./wordPokerTours";

type RoomTutorialPhaseSyncProps = {
  gameStage: "preflop" | "flop" | "turn" | "river" | "final" | "showdown";
  roomCode: string;
  tutorialName: string | null;
  isTutorialBettingPaused: boolean;
};

export function RoomTutorialPhaseSync({
  gameStage,
  roomCode,
  tutorialName,
}: RoomTutorialPhaseSyncProps) {
  const wordBuilderReady =
    gameStage === "turn" ||
    gameStage === "river" ||
    gameStage === "final" ||
    gameStage === "showdown";
  const {
    currentStep,
    currentTour,
    isNextStepVisible,
    setCurrentStep,
    startNextStep,
  } = useNextStep();

  useEffect(() => {
    if (tutorialName !== FIRST_BOT_GAME_TOUR || typeof window === "undefined") {
      return;
    }

    const pausedStepKey = getTourPausedStepStorageKey(
      FIRST_BOT_GAME_TOUR,
      roomCode,
    );
    const completionKey = getTourCompletionStorageKey(
      FIRST_BOT_GAME_TOUR,
      roomCode,
    );
    const pausedStepValue = window.localStorage.getItem(pausedStepKey);
    const pausedStep =
      pausedStepValue === null ? null : Number(pausedStepValue);
    const hasCompletedTour =
      window.localStorage.getItem(completionKey) === "true";
    if (hasCompletedTour) {
      return;
    }

    const shuffleStepKey = getTourStepStorageKey(
      FIRST_BOT_GAME_TOUR,
      "shuffle",
      roomCode,
    );
    const hasCompletedShuffleStep =
      window.localStorage.getItem(shuffleStepKey) === "true";
    const isBeforeWordBuilderGate =
      currentStep <= FIRST_BOT_GAME_WORD_BUILDER_WAIT_STEP;
    const openFirstBotStep = (step: number, delay = 50) => {
      startNextStep(FIRST_BOT_GAME_TOUR);
      window.setTimeout(() => {
        setCurrentStep(step, 0);
      }, delay);
    };

    if (
      pausedStep === FIRST_BOT_GAME_WORD_BUILDER_WAIT_STEP &&
      wordBuilderReady
    ) {
      window.localStorage.removeItem(pausedStepKey);
      openFirstBotStep(
        hasCompletedShuffleStep
          ? FIRST_BOT_GAME_WORD_BUILDER_STEP
          : FIRST_BOT_GAME_PAUSEABLE_STEPS[pausedStep],
      );
      return;
    }

    if (
      pausedStep === FIRST_BOT_GAME_SHOWDOWN_WAIT_STEP &&
      gameStage === "showdown"
    ) {
      window.localStorage.removeItem(pausedStepKey);
      openFirstBotStep(FIRST_BOT_GAME_PAUSEABLE_STEPS[pausedStep]);
      return;
    }

    if (
      pausedStep === null &&
      isBeforeWordBuilderGate &&
      !isNextStepVisible &&
      wordBuilderReady
    ) {
      openFirstBotStep(
        hasCompletedShuffleStep
          ? FIRST_BOT_GAME_WORD_BUILDER_STEP
          : FIRST_BOT_GAME_SHUFFLE_STEP,
      );
      return;
    }

    if (!isNextStepVisible || currentTour !== FIRST_BOT_GAME_TOUR) {
      return;
    }

    if (
      currentStep === FIRST_BOT_GAME_WORD_BUILDER_WAIT_STEP &&
      wordBuilderReady
    ) {
      window.setTimeout(() => {
        setCurrentStep(
          hasCompletedShuffleStep
            ? FIRST_BOT_GAME_WORD_BUILDER_STEP
            : FIRST_BOT_GAME_SHUFFLE_STEP,
          0,
        );
      }, 50);
      return;
    }

    if (
      currentStep === FIRST_BOT_GAME_SHOWDOWN_WAIT_STEP &&
      gameStage === "showdown"
    ) {
      window.setTimeout(() => {
        setCurrentStep(FIRST_BOT_GAME_SHOWDOWN_STEP, 0);
      }, 50);
    }
  }, [
    currentStep,
    currentTour,
    gameStage,
    isNextStepVisible,
    roomCode,
    setCurrentStep,
    startNextStep,
    tutorialName,
    wordBuilderReady,
  ]);

  return null;
}
