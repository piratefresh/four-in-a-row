import { ActionButton } from "./ActionButton";

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
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  canFold: boolean;
  onCheck?: () => void;
  onCall?: () => void;
  onRaise?: () => void;
  onFold?: () => void;
  callLabel: string;
  raiseLabel: string;
};

type RoomActionControlsProps = {
  ready?: ReadyControlsProps;
  betting?: BettingControlsProps;
};

export function RoomActionControls({
  ready,
  betting,
}: RoomActionControlsProps) {
  if (ready) {
    return (
      <>
        <div className="absolute right-2 top-2 z-30 rounded-lg bg-[#111218]/90 px-4 py-2 text-right backdrop-blur-sm sm:right-[5%] sm:top-4 sm:px-6 sm:py-3">
          <div className="text-[16px] leading-none text-[#f1eee7] sm:text-[24px]">
            {ready.readyCount}/{ready.totalPlayers} Ready
          </div>
          <div className="mt-1 text-[12px] leading-none text-[#d9d0bf] sm:text-[16px]">
            {ready.allPlayersReady ? "Starting..." : "Waiting for players..."}
          </div>
        </div>
        <div
          className="flex w-[92vw] flex-col items-stretch gap-2 sm:w-auto sm:items-center sm:gap-3"
        >
          <ActionButton
            variant={ready.isReady ? "fold" : "check"}
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
      <div className="flex w-full flex-row items-center justify-center gap-2">
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
          {betting.isBetting
            ? "Betting..."
            : betting.canCheck
              ? "Check"
              : betting.callLabel}
        </ActionButton>
        <ActionButton
          variant="raise"
          onClick={() => betting.onRaise?.()}
          disabled={betting.isBetting || !betting.canRaise}
        >
          {betting.isBetting ? "Betting..." : betting.raiseLabel}
        </ActionButton>
        <ActionButton
          variant="fold"
          onClick={() => betting.onFold?.()}
          disabled={betting.isBetting || !betting.canFold}
        >
          {betting.isBetting ? "Betting..." : "Fold"}
        </ActionButton>
      </div>
    );
  }

  return null;
}
