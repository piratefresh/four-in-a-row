import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRoomPageContext } from "./context/RoomPageContext";
import { useRoomGameContext } from "./context/RoomGameContext";

type RoomHeaderProps = {
  roomCode: string;
  gameStatus?: string;
  gameStage?: string;
};

function getEyebrow(gameStatus?: string, gameStage?: string) {
  if (!gameStatus) return "JOINED ROOM";
  if (gameStatus === "waiting") return "PHASE 0/ROOM SETUP";
  switch (gameStage) {
    case "preflop":
      return "PRE-FLOP";
    case "flop":
      return "FLOP";
    case "turn":
      return "TURN";
    case "river":
      return "RIVER";
    case "final":
      return "FINAL";
    case "showdown":
      return "SHOWDOWN";
    default:
      return "JOINED ROOM";
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
  const eyebrow = getEyebrow(gameStatus, gameStage);

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
    <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-white/5 bg-felt-deep px-3 text-white sm:px-4">
      <div className="flex items-center">
        <button
          type="button"
          onClick={handleBack}
          disabled={isLeaving}
          aria-label="Leave room and return home"
          className="grid h-8 w-8 flex-none place-items-center rounded-full bg-white/6 text-white transition-colors hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      {timerMs !== null ? (
        <div
          className={`text-center text-4xl tabular-nums ${getTimerColor(timerMs, isActionTimer)} [@media(min-width:1441px)]:mr-[400px]`}
        >
          {formatCountdown(timerMs)}
        </div>
      ) : (
        <div />
      )}

      <div className="min-w-0 text-right" id="phase-title">
        <h1 className="truncate text-[10px] font-medium uppercase tracking-[0.22em] text-[#d4aa32]">
          {eyebrow}
        </h1>
        <p className="truncate text-[8px] font-medium leading-tight text-white">
          Room {roomCode}
        </p>
      </div>
    </header>
  );
}
