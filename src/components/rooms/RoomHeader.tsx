import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRoomPageContext } from "./context/RoomPageContext";
import { useRoomGameContext } from "./context/RoomGameContext";
import { RoomHelpMenu } from "./board/RoomHelpMenu";

type RoomHeaderProps = {
  roomCode: string;
  gameStatus?: string;
  gameStage?: string;
};

function getPhaseInfo(gameStatus?: string, gameStage?: string) {
  if (!gameStatus) return { phaseNo: "-", name: "Joined Room" };
  if (gameStatus === "waiting") return { phaseNo: "0", name: "Room Setup" };
  switch (gameStage) {
    case "preflop":
      return { phaseNo: "1", name: "Pre-Flop" };
    case "flop":
      return { phaseNo: "2", name: "Flop" };
    case "turn":
      return { phaseNo: "3", name: "Turn" };
    case "river":
      return { phaseNo: "4", name: "River" };
    case "final":
      return { phaseNo: "5", name: "Final" };
    case "showdown":
      return { phaseNo: "6", name: "Showdown" };
    default:
      return { phaseNo: "-", name: "Joined Room" };
  }
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getTimerColor(ms: number, isAction: boolean) {
  if (!isAction) return "text-[#d4aa32]";
  if (ms > 15000) return "text-emerald-200";
  if (ms > 5000) return "text-amber-200";
  return "text-red-200";
}

export function RoomHeader({
  roomCode,
  gameStatus,
  gameStage,
}: RoomHeaderProps) {
  const { actions } = useRoomPageContext();
  const { turnTimeRemaining, showdownTimeRemaining } = useRoomGameContext();
  const [isLeaving, setIsLeaving] = useState(false);

  const timerMs = showdownTimeRemaining ?? turnTimeRemaining;
  const isActionTimer = turnTimeRemaining !== null;
  const phase = getPhaseInfo(gameStatus, gameStage);
  const phaseKey = `${phase.phaseNo}-${phase.name}`;

  const handleBack = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    try {
      await actions.back();
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <header className="grid h-16 shrink-0 grid-cols-1 items-center border-b border-brass/18 bg-felt-deep text-white sm:h-12 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            disabled={isLeaving}
            aria-label="Leave room and return home"
            className="grid h-8 w-8 flex-none place-items-center rounded-full bg-white/6 text-white transition-colors hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="truncate text-[8px] font-medium uppercase leading-tight tracking-[0.18em] text-white/70 xl:hidden">
            Room {roomCode}
          </p>
        </div>

        <div
          className="flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-3.5"
          id="phase-title"
        >
          <div
            key={phaseKey}
            className="animate-[phase-slide_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both] text-center"
          >
            <div className="inline font-mono text-[10px] uppercase tracking-[0.2em] text-brass sm:block sm:text-[9px]">
              PHASE {phase.phaseNo}
            </div>
            <div className="ml-2 inline font-serif text-xs italic leading-none text-[#f4e4c1] sm:ml-0 sm:mt-0.5 sm:block sm:text-base">
              {phase.name}
            </div>
          </div>
          <div className="hidden h-7 w-px bg-brass/25 sm:block" />
          <div className="text-center sm:text-left">
            <div className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-[#e8dcc0]/50 sm:block">
              TURN TIMER
            </div>
            <div
              className={`animate-[timer-pulse_1s_ease-in-out_infinite] font-mono text-[22px] font-semibold leading-none tracking-[0.06em] tabular-nums ${
                timerMs !== null
                  ? getTimerColor(timerMs, isActionTimer)
                  : "text-[#e8dcc0]/30"
              }`}
            >
              {timerMs !== null ? formatCountdown(timerMs) : "--:--"}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end xl:hidden">
          <RoomHelpMenu />
        </div>
      </div>
      <div className="hidden min-w-0 items-center justify-end border-l border-white/5 px-5 xl:flex">
        <p className="truncate font-mono font-bold uppercase leading-none tracking-[0.08em] text-brass">
          Room {roomCode}
        </p>
      </div>
    </header>
  );
}
