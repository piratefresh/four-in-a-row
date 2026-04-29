import { formatDistanceToNow } from "date-fns";

interface RoomCardProps {
  roomCode: string;
  roomTitle?: string | null;
  config?: {
    showdownTimer?: number;
    bettingStructure?: string;
    choiceTileFrequency?: string;
    bonusStructure?: string;
  };
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
  "grid-cols-[11rem_6rem_4rem_7.25rem_7.25rem]";

export function RoomCard({
  roomCode,
  roomTitle,
  config,
  activePlayers,
  maxPlayers,
  lastActiveAt,
  createdAt,
  disabled = false,
  isJoining = false,
  onClick,
}: RoomCardProps) {
  const state = getRoomState({ activePlayers, maxPlayers, isJoining });
  const configLabel = formatRoomConfig(config);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative grid w-full ${roomCardGridColumnsClassName} items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${state.cardClassName} ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-0.5 hover:border-gold-bright hover:bg-gold hover:shadow-lg hover:shadow-gold/25"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-gold-bright/70 to-transparent group-hover:via-felt-deep/20" />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-cream group-hover:text-felt-deep sm:text-base">
          {roomTitle || `Room ${roomCode}`}
        </div>
        <div className="mt-1 truncate text-[11px] uppercase tracking-[0.22em] text-gold group-hover:text-felt-deep/70">
          {configLabel}
        </div>
      </div>

      <div className="min-w-0">
        <div
          className={`flex items-center gap-2 text-sm font-medium ${state.toneClassName} group-hover:text-felt-deep`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          <span className="truncate">{state.label}</span>
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-medium text-cream/90 group-hover:text-felt-deep sm:text-base">
          {activePlayers}/{maxPlayers}
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-medium text-gold-bright group-hover:text-felt-deep">
          {isJoining ? "..." : formatLastActive(lastActiveAt)}
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-medium text-cream/50 group-hover:text-felt-deep/60">
          {formatCreatedAt(createdAt)}
        </div>
      </div>
    </button>
  );
}

function formatRoomConfig(config: RoomCardProps["config"]) {
  const seconds = Math.round((config?.showdownTimer ?? 60_000) / 1000);
  const betting =
    config?.bettingStructure === "potLimit"
      ? "Pot"
      : config?.bettingStructure === "fixedLimit"
        ? "Fixed"
        : "No limit";
  const tiles = (config?.choiceTileFrequency ?? "high") === "high" ? "2-3 tiles" : "0-1 tiles";
  return `${seconds}s ${betting} ${tiles}`;
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
        "border-amber-400/40 bg-amber-400/10",
    };
  }

  if (activePlayers >= maxPlayers) {
    return {
      label: "Full",
      detail: "No seats available",
      toneClassName: "text-cream/40",
      cardClassName: "border-cream/10 bg-cream/5",
    };
  }

  const openSeats = maxPlayers - activePlayers;
  if (activePlayers === 0) {
    return {
      label: "Fresh",
      detail: "First player gets host",
      toneClassName: "text-emerald-300",
      cardClassName: "border-emerald-400/20 bg-emerald-400/8",
    };
  }

  if (openSeats === 1) {
    return {
      label: "Almost full",
      detail: "One seat left",
      toneClassName: "text-amber-300",
      cardClassName: "border-amber-400/25 bg-amber-400/8",
    };
  }

  return {
    label: "Open",
    detail: `${openSeats} seats open`,
    toneClassName: "text-gold-bright",
    cardClassName: "border-cream/15 bg-cream/8",
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
