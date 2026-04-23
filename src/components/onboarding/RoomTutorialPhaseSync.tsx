import { useEffect } from "react";
import { useNextStep } from "nextstepjs";
import {
  FIRST_BOT_GAME_PAUSEABLE_STEPS,
  FIRST_BOT_GAME_SHOWDOWN_STEP,
  FIRST_BOT_GAME_SHOWDOWN_WAIT_STEP,
  FIRST_BOT_GAME_TOUR,
  FIRST_BOT_GAME_WORD_BUILDER_STEP,
  FIRST_BOT_GAME_WORD_BUILDER_WAIT_STEP,
  getTourPausedStepStorageKey,
} from "./wordPokerTours";

type RoomTutorialPhaseSyncProps = {
  gameStage: "preflop" | "flop" | "turn" | "river" | "final" | "showdown";
  roomCode: string;
};

export function RoomTutorialPhaseSync({
  gameStage,
  roomCode,
}: RoomTutorialPhaseSyncProps) {
  const flopRevealed = gameStage === "flop";
  const {
    currentStep,
    currentTour,
    isNextStepVisible,
    setCurrentStep,
    startNextStep,
  } = useNextStep();

  useEffect(() => {
    const pausedStepKey = getTourPausedStepStorageKey(FIRST_BOT_GAME_TOUR, roomCode);
    const pausedStepValue =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(pausedStepKey);
    const pausedStep =
      pausedStepValue === null ? null : Number(pausedStepValue);

    if (
      pausedStep === FIRST_BOT_GAME_WORD_BUILDER_WAIT_STEP &&
      flopRevealed
    ) {
      window.localStorage.removeItem(pausedStepKey);
      startNextStep(FIRST_BOT_GAME_TOUR);
      setCurrentStep(FIRST_BOT_GAME_PAUSEABLE_STEPS[pausedStep], 50);
      return;
    }

    if (
      pausedStep === FIRST_BOT_GAME_SHOWDOWN_WAIT_STEP &&
      gameStage === "showdown"
    ) {
      window.localStorage.removeItem(pausedStepKey);
      startNextStep(FIRST_BOT_GAME_TOUR);
      setCurrentStep(FIRST_BOT_GAME_PAUSEABLE_STEPS[pausedStep], 50);
      return;
    }

    if (!isNextStepVisible || currentTour !== FIRST_BOT_GAME_TOUR) {
      return;
    }

    if (
      currentStep === FIRST_BOT_GAME_WORD_BUILDER_WAIT_STEP &&
      flopRevealed
    ) {
      setCurrentStep(FIRST_BOT_GAME_WORD_BUILDER_STEP, 250);
      return;
    }

    if (
      currentStep === FIRST_BOT_GAME_SHOWDOWN_WAIT_STEP &&
      gameStage === "showdown"
    ) {
      setCurrentStep(FIRST_BOT_GAME_SHOWDOWN_STEP, 250);
    }
  }, [
    currentStep,
    currentTour,
    flopRevealed,
    gameStage,
    isNextStepVisible,
    roomCode,
    setCurrentStep,
    startNextStep,
  ]);

  return null;
}
