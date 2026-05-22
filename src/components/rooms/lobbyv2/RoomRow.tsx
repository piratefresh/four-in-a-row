import { Play } from "lucide-react";

interface RoomRowProps {
  roomCode: string;
  roomTitle?: string | null;
  configLabel: string;
  activePlayers: number;
  maxPlayers: number;
  pot: number;
  status: "live" | "open" | "full";
  lastActiveAt: number;
  currentTime: number;
  isHot?: boolean;
  isJoining?: boolean;
  playerInitials?: string[];
  onClick: () => void;
}

const statusConfig: Record<
  RoomRowProps["status"],
  { label: string; dotClass: string; pulseClass: string; textClass: string }
> = {
  live: {
    label: "Live",
    dotClass: "bg-game-red",
    pulseClass: "animate-pulse",
    textClass: "text-red-300",
  },
  open: {
    label: "Open",
    dotClass: "bg-chip-green",
    pulseClass: "",
    textClass: "text-emerald-300",
  },
  full: {
    label: "Full",
    dotClass: "bg-cream/30",
    pulseClass: "",
    textClass: "text-cream/35",
  },
};

const avatarColors = [
  "bg-gold text-felt-deep",
  "bg-chip-green text-cream",
  "bg-chip-red text-cream",
  "bg-chip-blue text-cream",
  "bg-gold-bright text-felt-deep",
  "bg-felt-light text-cream",
];

export function RoomRow({
  roomCode,
  roomTitle,
  configLabel,
  activePlayers,
  maxPlayers,
  pot,
  status,
  lastActiveAt,
  currentTime,
  isHot,
  isJoining,
  playerInitials = [],
  onClick,
}: RoomRowProps) {
  const sc = statusConfig[status];
  const isEmpty = activePlayers === 0;
  const nextTimer = formatNextTimer(lastActiveAt, currentTime, status);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isJoining || status === "full"}
      className={`group relative grid min-h-[118px] w-full grid-cols-1 gap-4 rounded-lg border px-5 py-4 text-left transition-all duration-200 sm:grid-cols-[minmax(220px,1.6fr)_minmax(112px,1fr)_minmax(94px,0.9fr)_minmax(94px,0.8fr)_60px] sm:items-start ${
        isHot
          ? "border-gold/30 bg-gold/[0.06]"
          : "border-cream/5 bg-felt-deep/70"
      } ${
        isJoining || status === "full"
          ? "cursor-not-allowed opacity-60"
          : "hover:border-gold/35 hover:bg-gold/[0.045]"
      }`}
    >
      {isHot ? (
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-linear-to-r from-gold/[0.04] via-transparent to-gold/[0.04]" />
      ) : null}

      <div className="relative z-10 flex min-h-[86px] min-w-0 flex-col justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate font-body text-[16px] font-semibold leading-none text-cream">
              {roomTitle || `Room ${roomCode}`}
            </span>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${sc.textClass}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${sc.dotClass} ${sc.pulseClass}`}
              />
              {sc.label}
            </span>
          </div>
          <div className="mt-2 truncate font-mono text-[11px] leading-none tracking-[0.14em] text-cream/40">
            {configLabel}
          </div>
        </div>

        <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/25 bg-gold/10 text-gold transition-colors group-hover:border-gold/45 group-hover:bg-gold/15">
          <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
        </span>
      </div>

      <div className="relative z-10 flex items-start gap-2 sm:pt-4">
        <div className="flex min-w-0 -space-x-1.5">
          {playerInitials.slice(0, 4).map((init, i) => (
            <span
              key={i}
              title={init}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-body text-[8px] font-bold uppercase leading-none shadow-[0_0_0_2px_#072419] ${avatarColors[i % avatarColors.length]}`}
            >
              {init}
            </span>
          ))}
          {activePlayers > 4 ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.08] font-body text-[8px] font-bold text-cream shadow-[0_0_0_2px_#072419]">
              +{activePlayers - 4}
            </span>
          ) : null}
          {isEmpty ? (
            <span className="font-mono text-[10px] italic text-cream/25">
              empty
            </span>
          ) : null}
        </div>
        <span className="shrink-0 font-mono text-[11px] leading-5 text-cream/45">
          {activePlayers}/{maxPlayers}
        </span>
      </div>

      <div className="relative z-10 sm:pt-4">
        <div className="font-serif text-[18px] font-bold leading-none text-gold tabular-nums">
          ${pot.toLocaleString()}
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-cream/35">
          pot
        </div>
      </div>

      <div className="relative z-10 hidden sm:flex sm:justify-center sm:pt-3.5">
        <TrendSparkline seed={roomCode} active={status !== "full" && pot > 0} />
      </div>

      <div className="relative z-10 text-left sm:pt-4 sm:text-right">
        <div className="font-mono text-[11px] leading-none text-gold tabular-nums">
          {nextTimer}
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-cream/35">
          next
        </div>
      </div>
    </button>
  );
}

function formatNextTimer(
  lastActiveAt: number,
  currentTime: number,
  status: RoomRowProps["status"],
) {
  if (status === "full") return "--:--";

  const elapsedSeconds = Math.max(
    0,
    Math.floor((currentTime - lastActiveAt) / 1000),
  );
  const remaining = Math.max(0, 180 - (elapsedSeconds % 180));
  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function TrendSparkline({ seed, active }: { seed: string; active: boolean }) {
  if (!active) {
    return <span className="font-mono text-sm text-cream/25">-</span>;
  }

  const seedValue = seed
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  const points = Array.from({ length: 10 }, (_, index) => {
    const x = 2 + index * 8.4;
    const curve = Math.pow(index / 9, 1.8);
    const wobble = Math.sin(index + seedValue) * 2;
    const y = 24 - curve * 22 + wobble;
    return `${x.toFixed(1)},${Math.min(24, Math.max(2, y)).toFixed(1)}`;
  });
  const line = `M${points.join(" L")}`;

  return (
    <svg
      width="86"
      height="28"
      viewBox="0 0 86 28"
      aria-hidden="true"
      className="block"
    >
      <path d={`${line} L78,24 L2,24 Z`} fill="#d4a54a" opacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke="#d4a54a"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
