import { SEAT_COLORS } from "./SeatColorPicker";

interface SeatPosition {
  x: number;
  y: number;
  type: "open" | "taken";
  name?: string;
  color?: string;
}

const SEATS: SeatPosition[] = [
  { x: 0.5, y: 0.92, type: "open" },
  { x: 0.12, y: 0.72, type: "taken", name: "Mira", color: "#e6b450" },
  { x: 0.06, y: 0.32, type: "open" },
  { x: 0.5, y: 0.08, type: "taken", name: "Ellis", color: "#b8a6f0" },
  { x: 0.94, y: 0.32, type: "taken", name: "Raja", color: "#d97757" },
  { x: 0.88, y: 0.72, type: "open" },
];

const OPEN_SEAT_INDICES = [0, 2, 5] as const;

const POINTS: Record<string, number> = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
};

interface PickASeatFeltProps {
  selectedOpenSeat: number | null;
  selectedColorIndex?: number;
  playerName?: string;
  compact?: boolean;
  onSelectOpenSeat: (openSeatIndex: number) => void;
  onConfirmSeat?: () => void;
}

function getInitials(name: string | undefined): string | null {
  if (!name?.trim()) return null;
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function MiniAv({
  name,
  color,
  size = 44,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const initials = name.slice(0, 1).toUpperCase();
  return (
    <div
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-tighter"
      style={{
        width: size,
        height: size,
        background: color,
        color: "#0c1410",
        fontSize: size * 0.38,
        fontWeight: 700,
        letterSpacing: -0.5,
        boxShadow: "0 0 0 1.5px #051410",
      }}
    >
      {initials}
    </div>
  );
}

function TileChar({
  letter,
  size = 22,
}: {
  letter: string;
  size?: number;
}) {
  const upper = letter.toUpperCase();
  return (
    <div
      className="relative flex shrink-0 items-center justify-center font-bold tracking-tighter"
      style={{
        width: size,
        height: size * 1.18,
        borderRadius: size * 0.12,
        background:
          "linear-gradient(165deg, #fff3d1 0%, #f4e4c1 50%, #d9c392 100%)",
        color: "#2b1810",
        fontSize: size * 0.5,
        fontWeight: 800,
        letterSpacing: -0.5,
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.6) inset, 0 2px 3px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.25)",
      }}
    >
      {upper}
      <span
        className="absolute font-mono font-semibold"
        style={{
          bottom: 2,
          right: 3,
          fontSize: size * 0.22,
          opacity: 0.7,
        }}
      >
        {POINTS[upper] ?? 1}
      </span>
    </div>
  );
}

export function PickASeatFelt({
  selectedOpenSeat,
  selectedColorIndex,
  playerName,
  compact = false,
  onSelectOpenSeat,
  onConfirmSeat,
}: PickASeatFeltProps) {
  const initials = getInitials(playerName);
  const selectedColor =
    selectedColorIndex != null ? SEAT_COLORS[selectedColorIndex] : "#d4af37";

  const feltW = compact ? 350 : 560;
  const feltH = compact ? 220 : 370;
  const borderRadius = compact ? 158 : 252;
  const ringInset = compact ? 6 : 10;
  const takenAvatarSize = compact ? 30 : 44;
  const openSeatSize = compact ? 34 : 50;
  const openSeatFontPicked = compact ? 12 : 16;
  const openSeatFontDefault = compact ? 10 : 12;
  const labelFontSize = compact ? 7 : 8;
  const kickerFont = compact ? 8 : 10;
  const roomFont = compact ? 20 : 30;
  const metaFont = compact ? 8 : 10;
  const tileSize = compact ? 16 : 22;

  return (
    <div
      className="relative mx-auto"
      style={{
        width: feltW,
        height: feltH,
        background:
          "radial-gradient(ellipse at center, #1a4a35 0%, #0e3422 60%, #08291b 100%)",
        borderRadius,
        border: "3px solid #3a2815",
        boxShadow:
          "inset 0 0 40px rgba(0,0,0,0.6), 0 16px 50px rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="absolute rounded-full border"
        style={{
          inset: ringInset,
          borderColor: "rgba(212,175,55,0.18)",
        }}
      />

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
      >
        <div
          className="font-mono uppercase"
          style={{ fontSize: kickerFont, letterSpacing: kickerFont * 0.24, color: "#d4af37" }}
        >
          PICK YOUR SEAT
        </div>
        <div
          className="mt-1 font-serif italic font-semibold tracking-tighter"
          style={{ fontSize: roomFont, color: "#f4e4c1" }}
        >
          The Rookie Room
        </div>
        <div
          className="mt-[6px] font-mono tracking-[1.6px]"
          style={{ fontSize: metaFont, color: "rgba(232,220,192,0.6)" }}
        >
          FREE BUY-IN &middot; 60s HANDS
        </div>
        <div className="mt-[10px] flex justify-center gap-[2px]">
          {["H", "E", "L", "L", "O"].map((letter, i) => (
            <TileChar key={i} letter={letter} size={tileSize} />
          ))}
        </div>
      </div>

      {SEATS.map((seat, i) => {
        if (seat.type === "taken") {
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${seat.x * 100}%`, top: `${seat.y * 100}%` }}
            >
              <MiniAv name={seat.name!} color={seat.color!} size={takenAvatarSize} />
              <div
                className="mt-1 font-mono tracking-[1.2px]"
                style={{ fontSize: labelFontSize, color: "rgba(232,220,192,0.6)" }}
              >
                {seat.name!.toUpperCase()}
              </div>
            </div>
          );
        }

        const openSeatIndex = (OPEN_SEAT_INDICES as readonly number[]).indexOf(i);
        const isPicked = openSeatIndex === selectedOpenSeat;
        const handleSeatAction = () => {
          if (isPicked && onConfirmSeat) {
            onConfirmSeat();
            return;
          }

          onSelectOpenSeat(openSeatIndex);
        };

        return (
          <div
            key={i}
            role="button"
            tabIndex={0}
            aria-label={
              isPicked
                ? "Start tutorial with this seat"
                : `Pick open seat ${openSeatIndex + 1}`
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSeatAction();
              }
            }}
            onClick={handleSeatAction}
            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer text-center${compact && !isPicked ? " hidden" : ""}`}
            style={{ left: `${seat.x * 100}%`, top: `${seat.y * 100}%` }}
          >
            <div
              className="inline-flex items-center justify-center rounded-full font-serif font-semibold italic"
              style={{
                width: openSeatSize,
                height: openSeatSize,
                background: isPicked ? selectedColor : "rgba(0,0,0,0.3)",
                color: isPicked ? "#1a1208" : "rgba(232,220,192,0.6)",
                border: isPicked
                  ? "2px solid #f4e4c1"
                  : "1.5px dashed rgba(212,175,55,0.18)",
                fontSize: isPicked ? openSeatFontPicked : openSeatFontDefault,
                fontWeight: 600,
                fontStyle: "italic",
                boxShadow: isPicked
                  ? `0 0 0 4px rgba(212,175,55,0.18), 0 0 20px rgba(212,175,55,0.4)`
                  : "none",
              }}
            >
              {isPicked ? (initials ?? "Open") : "Open"}
            </div>
            <div
              className="mt-1 font-mono tracking-[1.2px]"
              style={{
                fontSize: labelFontSize,
                color: isPicked ? "#d4af37" : "rgba(232,220,192,0.3)",
              }}
            >
              {isPicked ? "YOUR SEAT" : "PICK ME"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
