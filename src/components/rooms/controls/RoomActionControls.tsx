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
  currentTurnPlayerName: string | null;
  onCheck?: () => void;
  onCall?: () => void;
  onRaise?: () => void;
  onFold?: () => void;
  onRaiseAmountChange?: (amount: number) => void;
  callLabel: string;
  callAmount?: number;
  raiseLabel: string;
  raiseAmount?: number | null;
  raiseOptions?: number[];
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
          {helperTip}
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
        </div>
      </>
    );
  }

  if (betting) {
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
              {helperTip}
              {utility?.onShuffleTiles ? (
                <ShuffleTilesButton
                  id="tutorial-shuffle-button"
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
                    Waiting on
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-2 font-semibold text-ink">
                    {betting.currentTurnPlayerName
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
                </motion.div>
              </div>
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
              <div className="hidden w-full flex-wrap items-center justify-center gap-1.5 xs:gap-2 sm:flex">
                {helperTip}
{utility?.onShuffleTiles ? (
                  <ShuffleTilesButton
                    id="tutorial-shuffle-button"
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
              </div>

              <div className="flex w-full items-end justify-center sm:hidden">
                {helperTip ? (
                  <div className="mr-1.5 shrink-0 xs:mr-2">{helperTip}</div>
                ) : null}
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
          {helperTip}
          <ShuffleTilesButton
            id="tutorial-shuffle-button"
            onClick={() => utility.onShuffleTiles?.()}
            disabled={utility.disableShuffle}
          />
        </div>
      </div>
    );
  }

  return null;
}
