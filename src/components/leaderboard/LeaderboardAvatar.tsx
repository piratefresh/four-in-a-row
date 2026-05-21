const AVATAR_COLORS = [
  "rgb(230, 180, 80)",
  "rgb(224, 122, 95)",
  "rgb(158, 194, 122)",
  "rgb(126, 196, 207)",
  "rgb(184, 166, 240)",
  "rgb(167, 139, 250)",
  "rgb(129, 178, 154)",
  "rgb(240, 168, 192)",
  "rgb(168, 208, 240)",
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getPlayerColor(name: string): string {
  return AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function LeaderboardAvatar({
  name,
  size,
  ring,
}: {
  name: string;
  size: number;
  ring?: boolean;
}) {
  const bg = getPlayerColor(name);
  const fontSize = size * 0.38;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "rgb(12, 20, 16)",
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 700,
        fontSize,
        letterSpacing: "-0.5px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: ring
          ? "rgb(5, 20, 16) 0px 0px 0px 1.5px, rgb(212, 175, 55) 0px 0px 0px 3px"
          : "rgb(5, 20, 16) 0px 0px 0px 1.5px",
      }}
    >
      {getInitials(name)}
    </div>
  );
}
