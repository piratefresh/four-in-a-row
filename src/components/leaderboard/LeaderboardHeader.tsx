import { Link } from "@tanstack/react-router";
import { LeaderboardAvatar } from "./LeaderboardAvatar";

export function LeaderboardHeader({
  playerCount,
  currentUserName,
}: {
  playerCount: number | undefined;
  currentUserName: string;
}) {
  return (
    <div
      style={{
        padding: "20px 40px",
        borderBottom: "1px solid rgba(212, 175, 55, 0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <Link
          to="/"
          style={{
            fontFamily: '"Noto Serif", Georgia, serif',
            fontWeight: 700,
            fontSize: 22,
            color: "rgb(244, 228, 193)",
            letterSpacing: "-0.5px",
            textDecoration: "none",
          }}
        >
          Word Poker
        </Link>
        <div
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: "2.2px",
            color: "rgb(212, 175, 55)",
            textTransform: "uppercase",
          }}
        >
          Standings
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: "2.2px",
            color: "rgba(232, 220, 192, 0.6)",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "rgb(158, 194, 122)" }}>{"\u25CF"}</span>{" "}
          {playerCount !== undefined
            ? `${playerCount} PLAYERS`
            : "\u00B7\u00B7\u00B7"}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "4px 4px 4px 14px",
            borderRadius: 999,
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(212, 175, 55, 0.18)",
          }}
        >
          <div style={{ fontSize: 12, color: "rgb(232, 220, 192)" }}>
            {currentUserName}
          </div>
          <LeaderboardAvatar name={currentUserName} size={26} />
        </div>
      </div>
    </div>
  );
}
