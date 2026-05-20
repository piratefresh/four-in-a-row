import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { User, Bot } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../convex/_generated/api";
import { ActivityMarqueeTicker } from "../home/ActivityMarqueeTicker";

const DAYS_MAP: Record<string, number | undefined> = {
  daily: 1,
  weekly: 7,
  "all-time": undefined,
};

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

function PlayerAvatar({
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

interface PeriodRecords {
  longestWord: {
    word: string;
    score: number;
    playerName: string;
    playerInitials: string;
  } | null;
  biggestPot: {
    amount: number;
    playerName: string;
    playerInitials: string;
    roomTitle: string;
    how: string;
  } | null;
  hotStreak: {
    wins: number;
    playerName: string;
    playerInitials: string;
    roomTitle?: string;
    ongoing: boolean;
  } | null;
}

function RecordCard({
  label,
  symbol,
  value,
  playerName,
  subtitle,
  featured,
  loading,
}: {
  label: string;
  symbol: string;
  value: string;
  playerName?: string;
  subtitle?: string;
  featured?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      style={{
        padding: featured ? "26px 24px 22px" : "20px 18px 18px",
        borderRadius: 14,
        background: featured
          ? "linear-gradient(160deg, rgba(212, 175, 55, 0.18) 0%, rgba(0, 0, 0, 0.4) 70%)"
          : "linear-gradient(160deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%)",
        border: featured
          ? "1px solid rgb(212, 175, 55)"
          : "1px solid rgba(212, 175, 55, 0.18)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -12,
          right: -16,
          fontFamily: '"Noto Serif", Georgia, serif',
          fontStyle: "italic",
          fontSize: featured ? 200 : 140,
          color: featured
            ? "rgba(212, 175, 55, 0.1)"
            : "rgba(232, 220, 192, 0.05)",
          pointerEvents: "none",
          lineHeight: 1,
        }}
      >
        {symbol}
      </div>
      <div
        className="font-mono"
        style={{
          fontSize: featured ? 11 : 10,
          letterSpacing: "2.4px",
          color: "rgb(212, 175, 55)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      {loading ? (
        <div
          style={{
            marginTop: featured ? 12 : 8,
            height: featured ? 52 : 32,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
        </div>
      ) : (
        <>
          <div
            style={{
              marginTop: featured ? 12 : 8,
              fontFamily: '"Noto Serif", Georgia, serif',
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: featured ? 52 : 32,
              color: "rgb(244, 228, 193)",
              letterSpacing: "-1px",
              lineHeight: 1,
            }}
          >
            {value || "\u2014"}
          </div>
          {playerName && (
            <div
              style={{
                marginTop: featured ? 14 : 10,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <PlayerAvatar name={playerName} size={featured ? 28 : 22} />
              <div
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: featured ? 14 : 12,
                  color: "rgb(232, 220, 192)",
                  fontWeight: 600,
                }}
              >
                {playerName}
              </div>
            </div>
          )}
          {subtitle && (
            <div
              className="font-mono"
              style={{
                marginTop: 6,
                fontSize: featured ? 10 : 9,
                letterSpacing: "1.4px",
                color: "rgba(232, 220, 192, 0.6)",
              }}
            >
              {subtitle}
            </div>
          )}
        </>
      )}
    </div>
  );
}

type ActivityEntry = NonNullable<
  ReturnType<typeof useQuery<typeof api.activityFeed.getLiveActivity>>
>[number];

function formatActivity(item: ActivityEntry): {
  name: string;
  action: string;
  detail?: string;
  room?: string;
  extra?: string;
} {
  const name = item.playerName ?? "Someone";
  switch (item.type) {
    case "big_play":
    case "regular_play":
      return {
        name,
        action: "played",
        detail: item.word,
        room: item.roomTitle ?? item.roomCode,
        extra: item.score ? `+${item.score}` : undefined,
      };
    case "raise":
      return {
        name,
        action: "raised to",
        detail: `$${item.amount}`,
        room: item.roomTitle ?? item.roomCode,
      };
    case "call":
      return {
        name,
        action: "called",
        room: item.roomTitle ?? item.roomCode,
      };
    case "fold":
      return {
        name,
        action: "folded",
        room: item.roomTitle ?? item.roomCode,
      };
    case "game_completed": {
      const won = item.displayText.includes("won");
      if (item.word && item.score) {
        return {
          name,
          action: won ? "won with" : "lost with",
          detail: item.word,
          room: item.roomTitle ?? item.roomCode,
          extra: `+${item.score}`,
        };
      }
      return {
        name,
        action: won ? "won" : "lost",
        room: item.roomTitle ?? item.roomCode,
      };
    }
    case "game_started":
      return {
        name,
        action: "started",
        room: item.roomTitle ?? item.roomCode,
      };
    case "room_created":
      return {
        name,
        action: "opened",
        room: item.roomTitle ?? item.roomCode,
      };
    default:
      return { name, action: item.displayText };
  }
}

function Ticker({ activities }: { activities: ActivityEntry[] | undefined }) {
  if (!activities || activities.length === 0) return null;

  const formatted = activities.map((a) => ({
    key: String(a._id),
    ...formatActivity(a),
  }));
  const doubled = [...formatted, ...formatted];

  return (
    <div
      style={{
        borderTop: "1px solid rgba(212, 175, 55, 0.18)",
        background: "rgba(0, 0, 0, 0.35)",
        padding: "9px 0",
        overflow: "hidden",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 18,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          paddingLeft: 20,
          flexShrink: 0,
          color: "rgb(212, 175, 55)",
          letterSpacing: "2px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderRight: "1px solid rgba(212, 175, 55, 0.18)",
          paddingRight: 14,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "rgb(255, 93, 78)",
            boxShadow: "rgb(255, 93, 78) 0px 0px 8px",
          }}
          className="animate-pulse-dot"
        />
        <span
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          LIVE ON THE WIRE
        </span>
      </div>
      <div
        className="animate-marquee"
        style={{
          display: "inline-flex",
          gap: 32,
          paddingLeft: 18,
        }}
      >
        {doubled.map((item, i) => (
          <span key={`${item.key}-${i}`} style={{ flexShrink: 0 }}>
            <span
              className="font-mono"
              style={{ fontSize: 10, color: "rgb(212, 175, 55)" }}
            >
              {item.name}
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 10,
                opacity: 0.65,
                color: "rgb(232, 220, 192)",
              }}
            >
              {" \u00B7 "}
              {item.action}
              {item.detail ? ` ${item.detail}` : ""}
              {item.room ? " @ " : ""}
            </span>
            {item.room && (
              <span
                className="font-mono"
                style={{ fontSize: 10, color: "rgb(244, 228, 193)" }}
              >
                {item.room}
              </span>
            )}
            {item.extra && (
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: "rgb(212, 175, 55)",
                  marginLeft: 8,
                }}
              >
                {item.extra}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LeaderboardPage() {
  const [timeMode, setTimeMode] = useState("all-time");
  const [rankTab, setRankTab] = useState<"players" | "bots">("players");
  const { data: session } = authClient.useSession();

  const days = DAYS_MAP[timeMode];
  const filter = rankTab === "players" ? "players" : "bots";

  const rankings = useQuery(api.playerStats.getAllStats, { filter, days });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = useQuery((api as any).records.getPeriodRecords, {}) as
    | PeriodRecords
    | undefined;
  const activities = useQuery(api.activityFeed.getLiveActivity);

  const currentUserId = session?.user?.id;
  const currentUserName =
    session?.user?.name?.trim() || session?.user?.email || "User";

  const top10 = useMemo(() => {
    if (!rankings) return [];
    return [...rankings].sort((a, b) => b.gamesWon - a.gamesWon).slice(0, 10);
  }, [rankings]);

  const leftColumn = top10.slice(0, 5);
  const rightColumn = top10.slice(5, 10);

  const longestWordCard = useMemo(() => {
    if (!records?.longestWord) return null;
    const r = records.longestWord;
    return {
      label: "LONGEST WORD",
      symbol: "\u25D0",
      value: r.word ?? "",
      playerName: r.playerName,
      subtitle: r.word
        ? `${r.word.length} letters \u00B7 ${r.score} pts`
        : undefined,
    };
  }, [records]);

  const biggestPotCard = useMemo(() => {
    if (!records?.biggestPot) return null;
    const r = records.biggestPot;
    return {
      label: "BIGGEST POT WON",
      symbol: "\u2605",
      value: r.amount ? `$${r.amount.toLocaleString()}` : "",
      playerName: r.playerName,
      subtitle: [r.roomTitle, r.how].filter(Boolean).join(" \u00B7 "),
    };
  }, [records]);

  const hotStreakCard = useMemo(() => {
    if (!records?.hotStreak) return null;
    const r = records.hotStreak;
    return {
      label: "HOT STREAK",
      symbol: "\u25C8",
      value: `${r.wins} wins`,
      playerName: r.playerName,
      subtitle: [
        r.roomTitle,
        r.ongoing ? "ongoing" : r.ongoing === false ? "ended" : undefined,
      ]
        .filter(Boolean)
        .join(" \u00B7 "),
    };
  }, [records]);

  const recordsLoading = records === undefined;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(rgb(10, 29, 23) 0%, rgb(5, 20, 16) 100%)",
        color: "rgb(232, 220, 192)",
        fontFamily: "Inter, system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(at 50% 30%, rgba(212, 175, 55, 0.06) 0%, transparent 60%)",
        }}
      />

      {/* ── Header bar ─────────────────────────────────────── */}
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
          <div
            style={{
              fontFamily: '"Noto Serif", Georgia, serif',
              fontWeight: 700,
              fontSize: 22,
              color: "rgb(244, 228, 193)",
              letterSpacing: "-0.5px",
            }}
          >
            Word Poker
          </div>
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
            <span style={{ color: "rgb(158, 194, 122)" }}>\u25CF</span>{" "}
            {rankings ? `${rankings.length} PLAYERS` : "\u00B7\u00B7\u00B7"}
          </div>

          <div
            style={{
              display: "flex",
              gap: 2,
              padding: 2,
              borderRadius: 999,
              border: "1px solid rgba(212, 175, 55, 0.18)",
              background: "rgba(0, 0, 0, 0.3)",
            }}
          >
            {(["daily", "weekly", "all-time"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTimeMode(mode)}
                className="font-mono"
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontSize: 9,
                  letterSpacing: "1.4px",
                  cursor: "pointer",
                  color:
                    timeMode === mode
                      ? "rgb(26, 18, 8)"
                      : "rgba(232, 220, 192, 0.6)",
                  background:
                    timeMode === mode ? "rgb(212, 175, 55)" : "transparent",
                  fontWeight: timeMode === mode ? 700 : 500,
                  border: "none",
                  textTransform: "uppercase",
                }}
              >
                {mode === "all-time" ? "ALL-TIME" : mode.toUpperCase()}
              </button>
            ))}
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
            <PlayerAvatar name={currentUserName} size={26} />
          </div>
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────── */}
      <div
        style={{
          flex: "1 1 0%",
          overflow: "auto",
          padding: "32px 48px 24px",
        }}
      >
        {/* Hall of Records hero */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div
            className="font-mono"
            style={{
              fontSize: 11,
              letterSpacing: "3.4px",
              color: "rgb(212, 175, 55)",
              textTransform: "uppercase",
            }}
          >
            HALL OF RECORDS
          </div>
          <h1
            style={{
              margin: "8px 0 0",
              fontFamily: '"Noto Serif", Georgia, serif',
              fontWeight: 600,
              fontSize: 88,
              lineHeight: 0.9,
              color: "rgb(244, 228, 193)",
              letterSpacing: "-3.5px",
            }}
          >
            The <em style={{ color: "rgb(212, 175, 55)" }}>records</em> of the
            room.
          </h1>
          <div
            style={{
              margin: "10px auto 0",
              fontFamily: '"Noto Serif", Georgia, serif',
              fontStyle: "italic",
              fontSize: 15,
              color: "rgba(232, 220, 192, 0.6)",
              maxWidth: 560,
              lineHeight: 1.5,
            }}
          >
            The standout achievements across every table this week. Here's who
            made the wall.
          </div>
        </div>

        {/* Record cards grid */}
        <div
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr",
            gap: 14,
          }}
        >
          <RecordCard
            label={longestWordCard?.label ?? "LONGEST WORD"}
            symbol={longestWordCard?.symbol ?? "\u25D0"}
            value={longestWordCard?.value ?? ""}
            playerName={longestWordCard?.playerName}
            subtitle={longestWordCard?.subtitle}
            featured
            loading={recordsLoading}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <RecordCard
              label={biggestPotCard?.label ?? "BIGGEST POT WON"}
              symbol={biggestPotCard?.symbol ?? "\u2605"}
              value={biggestPotCard?.value ?? ""}
              playerName={biggestPotCard?.playerName}
              subtitle={biggestPotCard?.subtitle}
              loading={recordsLoading}
            />
            <RecordCard
              label={hotStreakCard?.label ?? "HOT STREAK"}
              symbol={hotStreakCard?.symbol ?? "\u25C8"}
              value={hotStreakCard?.value ?? ""}
              playerName={hotStreakCard?.playerName}
              subtitle={hotStreakCard?.subtitle}
              loading={recordsLoading}
            />
          </div>
        </div>

        {/* ── Rankings section ────────────────────────────────── */}
        <div
          style={{
            marginTop: 36,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(212, 175, 55, 0.18)",
            paddingBottom: 10,
          }}
        >
          <div>
            <div
              className="font-mono"
              style={{
                fontSize: 11,
                letterSpacing: "3px",
                color: "rgb(212, 175, 55)",
                textTransform: "uppercase",
              }}
            >
              RANKINGS \u00B7 TOP TEN
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: '"Noto Serif", Georgia, serif',
                fontWeight: 600,
                fontSize: 32,
                color: "rgb(244, 228, 193)",
                fontStyle: "italic",
              }}
            >
              By the numbers
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              type="button"
              onClick={() => setRankTab("players")}
              className="font-mono"
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 9,
                letterSpacing: "1.4px",
                fontWeight: 600,
                color:
                  rankTab === "players"
                    ? "rgb(212, 175, 55)"
                    : "rgba(232, 220, 192, 0.6)",
                background:
                  rankTab === "players"
                    ? "rgba(212, 175, 55, 0.1)"
                    : "transparent",
                border:
                  rankTab === "players"
                    ? "1px solid rgba(212, 175, 55, 0.18)"
                    : "1px solid transparent",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              <User className="mr-1 inline size-3" />
              PLAYERS
            </button>
            <button
              type="button"
              onClick={() => setRankTab("bots")}
              className="font-mono"
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 9,
                letterSpacing: "1.4px",
                fontWeight: 600,
                color:
                  rankTab === "bots"
                    ? "rgb(212, 175, 55)"
                    : "rgba(232, 220, 192, 0.6)",
                background:
                  rankTab === "bots"
                    ? "rgba(212, 175, 55, 0.1)"
                    : "transparent",
                border:
                  rankTab === "bots"
                    ? "1px solid rgba(212, 175, 55, 0.18)"
                    : "1px solid transparent",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              <Bot className="mr-1 inline size-3" />
              AI CHARACTERS
            </button>
          </div>
        </div>

        {/* Rankings grid: 2 columns */}
        {rankings === undefined ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "60px 0",
            }}
          >
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
          </div>
        ) : top10.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "rgba(232, 220, 192, 0.4)",
              fontStyle: "italic",
            }}
          >
            No {rankTab === "players" ? "players" : "AI characters"} have played
            yet.
          </div>
        ) : (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            {[leftColumn, rightColumn].map((col, colIdx) => (
              <div
                key={colIdx}
                style={{ display: "flex", flexDirection: "column" }}
              >
                {col.map((stat, idx) => {
                  const rank = colIdx * 5 + idx + 1;
                  const isCurrentUser = currentUserId
                    ? stat.identity.authUserId === currentUserId
                    : false;

                  return (
                    <div
                      key={
                        stat.identity.authUserId ??
                        stat.identity.characterId ??
                        stat.identity.name
                      }
                      style={{
                        display: "grid",
                        gridTemplateColumns: "34px 36px 1fr auto",
                        gap: 12,
                        alignItems: "center",
                        padding: "14px 6px",
                        borderBottom: "1px solid rgba(212, 175, 55, 0.08)",
                        background: isCurrentUser
                          ? "rgba(212, 175, 55, 0.05)"
                          : "transparent",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: '"Noto Serif", Georgia, serif',
                          fontStyle: "italic",
                          fontSize: 28,
                          color: isCurrentUser
                            ? "rgb(212, 175, 55)"
                            : "rgba(232, 220, 192, 0.6)",
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        {rank}
                      </div>
                      <PlayerAvatar
                        name={stat.identity.name}
                        size={36}
                        ring={isCurrentUser}
                      />
                      <div>
                        <div
                          style={{
                            fontFamily: '"Noto Serif", Georgia, serif',
                            fontStyle: "italic",
                            fontSize: 17,
                            color: isCurrentUser
                              ? "rgb(244, 228, 193)"
                              : "rgb(232, 220, 192)",
                            fontWeight: 600,
                          }}
                        >
                          {stat.identity.name}
                          {isCurrentUser && (
                            <span
                              className="font-mono"
                              style={{
                                color: "rgb(212, 175, 55)",
                                fontStyle: "normal",
                                fontSize: 9,
                                letterSpacing: "1.4px",
                                marginLeft: 8,
                              }}
                            >
                              \u00B7 YOU
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontFamily: '"Noto Serif", Georgia, serif',
                            fontStyle: "italic",
                            fontSize: 18,
                            color: "rgb(212, 175, 55)",
                            fontWeight: 600,
                          }}
                        >
                          {stat.gamesWon}
                          <span style={{ fontSize: "0.7em" }}>W</span>
                        </div>
                        <div
                          className="font-mono"
                          style={{
                            fontSize: 9,
                            color: "rgba(232, 220, 192, 0.6)",
                            letterSpacing: "1.2px",
                          }}
                        >
                          {stat.bestWord ? (
                            <>
                              {stat.bestWord}
                              {" \u00B7 "}
                              {stat.bestWordScore}p
                            </>
                          ) : (
                            "\u2014"
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <ActivityMarqueeTicker />
    </div>
  );
}
