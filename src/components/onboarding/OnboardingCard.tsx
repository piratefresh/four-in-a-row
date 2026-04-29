import React, { useState } from "react";
import { useMutation } from "convex/react";
import { Step, useNextStep } from "nextstepjs";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  FIRST_BOT_GAME_PAUSEABLE_STEPS,
  FIRST_BOT_GAME_SHUFFLE_STEP,
  FIRST_BOT_GAME_SHOWDOWN_WAIT_STEP,
  FIRST_BOT_GAME_SHOWDOWN_SUBMIT_STEP,
  FIRST_BOT_GAME_TOUR,
  IN_GAME_HELPER_TOUR,
  getTourCompletionStorageKey,
  getRoomCodeFromPathname,
  getTourPausedStepStorageKey,
} from "./wordPokerTours";

type TutorialCardStep = Step & {
  tourKind?: "tutorial" | "helper";
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

export const OnboardingCard = ({
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
  const isHelperStep =
    tutorialStep.tourKind === "helper" || currentTour === IN_GAME_HELPER_TOUR;
  const isPauseableStep =
    !isHelperStep && FIRST_BOT_GAME_PAUSEABLE_STEPS[currentStep] !== undefined;
  const isTutorialShowdownSubmitStep =
    currentTour === FIRST_BOT_GAME_TOUR &&
    currentStep === FIRST_BOT_GAME_SHOWDOWN_SUBMIT_STEP;
  const themedArrow = React.isValidElement<{ className?: string }>(arrow)
    ? React.cloneElement(arrow, {
        className: cn(
          arrow.props.className,
          "text-cream fill-cream stroke-cream",
        ),
      })
    : arrow;
  const showControls = step.showControls !== false;
  const hideNext = tutorialStep.hideNext === true;
  const shouldResumeTutorialBettingOnClose =
    !isHelperStep &&
    currentTour === FIRST_BOT_GAME_TOUR &&
    currentStep >= FIRST_BOT_GAME_SHUFFLE_STEP &&
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

  const handleCloseHelper = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("word-poker:helper-dismiss", {
          detail: {
            tourName: currentTour,
            step: currentStep,
          },
        }),
      );
    }
    closeNextStep();
  };

  return (
    <div
      className={cn(
        "w-full min-w-64 max-w-[min(24rem,calc(100vw-1rem))] rounded-[10px] border-b-[3px] border-gold bg-cream px-3 py-2.5 font-body text-[11px] leading-[1.3] text-ink shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
        tutorialStep.cardClassName,
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-3 font-mono text-[8px] font-bold uppercase leading-none tracking-[0.2em] text-gold">
        <span>{isHelperStep ? "HELPER" : "COACH"}</span>
        {!isHelperStep ? (
          <span className="tracking-[0.12em] text-gold/75">
            {currentStep + 1}/{totalSteps}
          </span>
        ) : null}
      </div>

      <div className="mb-2 flex items-center gap-2">
        {step.icon && (
          <div
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-sm bg-gold font-mono text-[9px] font-bold leading-none text-felt-deep",
              tutorialStep.iconClassName,
            )}
          >
            {step.icon}
          </div>
        )}
        <h3
          className={cn(
            "min-w-0 flex-1 text-[11px] font-bold leading-[1.3] text-ink",
            tutorialStep.titleClassName,
          )}
        >
          {step.title}
        </h3>
      </div>

      <div
        className={cn(
          "mb-3 text-[11px] leading-[1.3] text-ink [&_strong]:font-bold [&_strong]:text-ink",
          tutorialStep.contentClassName,
        )}
      >
        {step.content}
      </div>

      {!isHelperStep ? (
        <div className="mb-2 h-1 rounded-full bg-ink/10">
          <div
            className={cn(
              "h-1 rounded-full bg-gold transition-[width]",
              tutorialStep.progressClassName,
            )}
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink/55",
          tutorialStep.controlsClassName,
        )}
      >
        {isHelperStep ? (
          <div className="h-8 min-w-[76px]" />
        ) : showControls ? (
          currentStep > 0 ? (
            <button
              onClick={prevStep}
              className="min-h-8 rounded border border-ink/15 bg-transparent px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-ink/70 transition-colors hover:bg-ink/5"
            >
              Previous
            </button>
          ) : (
            <div className="h-8 min-w-[76px]" />
          )
        ) : (
          <div className="h-8 min-w-[76px]" />
        )}

        {!isHelperStep ? (
          <span className="whitespace-nowrap text-[8px] text-ink/45">
            {currentStep + 1} of {totalSteps}
          </span>
        ) : (
          <span className="whitespace-nowrap text-[8px] text-ink/45">
            Context tip
          </span>
        )}

        {isHelperStep ? (
          <button
            onClick={handleCloseHelper}
            className="min-h-8 rounded border border-gold-bright bg-gold px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-felt-deep transition-colors hover:bg-gold-bright"
          >
            Close
          </button>
        ) : showControls ? (
          isPauseableStep ? (
            <button
              onClick={() => {
                void handlePauseUntilNextPhase();
              }}
              className="min-h-8 rounded border border-gold-bright bg-gold px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-felt-deep transition-colors hover:bg-gold-bright"
            >
              Continue playing
            </button>
          ) : isTutorialShowdownSubmitStep ? (
            <button
              onClick={() => {
                void handleStartTutorialShowdown();
              }}
              disabled={isStartingShowdown}
              className="min-h-8 rounded border border-gold-bright bg-gold px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-felt-deep transition-colors hover:bg-gold-bright disabled:cursor-default disabled:opacity-70"
            >
              {isStartingShowdown ? "Starting..." : "Submit word"}
            </button>
          ) : hideNext ? (
            <div className="h-8 min-w-[76px]" />
          ) : (
            <button
              onClick={nextStep}
              className={cn(
                "min-h-8 rounded border px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition-colors",
                currentStep === totalSteps - 1
                  ? "border-felt-light bg-felt text-cream hover:bg-felt-light"
                  : "border-gold-bright bg-gold text-felt-deep hover:bg-gold-bright",
              )}
            >
              {currentStep === totalSteps - 1 ? "Finish" : "Next"}
            </button>
          )
        ) : (
          <div className="h-8 min-w-[76px]" />
        )}
      </div>

      {themedArrow}

      {skipTour && currentStep < totalSteps - 1 && step.showSkip ? (
        <button
          onClick={() => {
            void handleSkipTour();
          }}
          className="mt-2 w-full rounded border border-ink/15 bg-transparent px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-ink/60 transition-colors hover:bg-ink/5"
        >
          Skip Tour
        </button>
      ) : null}
    </div>
  );
};
