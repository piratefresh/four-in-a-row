import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useEffect, useRef } from "react";
import { WordTile } from "../table/word-tile-v2";

type ActivityEntry = NonNullable<
  ReturnType<typeof useQuery<typeof api.activityFeed.getLiveActivity>>
>[number];

const colorConfig: Record<string, { dot: string; text: string }> = {
  big_play: { dot: "bg-amber-400", text: "text-amber-300/90" },
  raise: { dot: "bg-red-400", text: "text-red-300/90" },
  regular_play: { dot: "bg-emerald-400", text: "text-emerald-300/80" },
  call: { dot: "bg-cyan-400", text: "text-cyan-300/80" },
  fold: { dot: "bg-cream/30", text: "text-cream/40" },
  game_started: { dot: "bg-cream/40", text: "text-cream/60" },
  game_completed: { dot: "bg-brass/40", text: "text-brass/70" },
  room_created: { dot: "bg-violet-400", text: "text-violet-300/80" },
};

function formatTime(ts: number): string {
  const delta = Date.now() - ts;
  if (delta < 10_000) return "just now";
  const s = Math.floor(delta / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatRoomInfo(entry: ActivityEntry): string | null {
  if (!entry.roomCode && !entry.roomTitle) return null;
  if (entry.roomTitle) {
    return entry.roomCode
      ? `${entry.roomTitle} · #${entry.roomCode}`
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
          <WordTile key={i} letter={letter} size="xs">
            {letter}
          </WordTile>
        ))}
    </span>
  );
}

function HeadlinePlayCard({ entry }: { entry: ActivityEntry }) {
  if (!entry.word || !entry.playerName) return null;
  return (
    <div className="mb-3 border border-amber-500/10 bg-amber-500/4 px-7 py-5">
      <span className="uppercase font-mono text-xxs text-brass">
        Headline Play Â· {formatTime(entry.createdAt)}
      </span>

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-brass flex items-center justify-center text-xxs font-mono text-black uppercase font-bold">
            {entry.playerName.slice(0, 2)}
          </div>
          <span className="text-sm text-cream font-mono truncate font-bold">
            {entry.playerName}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-4xl font-serif font-bold text-brass tabular-nums">
            {formatScore(entry.score)}
          </span>
          <span className="font-mono text-xxs text-brass/50 tracking-wider mt-0.5 uppercase text-right">
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
    <div className="flex items-center gap-2 py-1 min-w-0">
      <span className="text-xxs text-cream/30 font-mono tabular-nums w-10 shrink-0">
        {formatTime(entry.createdAt)}
      </span>
      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${colors.dot}`} />
      <span className="text-[11px] font-mono truncate text-cream min-w-0 flex-1">
        {entry.displayText}
      </span>
      {roomInfo || trailingValue ? (
        <span className="ml-auto shrink-0 text-right font-mono flex items-center gap-2">
          {roomInfo ? (
            <span className="text-xxs text-cream/40">{roomInfo}</span>
          ) : null}
          {trailingValue ? (
            <span className="text-brass tabular-nums">{trailingValue}</span>
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
      <aside className={`flex h-full min-h-0 flex-col items-center justify-center border-l border-brass/18 px-6 py-20 text-center ${className ?? ""}`}>
        <div className="text-cream/20 font-mono text-xs uppercase tracking-wider">
          Loading feed...
        </div>
      </aside>
    );
  }

  const headlinePlay = activity.find(
    (e) => (e.type === "big_play" || e.type === "regular_play") && e.word,
  );
  const otherEvents = headlinePlay
    ? activity.filter((e) => e._id !== headlinePlay._id)
    : activity;

  return (
    <aside className={`flex h-full min-h-0 flex-col overflow-hidden border-l border-brass/18 ${className ?? ""}`}>
      <div className="px-5 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse-dot" />
          <h3 className="text-xxs font-mono uppercase tracking-widest text-cream/80">
            LIVE FEED
          </h3>
          <span className="text-xxs text-cream/30 font-mono">Â·</span>
          <span className="text-xxs text-cream/30 font-mono uppercase tracking-wider">
            ALL ACTIVITY
          </span>
        </div>
        <p className="text-2xl font-serif italic text-cream">
          What's happening
        </p>
      </div>

      <div className="min-h-0 flex-1 flex flex-col overflow-hidden pb-4">
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="text-cream/15 font-mono text-xs">
              No recent activity
            </div>
            <div className="text-brass/18 font-mono text-[10px] mt-1">
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
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain space-y-0 px-7"
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
