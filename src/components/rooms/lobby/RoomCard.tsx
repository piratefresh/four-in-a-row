import { formatDistanceToNow } from "date-fns";

interface RoomCardProps {
  roomCode: string;
  activePlayers: number;
  maxPlayers: number;
  lastActiveAt: number;
  createdAt: number;
  disabled?: boolean;
  isJoining?: boolean;
  onClick: () => void;
}

type RoomState = {
  label: string;
  detail: string;
  toneClassName: string;
  cardClassName: string;
};

export const roomCardGridColumnsClassName =
  "grid-cols-[minmax(11rem,1fr)_minmax(6rem,0.42fr)_4rem_7.25rem_7.25rem]";

export function RoomCard({
  roomCode,
  activePlayers,
  maxPlayers,
  lastActiveAt,
  createdAt,
  disabled = false,
  isJoining = false,
  onClick,
}: RoomCardProps) {
  const state = getRoomState({ activePlayers, maxPlayers, isJoining });

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative grid w-full ${roomCardGridColumnsClassName} items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${state.cardClassName} ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-0.5 hover:border-amber-300/30 hover:bg-[#1b1b1b]"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f4d27a]/70 to-transparent" />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white sm:text-base">
          Room {roomCode}
        </div>
        <div className="mt-1 truncate text-[11px] uppercase tracking-[0.22em] text-[#d4aa32]">
          {state.detail}
        </div>
      </div>

      <div className="min-w-0">
        <div
          className={`flex items-center gap-2 text-sm font-medium ${state.toneClassName}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          <span className="truncate">{state.label}</span>
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-medium text-slate-200 sm:text-base">
          {activePlayers}/{maxPlayers}
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-medium text-[#d8c28a]">
          {isJoining ? "..." : formatLastActive(lastActiveAt)}
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-medium text-slate-400">
          {formatCreatedAt(createdAt)}
        </div>
      </div>
    </button>
  );
}

function getRoomState({
  activePlayers,
  maxPlayers,
  isJoining,
}: Pick<
  RoomCardProps,
  "activePlayers" | "maxPlayers" | "isJoining"
>): RoomState {
  if (isJoining) {
    return {
      label: "Joining",
      detail: "Connecting you now",
      toneClassName: "text-amber-300",
      cardClassName:
        "border-amber-400/40 bg-[linear-gradient(135deg,rgba(120,87,18,0.18),rgba(20,20,20,0.92))]",
    };
  }

  if (activePlayers >= maxPlayers) {
    return {
      label: "Full",
      detail: "No seats available",
      toneClassName: "text-slate-400",
      cardClassName: "border-white/5 bg-[#111111]",
    };
  }

  const openSeats = maxPlayers - activePlayers;
  if (activePlayers === 0) {
    return {
      label: "Fresh",
      detail: "First player gets host",
      toneClassName: "text-emerald-300",
      cardClassName: "border-white/10 bg-[#151515]",
    };
  }

  if (openSeats === 1) {
    return {
      label: "Almost full",
      detail: "One seat left",
      toneClassName: "text-amber-300",
      cardClassName:
        "border-amber-400/35 bg-[linear-gradient(135deg,rgba(103,76,15,0.18),rgba(21,21,21,0.96))]",
    };
  }

  return {
    label: "Open",
    detail: `${openSeats} seats open`,
    toneClassName: "text-[#f0ca5b]",
    cardClassName:
      "border-[#4b3a12] bg-[linear-gradient(135deg,rgba(76,58,15,0.2),rgba(20,20,20,0.96))]",
  };
}

function formatLastActive(lastActiveAt: number) {
  const elapsedMs = Date.now() - lastActiveAt;

  if (elapsedMs < 60_000) {
    return "Live";
  }

  return formatDistanceToNow(lastActiveAt, { addSuffix: true });
}

function formatCreatedAt(createdAt: number) {
  const elapsedMs = Date.now() - createdAt;

  if (elapsedMs < 60_000) {
    return "Just now";
  }

  return formatDistanceToNow(createdAt, { addSuffix: true });
}
