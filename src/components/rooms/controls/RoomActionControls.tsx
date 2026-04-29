import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNextStep } from "nextstepjs";
import { ActionButton } from "./ActionButton";
import { ShuffleTilesButton } from "./ShuffleTilesButton";
import {
  FIRST_BOT_GAME_TOUR,
  getRoomCodeFromPathname,
  getTourPausedStepStorageKey,
} from "@/components/onboarding/wordPokerTours";

type ReadyControlsProps = {
  readyCount: number;
  totalPlayers: number;
  allPlayersReady: boolean;
  isReady: boolean;
  isTogglingReady: boolean;
  onReady?: () => void;
};

type BettingControlsProps = {
  isBetting: boolean;
  isMyTurn: boolean;
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  canFold: boolean;
  canCallClock?: boolean;
  currentTurnPlayerName: string | null;
  onCheck?: () => void;
  onCall?: () => void;
  onRaise?: () => void;
  onFold?: () => void;
  onCallClock?: () => void;
  onRaiseAmountChange?: (amount: number) => void;
  callLabel: string;
  callAmount?: number;
  raiseLabel: string;
  raiseAmount?: number | null;
  raiseOptions?: number[];
  isCallingClock?: boolean;
  turnClockTimeRemaining?: number | null;
  turnClockCallerName?: string | null;
  turnClockTargetName?: string | null;
  isTurnClockTarget?: boolean;
  callClockAvailableInMs?: number | null;
};

type UtilityControlsProps = {
  onShuffleTiles?: () => void;
  disableShuffle?: boolean;
};

type RoomActionControlsProps = {
  ready?: ReadyControlsProps;
  betting?: BettingControlsProps;
  utility?: UtilityControlsProps;
  helperTip?: ReactNode;
};

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function RoomActionControls({
  ready,
  betting,
  utility,
  helperTip,
}: RoomActionControlsProps) {
  const {
    closeNextStep,
    currentStep,
    currentTour,
    setCurrentStep,
    startNextStep,
  } = useNextStep();
  const showRaiseChip = !!betting && (betting.raiseAmount ?? 0) > 0;
  const advanceTutorialFromActionStep = () => {
    if (currentTour === FIRST_BOT_GAME_TOUR && currentStep === 1) {
      setCurrentStep(2, 50);
    }
  };

  useEffect(() => {
    if (!betting?.isMyTurn || typeof window === "undefined") {
      return;
    }

    const roomCode = getRoomCodeFromPathname(window.location.pathname);
    const pausedStepKey = getTourPausedStepStorageKey(
      FIRST_BOT_GAME_TOUR,
      roomCode,
    );

    if (window.localStorage.getItem(pausedStepKey) !== "0") {
      return;
    }

    window.localStorage.removeItem(pausedStepKey);
    startNextStep(FIRST_BOT_GAME_TOUR);
    setCurrentStep(1, 50);
  }, [betting?.isMyTurn, setCurrentStep, startNextStep]);

  if (ready) {
    const handleReadyClick = () => {
      ready.onReady?.();

      if (
        !ready.isReady &&
        currentTour === FIRST_BOT_GAME_TOUR &&
        currentStep === 0
      ) {
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

    return (
      <>
        <div
          id="tutorial-room-actions"
          className="flex w-[92vw] flex-row items-center justify-center gap-2 sm:w-auto sm:gap-3"
        >
          <div className="flex min-w-0 flex-1 justify-center sm:flex-none">
            <ActionButton
              id="#tutorial-room-ready-button"
              variant={ready.isReady ? "fold" : "check"}
              size="wide"
              onClick={handleReadyClick}
              disabled={ready.isTogglingReady || ready.allPlayersReady}
            >
              {ready.isTogglingReady
                ? "..."
                : ready.isReady
                  ? "Not Ready"
                  : "I'm Ready!"}
            </ActionButton>
          </div>
          {helperTip}
        </div>
      </>
    );
  }

  if (betting) {
    const turnClockLabel =
      betting.turnClockTimeRemaining !== null &&
      betting.turnClockTimeRemaining !== undefined
        ? formatCountdown(betting.turnClockTimeRemaining)
        : null;
    const callClockAvailableLabel =
      betting.callClockAvailableInMs !== null &&
      betting.callClockAvailableInMs !== undefined
        ? formatCountdown(betting.callClockAvailableInMs)
        : null;
    const showCallClockButton =
      !turnClockLabel &&
      (betting.canCallClock ||
        betting.isCallingClock ||
        callClockAvailableLabel !== null);
    const turnClockSubjectLabel = betting.isTurnClockTarget
      ? "you"
      : (betting.turnClockTargetName ??
        betting.currentTurnPlayerName ??
        "current player");
    return (
      <div
        id="tutorial-room-actions"
        className="flex w-full items-center justify-center"
      >
        <AnimatePresence initial={false} mode="wait">
          {!betting.isMyTurn ? (
            <motion.div
              key="waiting"
              layoutId="room-action-state"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              {utility?.onShuffleTiles ? (
                <ShuffleTilesButton
                  onClick={() => utility.onShuffleTiles?.()}
                  disabled={utility.disableShuffle}
                />
              ) : null}
              <div className="rounded-lg border-b-[3px] border-gold bg-cream px-3 py-2.5 text-center text-[11px] leading-[1.3] text-ink shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.08, duration: 0.2 }}
                >
                  <div className="font-medium uppercase tracking-[0.18em] text-ink/60">
                    {betting.isTurnClockTarget && turnClockLabel
                      ? "You're On The Clock"
                      : "Waiting on"}
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-2 font-semibold text-ink">
                    {betting.isTurnClockTarget && turnClockLabel
                      ? `You have ${turnClockLabel} to decide an action.`
                      : betting.currentTurnPlayerName
                        ? `${betting.currentTurnPlayerName}'s turn`
                        : "next player's turn"}
                    <span className="relative top-px inline-flex shrink-0 items-center gap-1 self-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold animate-bounce" />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-gold animate-bounce"
                        style={{ animationDelay: "120ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-gold animate-bounce"
                        style={{ animationDelay: "240ms" }}
                      />
                    </span>
                  </div>
                  <div className="mt-1 font-medium tracking-[0.12em] text-ink/65">
                    {turnClockLabel
                      ? `Clock called on ${turnClockSubjectLabel}${betting.turnClockCallerName ? ` by ${betting.turnClockCallerName}` : ""} - ${turnClockLabel}`
                      : null}
                  </div>
                  {showCallClockButton ? (
                    <div className="mt-3 flex justify-center">
                      <div
                        title={
                          !betting.canCallClock && callClockAvailableLabel
                            ? `Available after 1:00 of waiting. ${callClockAvailableLabel} remaining.`
                            : undefined
                        }
                      >
                        <ActionButton
                          variant="raise"
                          size="wide"
                          onClick={() => betting.onCallClock?.()}
                          disabled={
                            betting.isCallingClock || !betting.canCallClock
                          }
                        >
                          {betting.isCallingClock
                            ? "Calling..."
                            : "Call the Clock"}
                        </ActionButton>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </div>
              {helperTip}
            </motion.div>
          ) : (
            <motion.div
              key="actions"
              layoutId="room-action-state"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="flex w-full max-w-[42rem] flex-col items-center gap-2 xs:gap-2.5"
            >
              {turnClockLabel ? (
                <div className="w-full rounded-2xl border border-[#8a6630] bg-[linear-gradient(180deg,rgba(51,35,12,0.96)_0%,rgba(24,16,6,0.98)_100%)] px-4 py-2 text-center text-sm font-semibold text-[#f4d37a] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_28px_rgba(0,0,0,0.3)]">
                  <div>
                    {betting.turnClockCallerName
                      ? `${betting.turnClockCallerName} called the clock`
                      : "Clock called"}{" "}
                    - {turnClockLabel}
                  </div>
                  {betting.isTurnClockTarget ? (
                    <div className="mt-1 text-xs font-medium tracking-[0.06em] text-[#f5dfab]">
                      You have 30 seconds to decide an action or the game will
                      auto-check or fold for you.
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="hidden w-full flex-wrap items-center justify-center gap-1.5 xs:gap-2 sm:flex">
                {utility?.onShuffleTiles ? (
                  <ShuffleTilesButton
                    onClick={() => utility.onShuffleTiles?.()}
                    disabled={utility.disableShuffle}
                  />
                ) : null}
                <ActionButton
                  variant="fold"
                  onClick={() => {
                    betting.onFold?.();
                    advanceTutorialFromActionStep();
                  }}
                  disabled={betting.isBetting || !betting.canFold}
                >
                  {betting.isBetting ? "Betting..." : "Fold"}
                </ActionButton>
                <ActionButton
                  variant={betting.canCheck ? "check" : "call"}
                  onClick={() => {
                    if (betting.canCheck) {
                      betting.onCheck?.();
                      advanceTutorialFromActionStep();
                      return;
                    }
                    betting.onCall?.();
                    advanceTutorialFromActionStep();
                  }}
                  disabled={
                    betting.isBetting || (!betting.canCheck && !betting.canCall)
                  }
                >
                  {betting.isBetting ? (
                    "Betting..."
                  ) : betting.canCheck ? (
                    "Check"
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span>Call</span>
                      {betting.callAmount ?? 0}
                    </span>
                  )}
                </ActionButton>
                <ActionButton
                  variant="raise"
                  onClick={() => {
                    betting.onRaise?.();
                    advanceTutorialFromActionStep();
                  }}
                  disabled={betting.isBetting || !betting.canRaise}
                >
                  {betting.isBetting ? (
                    "Betting..."
                  ) : showRaiseChip ? (
                    <span className="inline-flex items-center gap-2">
                      <span>Raise to</span>
                      {betting.raiseAmount ?? 0}
                    </span>
                  ) : (
                    betting.raiseLabel
                  )}
                </ActionButton>
                {helperTip}
              </div>

              <div className="flex w-full items-end justify-center sm:hidden">
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1.5 xs:gap-2">
                  {utility?.onShuffleTiles ? (
                    <ShuffleTilesButton
                      onClick={() => utility.onShuffleTiles?.()}
                      disabled={utility.disableShuffle}
                    />
                  ) : null}
                  <ActionButton
                    variant="fold"
                    onClick={() => {
                      betting.onFold?.();
                      advanceTutorialFromActionStep();
                    }}
                    disabled={betting.isBetting || !betting.canFold}
                  >
                    {betting.isBetting ? "Betting..." : "Fold"}
                  </ActionButton>
                  <ActionButton
                    variant={betting.canCheck ? "check" : "call"}
                    onClick={() => {
                      if (betting.canCheck) {
                        betting.onCheck?.();
                        advanceTutorialFromActionStep();
                        return;
                      }
                      betting.onCall?.();
                      advanceTutorialFromActionStep();
                    }}
                    disabled={
                      betting.isBetting ||
                      (!betting.canCheck && !betting.canCall)
                    }
                  >
                    {betting.isBetting ? (
                      "Betting..."
                    ) : betting.canCheck ? (
                      "Check"
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <span>Call</span>
                        {betting.callAmount ?? 0}
                      </span>
                    )}
                  </ActionButton>
                  <ActionButton
                    variant="raise"
                    onClick={() => {
                      betting.onRaise?.();
                      advanceTutorialFromActionStep();
                    }}
                    disabled={betting.isBetting || !betting.canRaise}
                  >
                    {betting.isBetting ? (
                      "Betting..."
                    ) : showRaiseChip ? (
                      <span className="inline-flex items-center gap-2">
                        <span>Raise to</span>
                        {betting.raiseAmount ?? 0}
                      </span>
                    ) : (
                      betting.raiseLabel
                    )}
                  </ActionButton>
                  {helperTip}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (utility?.onShuffleTiles) {
    return (
      <div className="flex w-full items-center justify-center">
        <div className="flex w-full max-w-[42rem] flex-wrap items-center justify-center gap-2">
          <ShuffleTilesButton
            onClick={() => utility.onShuffleTiles?.()}
            disabled={utility.disableShuffle}
          />
          {helperTip}
        </div>
      </div>
    );
  }

  return null;
}
