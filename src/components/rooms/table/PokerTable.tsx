import type { ReactNode } from "react";

const STACK_FORMATTER = new Intl.NumberFormat("en-US");

const PLAYER_TONES = [
  "from-[#a855f7] to-[#6d28d9]",
  "from-[#4ade80] to-[#166534]",
  "from-[#fb923c] to-[#ea580c]",
  "from-[#7dd3fc] to-[#0f766e]",
] as const;

type SeatPosition = {
  top: string;
  left: string;
};

export interface PokerTablePlayer {
  seatIndex: number;
  name: string;
  meta?: string | null;
}

type PokerTableSize = "sm" | "md" | "lg" | "responsive";

interface PokerTableProps {
  players?: PokerTablePlayer[];
  maxPlayers: number;
  onOpenSeatClick?: (seatIndex: number) => void;
  isJoining?: boolean;
  centerLabel?: string;
  showSeats?: boolean;
  size?: PokerTableSize;
  className?: string;
  shellInsetClassName?: string;
  children?: ReactNode;
}

const tableSizeClasses: Record<PokerTableSize, string> = {
  sm: "w-[430px] h-[240px] max-w-[430px]",
  md: "w-[750px] h-[350px] max-w-[750px]",
  lg: "w-[750px] h-[500px] max-w-[750px]",
  responsive:
    "w-[min(1000px,calc(100vw-1rem))] max-w-[1000px] h-[clamp(240px,46vw,500px)]",
};

export function PokerTable({
  players = [],
  maxPlayers,
  onOpenSeatClick,
  isJoining = false,
  centerLabel = "WORD POKER",
  showSeats = true,
  size,
  className,
  shellInsetClassName = "inset-x-0 bottom-0 top-6",
  children,
}: PokerTableProps) {
  const playerBySeat = new Map(
    players.map((player) => [player.seatIndex, player]),
  );
  const seats = Array.from({ length: maxPlayers }, (_, seatIndex) => ({
    seatIndex,
    player: playerBySeat.get(seatIndex) ?? null,
    position: getSeatPosition(seatIndex, maxPlayers),
  }));

  return (
    <div
      className={`relative mx-auto ${size ? tableSizeClasses[size] : "w-[300px] h-[250px]"} ${className ?? ""}`}
    >
      <div className={`absolute ${shellInsetClassName}`}>
        <div className="relative h-full w-full rounded-[50%/40%] border-[3px] border-felt-deep bg-gradient-felt-table shadow-[inset_0_0_40px_rgba(0,0,0,0.6),0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-3 rounded-[50%/40%] border border-gold-bright/60"></div>
        </div>
      </div>

      {centerLabel ? (
        <div className="pointer-events-none absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 text-center opacity-40">
          <div className="font-serif text-[14px] uppercase tracking-[0.35em] text-white/80">
            {centerLabel}
          </div>
        </div>
      ) : null}

      {children}

      {showSeats
        ? seats.map((seat) => (
            <div
              key={seat.seatIndex}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={seat.position}
            >
              {seat.player ? (
                <FilledSeat
                  name={seat.player.name}
                  meta={seat.player.meta}
                  toneClassName={
                    PLAYER_TONES[seat.seatIndex % PLAYER_TONES.length]
                  }
                />
              ) : (
                <OpenSeat
                  seatIndex={seat.seatIndex}
                  isJoining={isJoining}
                  onOpenSeatClick={onOpenSeatClick}
                />
              )}
            </div>
          ))
        : null}
    </div>
  );
}

interface FilledSeatProps {
  name: string;
  meta?: string | null;
  toneClassName: string;
}

function FilledSeat({ name, meta, toneClassName }: FilledSeatProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${toneClassName} font-sans text-[1.18rem] font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.1)]`}
      >
        {getInitial(name)}
      </div>
      <div className="mt-1.5 text-center">
        <div className="max-w-[72px] truncate text-[11px] text-white/75">
          {name}
        </div>
        {meta ? (
          <div className="mt-0.5 text-[10px] font-medium text-[#d4af37]">
            {meta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface OpenSeatProps {
  seatIndex: number;
  isJoining: boolean;
  onOpenSeatClick?: (seatIndex: number) => void;
}

function OpenSeat({ seatIndex, isJoining, onOpenSeatClick }: OpenSeatProps) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => onOpenSeatClick?.(seatIndex)}
        disabled={!onOpenSeatClick || isJoining}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-white/20 text-[11px] uppercase tracking-wide text-white/35 transition-colors hover:border-[#d4af37]/50 hover:text-[#d4af37] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isJoining ? "..." : "Open"}
      </button>
      <div className="mt-1.5 text-center text-[11px] text-white/55">-</div>
    </div>
  );
}

function getSeatPosition(index: number, totalSeats: number): SeatPosition {
  if (totalSeats === 4) {
    const positions = [
      { top: "12%", left: "50%" },
      { top: "46%", left: "92%" },
      { top: "78%", left: "50%" },
      { top: "46%", left: "8%" },
    ];

    return positions[index] ?? positions[0];
  }

  const angle = (index / totalSeats) * 2 * Math.PI - Math.PI / 2;
  const x = 50 + 42 * Math.cos(angle);
  const y = 46 + 32 * Math.sin(angle);

  return {
    top: `${y}%`,
    left: `${x}%`,
  };
}

function getInitial(name: string) {
  const normalized = name.trim();
  return normalized[0]?.toUpperCase() ?? "?";
}

export function formatStackLabel(chips: number) {
  return `$${STACK_FORMATTER.format(chips)}`;
}
