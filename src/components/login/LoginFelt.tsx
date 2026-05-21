interface SeatPosition {
  x: number;
  y: number;
  name: string;
  color: string;
  you?: boolean;
}

const SEATS: SeatPosition[] = [
  { x: 0.5, y: 0.92, name: "You", color: "#d4af37", you: true },
  { x: 0.12, y: 0.72, name: "Mira Quill", color: "#e6b450" },
  { x: 0.08, y: 0.32, name: "Jamie", color: "#7ec4cf" },
  { x: 0.5, y: 0.1, name: "Ellis", color: "#b8a6f0" },
  { x: 0.92, y: 0.32, name: "Raja", color: "#d97757" },
  { x: 0.88, y: 0.72, name: "Zack", color: "#9ec27a" },
];

function MiniAv({
  name,
  color,
  size = 30,
  ring = false,
}: {
  name: string;
  color: string;
  size?: number;
  ring?: boolean;
}) {
  const parts = name.split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 1).toUpperCase();
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
        boxShadow: ring
          ? "0 0 0 1.5px #051410, 0 0 0 3px #d4af37"
          : "0 0 0 1.5px #051410",
      }}
    >
      {initials}
    </div>
  );
}

interface LoginFeltProps {
  compact?: boolean;
}

export function LoginFelt({ compact = false }: LoginFeltProps) {
  const feltW = compact ? 340 : 420;
  const feltH = compact ? 200 : 250;

  return (
    <div
      className="relative mx-auto"
      style={{
        width: feltW,
        height: feltH,
        background:
          "radial-gradient(ellipse at center, #1a4a35 0%, #0e3422 60%, #08291b 100%)",
        borderRadius: feltW * 0.45,
        border: "3px solid #3a2815",
        boxShadow:
          "inset 0 0 30px rgba(0,0,0,0.6), 0 16px 40px rgba(0,0,0,0.6)",
      }}
    >
      <div
        className="absolute rounded-full border"
        style={{
          inset: 8,
          borderColor: "rgba(212,175,55,0.18)",
        }}
      />

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
      >
        <div
          className="font-mono text-[9px] uppercase tracking-[2.2px]"
          style={{ color: "#d4af37" }}
        >
          POT &middot; YOUR SEAT
        </div>
        <div
          className="mt-[2px] font-serif text-[30px] italic font-bold leading-none"
          style={{ color: "#d4af37" }}
        >
          $4,280
        </div>
        <div
          className="mt-1 font-mono text-[9px] tracking-[1.4px]"
          style={{ color: "rgba(232,220,192,0.6)" }}
        >
          BIG BLIND IN{" "}
          <span style={{ color: "#d4af37" }}>00:34</span>
        </div>
      </div>

      {SEATS.map((seat, i) => (
        <div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${seat.x * 100}%`, top: `${seat.y * 100}%` }}
        >
          <MiniAv
            name={seat.name}
            color={seat.color}
            size={seat.you ? 38 : 30}
            ring={seat.you}
          />
          {seat.you && (
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-full px-[8px] py-[2px] font-mono text-[8px] font-bold tracking-[1.4px] whitespace-nowrap"
              style={{
                top: "100%",
                marginTop: 6,
                background: "#d4af37",
                color: "#1a1208",
              }}
            >
              YOU
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
