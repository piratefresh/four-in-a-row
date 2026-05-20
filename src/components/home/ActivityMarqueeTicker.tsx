import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

type ActivityEntry = NonNullable<
  ReturnType<typeof useQuery<typeof api.activityFeed.getLiveActivity>>
>[number];

function formatTickerItem(entry: ActivityEntry): {
  player: string;
  action: string;
  detail?: string;
} {
  const player = entry.playerName ?? "Someone";

  switch (entry.type) {
    case "game_completed": {
      if (entry.word && entry.score) {
        return {
          player,
          action: entry.displayText.includes("won")
            ? "won a match with"
            : "lost a hand at",
          detail: `${entry.word} \u00B7 ${entry.score}pts`,
        };
      }
      return {
        player,
        action: entry.displayText.includes("won")
          ? "won a match"
          : "lost a hand",
        detail: entry.roomTitle ?? entry.roomCode ?? undefined,
      };
    }
    case "big_play":
    case "regular_play": {
      if (entry.word && entry.score) {
        return {
          player,
          action: "played",
          detail: `${entry.word} \u00B7 ${entry.score}pts${entry.roomTitle ? ` at ${entry.roomTitle}` : ""}`,
        };
      }
      return { player, action: "played" };
    }
    case "raise":
      return {
        player,
        action: "raised to",
        detail: `$${entry.amount}${entry.roomTitle ? ` at ${entry.roomTitle}` : ""}`,
      };
    case "call":
      return {
        player,
        action: "called",
        detail: entry.roomTitle ?? entry.roomCode ?? undefined,
      };
    case "fold":
      return {
        player,
        action: "folded",
        detail: entry.roomTitle ?? entry.roomCode ?? undefined,
      };
    case "game_started":
      return {
        player,
        action: entry.roomTitle ? "started" : "opened",
        detail: entry.roomTitle ?? entry.roomCode ?? undefined,
      };
    case "room_created":
      return {
        player,
        action: "opened",
        detail: entry.roomTitle ?? entry.roomCode ?? undefined,
      };
    default:
      return { player, action: entry.displayText };
  }
}

export function ActivityMarqueeTicker() {
  const activities = useQuery(api.activityFeed.getLiveActivity);

  if (!activities || activities.length === 0) return null;

  const formatted = activities.map((a) => ({
    key: String(a._id),
    ...formatTickerItem(a),
  }));

  const doubled = [...formatted, ...formatted];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 overflow-hidden">
      <div className="flex items-center gap-2 p-2 pl-5 pb-1">
        <span className="h-[7px] w-[7px] shrink-0 animate-pulse-dot rounded-full bg-red-400" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
          LIVE NOW
        </span>
      </div>
      <div className="border-t border-brass/18 bg-black/35">
        <div
          className="flex gap-10 py-2"
          style={{ animation: "marquee 45s linear infinite" }}
        >
          {doubled.map((item, i) => (
            <span
              key={`${item.key}-${i}`}
              className="flex shrink-0 items-center gap-0 whitespace-nowrap font-mono text-[9px]"
            >
              <span className="text-brass">{item.player}</span>
              <span className="text-cream/65">
                {` \u00B7 ${item.action}`}
                {item.detail ? ` \u00B7 ` : ""}
              </span>
              {item.detail ? (
                <span className="text-cream">{item.detail}</span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
