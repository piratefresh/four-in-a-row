import { AnimatePresence, motion } from "motion/react";
import { Shuffle } from "lucide-react";
import { ActionButton } from "./ActionButton";
import { RaiseAmountSlider } from "./RaiseAmountSlider";

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
};

export function RoomActionControls({
  ready,
  betting,
  utility,
}: RoomActionControlsProps) {
  const showRaiseChip = !!betting && (betting.raiseAmount ?? 0) > 0;

  if (ready) {
    return (
      <>
        <div className="flex w-[92vw] flex-col items-stretch gap-2 sm:w-auto sm:items-center sm:gap-3">
          <ActionButton
            variant={ready.isReady ? "fold" : "check"}
            size="wide"
            onClick={() => ready.onReady?.()}
            disabled={ready.isTogglingReady || ready.allPlayersReady}
          >
            {ready.isTogglingReady
              ? "..."
              : ready.isReady
                ? "Not Ready"
                : "I'm Ready!"}
          </ActionButton>
        </div>
      </>
    );
  }

  if (betting) {
    return (
      <div className="flex w-full items-center justify-center">
        <AnimatePresence initial={false} mode="wait">
          {!betting.isMyTurn ? (
            <motion.div
              key="waiting"
              layoutId="room-action-state"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="rounded-2xl border border-[#2a2a2a] bg-[linear-gradient(180deg,rgba(18,18,18,0.96)_0%,rgba(10,10,10,0.98)_100%)] px-5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_30px_rgba(0,0,0,0.32)]"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.2 }}
              >
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8f8876]">
                  Waiting on
                </div>
                <div className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold text-[#f4d37a] sm:text-base">
                  {betting.currentTurnPlayerName
                    ? `${betting.currentTurnPlayerName}'s turn...`
                    : "next player's turn..."}
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f4d37a] animate-bounce" />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#f4d37a] animate-bounce"
                      style={{ animationDelay: "120ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#f4d37a] animate-bounce"
                      style={{ animationDelay: "240ms" }}
                    />
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-medium tracking-[0.12em] text-[#b8b19a]">
                  thinking...
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="actions"
              layoutId="room-action-state"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="flex w-full max-w-[42rem] flex-col items-center gap-2.5"
            >
              {betting.canRaise &&
              betting.raiseAmount &&
              (betting.raiseOptions?.length ?? 0) > 1 ? (
                <RaiseAmountSlider
                  value={betting.raiseAmount}
                  options={betting.raiseOptions ?? []}
                  callAmount={betting.callAmount}
                  disabled={betting.isBetting || !betting.isMyTurn}
                  onChange={(amount) => betting.onRaiseAmountChange?.(amount)}
                />
              ) : null}

              <div className="flex w-full flex-wrap items-center justify-center gap-2">
                {utility?.onShuffleTiles ? (
                  <button
                    type="button"
                    onClick={() => utility.onShuffleTiles?.()}
                    disabled={utility.disableShuffle}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#404247] bg-[linear-gradient(180deg,#2f3034_0%,#1f2023_100%)] text-[#f6f3ee] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.28)] transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-150 outline-none hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_24px_rgba(0,0,0,0.32)] active:translate-y-0 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_14px_rgba(0,0,0,0.24)] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45"
                    aria-label="Shuffle tiles"
                  >
                    <Shuffle className="h-5 w-5" />
                  </button>
                ) : null}
                <ActionButton
                  variant="fold"
                  onClick={() => betting.onFold?.()}
                  disabled={betting.isBetting || !betting.canFold}
                >
                  {betting.isBetting ? "Betting..." : "Fold"}
                </ActionButton>
                <ActionButton
                  variant={betting.canCheck ? "check" : "call"}
                  onClick={() => {
                    if (betting.canCheck) {
                      betting.onCheck?.();
                      return;
                    }
                    betting.onCall?.();
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
                  onClick={() => betting.onRaise?.()}
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
          <button
            type="button"
            onClick={() => utility.onShuffleTiles?.()}
            disabled={utility.disableShuffle}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#404247] bg-[linear-gradient(180deg,#2f3034_0%,#1f2023_100%)] text-[#f6f3ee] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.28)] transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-150 outline-none hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_24px_rgba(0,0,0,0.32)] active:translate-y-0 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_14px_rgba(0,0,0,0.24)] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45"
            aria-label="Shuffle tiles"
          >
            <Shuffle className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
