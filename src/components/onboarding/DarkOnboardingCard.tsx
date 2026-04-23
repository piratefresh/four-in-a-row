import React, { useState } from "react";
import { useMutation } from "convex/react";
import { Step, useNextStep } from "nextstepjs";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  FIRST_BOT_GAME_PAUSEABLE_STEPS,
  FIRST_BOT_GAME_SHOWDOWN_WAIT_STEP,
  FIRST_BOT_GAME_SHOWDOWN_SUBMIT_STEP,
  FIRST_BOT_GAME_TOUR,
  FIRST_BOT_GAME_WORD_BUILDER_STEP,
  getTourCompletionStorageKey,
  getRoomCodeFromPathname,
  getTourPausedStepStorageKey,
} from "./wordPokerTours";

type TutorialCardStep = Step & {
  cardClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
  iconClassName?: string;
  progressClassName?: string;
  controlsClassName?: string;
  hideNext?: boolean;
};

interface DarkOnboardingCardProps {
  step: Step;
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  skipTour?: () => void;
  arrow: React.ReactNode;
}

const DarkOnboardingCard = ({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: DarkOnboardingCardProps) => {
  const tutorialStep = step as TutorialCardStep;
  const { closeNextStep, currentTour } = useNextStep();
  const resumeTutorialBetting = useMutation(
    (api as any).rooms.resumeTutorialBetting,
  );
  const startTutorialShowdown = useMutation(
    (api as any).rooms.startTutorialShowdown,
  );
  const [isStartingShowdown, setIsStartingShowdown] = useState(false);
  const isPauseableStep =
    FIRST_BOT_GAME_PAUSEABLE_STEPS[currentStep] !== undefined;
  const isTutorialShowdownSubmitStep =
    currentTour === FIRST_BOT_GAME_TOUR &&
    currentStep === FIRST_BOT_GAME_SHOWDOWN_SUBMIT_STEP;
  const themedArrow = React.isValidElement<{ className?: string }>(arrow)
    ? React.cloneElement(arrow, {
        className: `${arrow.props.className ?? ""} text-white fill-white stroke-white`,
      })
    : arrow;
  const showControls = step.showControls !== false;
  const hideNext = tutorialStep.hideNext === true;
  const shouldResumeTutorialBettingOnClose =
    currentTour === FIRST_BOT_GAME_TOUR &&
    currentStep >= FIRST_BOT_GAME_WORD_BUILDER_STEP &&
    currentStep <= FIRST_BOT_GAME_SHOWDOWN_WAIT_STEP;

  const resumeTutorialBettingIfNeeded = async () => {
    if (
      typeof window === "undefined" ||
      !shouldResumeTutorialBettingOnClose ||
      isStartingShowdown
    ) {
      return;
    }

    const roomCode = getRoomCodeFromPathname(window.location.pathname);
    if (!roomCode) {
      return;
    }

    try {
      await resumeTutorialBetting({ code: roomCode });
    } catch (error) {
      console.error("Failed to resume tutorial betting:", error);
    }
  };

  const handlePauseUntilNextPhase = async () => {
    const roomCode =
      typeof window === "undefined"
        ? null
        : getRoomCodeFromPathname(window.location.pathname);

    if (typeof window !== "undefined" && currentTour) {
      const pausedStepKey = getTourPausedStepStorageKey(currentTour, roomCode);
      window.localStorage.setItem(pausedStepKey, String(currentStep));
    }

    if (currentStep === FIRST_BOT_GAME_SHOWDOWN_WAIT_STEP && roomCode) {
      await resumeTutorialBettingIfNeeded();
    }

    closeNextStep();
  };

  const handleStartTutorialShowdown = async () => {
    if (typeof window === "undefined" || !currentTour || isStartingShowdown) {
      return;
    }

    const roomCode = getRoomCodeFromPathname(window.location.pathname);
    if (!roomCode) {
      return;
    }

    setIsStartingShowdown(true);
    try {
      await startTutorialShowdown({ code: roomCode });
      const pausedStepKey = getTourPausedStepStorageKey(currentTour, roomCode);
      const completionKey = getTourCompletionStorageKey(currentTour, roomCode);
      window.localStorage.removeItem(pausedStepKey);
      window.localStorage.setItem(completionKey, "true");
      closeNextStep();
    } catch (error) {
      console.error("Failed to start tutorial showdown:", error);
    } finally {
      setIsStartingShowdown(false);
    }
  };

  const handleSkipTour = async () => {
    await resumeTutorialBettingIfNeeded();
    skipTour?.();
  };

  return (
    <div
      className={cn(
        "w-full min-w-64 max-w-[min(32rem,calc(100vw-1rem))] rounded-lg bg-white p-4 text-slate-900 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)]",
        tutorialStep.cardClassName,
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        {step.icon && (
          <div
            className={cn(
              "shrink-0 text-2xl leading-none text-slate-700",
              tutorialStep.iconClassName,
            )}
          >
            {step.icon}
          </div>
        )}
        <h3
          className={cn(
            "min-w-0 flex-1 text-lg font-bold leading-tight text-slate-900",
            tutorialStep.titleClassName,
          )}
        >
          {step.title}
        </h3>
      </div>

      <div
        className={cn(
          "mb-4 text-sm leading-relaxed text-slate-900",
          tutorialStep.contentClassName,
        )}
      >
        {step.content}
      </div>

      <div className="mb-4 h-2.5 rounded-full bg-slate-200">
        <div
          className={cn(
            "h-2.5 rounded-full bg-blue-600 transition-[width]",
            tutorialStep.progressClassName,
          )}
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <div
        className={cn(
          "flex items-center justify-between gap-4 text-xs text-slate-500",
          tutorialStep.controlsClassName,
        )}
      >
        {showControls ? (
          currentStep > 0 ? (
            <button
              onClick={prevStep}
              className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
            >
              Previous
            </button>
          ) : (
            <div className="h-9 min-w-[88px]" />
          )
        ) : (
          <div className="h-9 min-w-[88px]" />
        )}

        <span className="whitespace-nowrap text-xs text-slate-500">
          {currentStep + 1} of {totalSteps}
        </span>

        {showControls ? (
          isPauseableStep ? (
            <button
              onClick={() => {
                void handlePauseUntilNextPhase();
              }}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Continue playing
            </button>
          ) : isTutorialShowdownSubmitStep ? (
            <button
              onClick={() => {
                void handleStartTutorialShowdown();
              }}
              disabled={isStartingShowdown}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-default disabled:opacity-70"
            >
              {isStartingShowdown ? "Starting..." : "Start timer"}
            </button>
          ) : hideNext ? (
            <div className="h-9 min-w-[88px]" />
          ) : (
            <button
              onClick={nextStep}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium text-white transition-colors",
                currentStep === totalSteps - 1
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-blue-600 hover:bg-blue-700",
              )}
            >
              {currentStep === totalSteps - 1 ? "Finish" : "Next"}
            </button>
          )
        ) : (
          <div className="h-9 min-w-[88px]" />
        )}
      </div>

      {themedArrow}

      {skipTour && currentStep < totalSteps - 1 && step.showSkip ? (
        <button
          onClick={() => {
            void handleSkipTour();
          }}
          className="mt-4 w-full rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
        >
          Skip Tour
        </button>
      ) : null}
    </div>
  );
};

export default DarkOnboardingCard;
