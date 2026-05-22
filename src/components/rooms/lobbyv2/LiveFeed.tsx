import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { WordTile } from "../table/word-tile-v2";

type ActivityEntry = NonNullable<
  ReturnType<typeof useQuery<typeof api.activityFeed.getLiveActivity>>
>[number];

const colorConfig: Record<string, { dot: string; text: string }> = {
  big_play: { dot: "bg-gold-bright", text: "text-gold-bright" },
  raise: { dot: "bg-game-red", text: "text-red-300" },
  regular_play: { dot: "bg-chip-green", text: "text-emerald-300" },
  call: { dot: "bg-chip-blue", text: "text-blue-300" },
  fold: { dot: "bg-cream/30", text: "text-cream/40" },
  game_started: { dot: "bg-cream/40", text: "text-cream/60" },
  game_completed: { dot: "bg-gold/40", text: "text-gold/70" },
  room_created: { dot: "bg-gold", text: "text-gold" },
};

function formatTime(ts: number): string {
  const delta = Date.now() - ts;
  if (delta < 10_000) return "just now";
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatRoomInfo(entry: ActivityEntry): string | null {
  if (!entry.roomCode && !entry.roomTitle) return null;
  if (entry.roomTitle) {
    return entry.roomCode
      ? `${entry.roomTitle} / #${entry.roomCode}`
      : entry.roomTitle;
  }
  return `#${entry.roomCode}`;
}

function formatScore(score?: number): string {
  if (score == null) return "";
  return score >= 0 ? `+${score}` : `${score}`;
}

function WordTiles({ word }: { word: string }) {
  return (
    <span className="inline-flex gap-0.5 align-middle">
      {word
        .toUpperCase()
        .split("")
        .map((letter, i) => (
          <WordTile key={`${letter}-${i}`} letter={letter} size="xs" />
        ))}
    </span>
  );
}

function HeadlinePlayCard({ entry }: { entry: ActivityEntry }) {
  if (!entry.word || !entry.playerName) return null;
  return (
    <div className="mb-3 border border-gold/10 bg-gold/[0.04] px-7 py-5">
      <span className="font-mono text-[10px] uppercase text-gold">
        Headline play / {formatTime(entry.createdAt)}
      </span>

      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold font-mono text-[10px] font-bold uppercase text-felt-deep">
            {entry.playerName.slice(0, 2)}
          </div>
          <span className="truncate font-mono text-sm font-bold text-cream">
            {entry.playerName}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-serif text-4xl font-bold text-gold tabular-nums">
            {formatScore(entry.score)}
          </span>
          <span className="mt-0.5 text-right font-mono text-[10px] uppercase tracking-wider text-gold/50">
            points
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <WordTiles word={entry.word} />
      </div>
    </div>
  );
}

function EventRow({ entry }: { entry: ActivityEntry }) {
  const colors = colorConfig[entry.type] ?? colorConfig.game_started;
  const trailingValue =
    entry.score != null
      ? formatScore(entry.score)
      : entry.amount != null
        ? `$${entry.amount}`
        : null;
  const roomInfo = formatRoomInfo(entry);

  return (
    <div className="flex min-w-0 items-center gap-2 py-1">
      <span className="w-10 shrink-0 font-mono text-[10px] tabular-nums text-cream/30">
        {formatTime(entry.createdAt)}
      </span>
      <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
      <span className={`min-w-0 flex-1 truncate font-mono text-[11px] ${colors.text}`}>
        {entry.displayText}
      </span>
      {roomInfo || trailingValue ? (
        <span className="ml-auto flex shrink-0 items-center gap-2 text-right font-mono">
          {roomInfo ? (
            <span className="text-[10px] text-cream/40">{roomInfo}</span>
          ) : null}
          {trailingValue ? (
            <span className="text-gold tabular-nums">{trailingValue}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

export function LiveFeed({ className }: { className?: string }) {
  const activity = useQuery(api.activityFeed.getLiveActivity);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activity]);

  if (activity === undefined) {
    return (
      <aside
        className={`flex h-full min-h-0 flex-col items-center justify-center border-l border-gold/18 px-6 py-20 text-center ${className ?? ""}`}
      >
        <div className="font-mono text-xs uppercase tracking-wider text-cream/20">
          Loading feed...
        </div>
      </aside>
    );
  }

  const headlinePlay = activity.find(
    (entry) =>
      (entry.type === "big_play" || entry.type === "regular_play") &&
      entry.word,
  );
  const otherEvents = headlinePlay
    ? activity.filter((entry) => entry._id !== headlinePlay._id)
    : activity;

  return (
    <aside
      className={`flex h-full min-h-0 flex-col overflow-hidden border-l border-gold/18 ${className ?? ""}`}
    >
      <div className="shrink-0 px-5 pb-2 pt-4">
        <div className="mb-0.5 flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-game-red" />
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-cream/80">
            Live feed
          </h3>
          <span className="font-mono text-[10px] text-cream/30">/</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-cream/30">
            All activity
          </span>
        </div>
        <p className="font-serif text-2xl italic text-cream">
          What's happening
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="font-mono text-xs text-cream/15">
              No recent activity
            </div>
            <div className="mt-1 font-mono text-[10px] text-gold/20">
              Activity will appear here as games are played
            </div>
          </div>
        ) : (
          <>
            {headlinePlay ? (
              <div className="shrink-0">
                <HeadlinePlayCard entry={headlinePlay} />
              </div>
            ) : null}
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-0 overflow-y-auto overflow-x-hidden overscroll-contain px-7"
            >
              {otherEvents.map((entry) => (
                <EventRow key={entry._id} entry={entry} />
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
