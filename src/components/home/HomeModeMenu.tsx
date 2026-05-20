import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ModeCard } from "./components/ModeCard";
import { LiveFeed } from "@/components/rooms/lobbyv2/LiveFeed";
import { Tips } from "./Tips";

type HomeModeMenuProps = {
  activeRoomCode?: string | null;
  activeRoomTutorialId?: string | null;
  isStartingOffline: boolean;
  isStartingTutorial: boolean;
  statusMessage: string | null;
  onSelectOnline: () => void;
  onSelectRiverRun: () => void;
  onStartOffline: () => void;
  onPlayTutorial: () => void;
  onResumeRoom?: () => void;
  onSelectLeaderboard?: () => void;
};

function MobileHeadlineCard() {
  const activity = useQuery(api.activityFeed.getLiveActivity);
  if (!activity) return null;
  const headline = activity.find(
    (e) => (e.type === "big_play" || e.type === "regular_play") && e.word,
  );
  if (!headline?.playerName || !headline.word) return null;

  const delta = Date.now() - headline.createdAt;
  const s = Math.floor(delta / 1000);
  const timeAgo =
    s < 60 ? `${s}s AGO` : s < 3600 ? `${Math.floor(s / 60)}m AGO` : "EARLIER";

  return (
    <div className="mx-[18px] mb-2 flex items-center gap-2.5 rounded-[10px] border border-brass/25 bg-brass/5 px-3 py-2.5">
      <div
        className="grid size-[26px] shrink-0 place-items-center rounded-full text-[9.88px] font-bold leading-none text-[#0c1410] shadow-[0_0_0_2px_#0c2620]"
        style={{ background: "rgb(230, 180, 80)" }}
      >
        {headline.playerName.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-brass">
          HEADLINE &middot; {timeAgo}
        </div>
        <div className="truncate text-xs font-semibold text-cream">
          {headline.playerName} &middot; {headline.word}
          {headline.roomTitle ? ` @ ${headline.roomTitle}` : ""}
        </div>
      </div>
      <span className="shrink-0 font-serif text-[22px] font-semibold text-brass">
        +{headline.score ?? 0}
      </span>
    </div>
  );
}

export function HomeModeMenu({
  activeRoomCode,
  activeRoomTutorialId,
  isStartingOffline,
  isStartingTutorial,
  statusMessage,
  onSelectOnline,
  onStartOffline,
  onPlayTutorial,
  onResumeRoom,
  onSelectLeaderboard,
}: HomeModeMenuProps) {
  const canResumeActiveRoom = Boolean(activeRoomCode && !activeRoomTutorialId);
  const isDisabled = isStartingOffline || isStartingTutorial;

  return (
    <main className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 lg:hidden flex-col">
        {/* <MobileHeadlineCard /> */}

        <div className="flex-1 overflow-auto px-4 pt-2 pb-[70px]">
          <h1 className="font-serif text-[32px] font-semibold leading-[0.95] tracking-[-0.02em] text-cream">
            Choose how{" "}
            <em className="font-serif not-italic italic text-brass">to play</em>
          </h1>
          <p className="mt-2 font-mono text-[10px] tracking-[0.12em] text-cream/50">
            <span className="text-emerald-300">&#9679;</span> 142 ONLINE
            &middot; 6 TABLES
          </p>

          {statusMessage ? (
            <div className="mt-3 rounded-xl border border-cyan-500/15 bg-cyan-950/25 px-3 py-2 text-xs text-cyan-100">
              {statusMessage}
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-2">
            {canResumeActiveRoom ? (
              <button
                type="button"
                onClick={onResumeRoom}
                className="w-full rounded-lg border border-brass/30 bg-brass/6 px-4 py-2.5 text-sm font-medium font-mono text-brass/90 transition-colors hover:border-brass/50 hover:bg-brass/12"
              >
                Resume playing in room {activeRoomCode}
              </button>
            ) : null}

            <ModeCard
              symbol="◐"
              tag="2 MIN"
              label="Tutorial"
              description="Learn the deal &middot; +50 chips"
              badge="REC."
              stat=""
              tone="recommended"
              size="compact"
              disabled={isDisabled}
              onSelect={onPlayTutorial}
            />

            <ModeCard
              symbol="◉"
              tag="6 TABLES OPEN"
              label="Online tables"
              description="142 live opponents in the room"
              stat=""
              tone="online"
              size="compact"
              disabled={isDisabled}
              onSelect={onSelectOnline}
            />

            <ModeCard
              symbol="◎"
              tag="BOTS &middot; NO SIGNUP"
              label="Offline mode"
              description="Practice hands against AI"
              stat=""
              tone="offline"
              size="compact"
              disabled={isDisabled}
              onSelect={onStartOffline}
            />

            {/* <ModeCard
              symbol="◈"
              tag="8 HANDS &middot; DAILY"
              label="River Run"
              description="Solo gauntlet &middot; par 240"
              stat=""
              tone="standings"
              size="compact"
              disabled={isDisabled}
              onSelect={onSelectRiverRun}
            /> */}

            {onSelectLeaderboard ? (
              <ModeCard
                symbol="★"
                tag="WEEKLY STANDINGS"
                label="The standings"
                description="Top players &amp; best words"
                stat=""
                tone="standings"
                size="compact"
                disabled={isDisabled}
                onSelect={onSelectLeaderboard}
              />
            ) : null}
          </div>

          <Tips className="mt-4" />
        </div>
      </div>

      <div
        className="hidden min-h-0 flex-1 lg:grid"
        style={{ gridTemplateColumns: "1.4fr 1fr" }}
      >
        <div className="flex flex-col gap-2.5 overflow-auto px-12 py-10">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-brass">
            WHAT'LL IT BE TONIGHT?
          </div>

          <h1 className="font-serif text-[56px] font-semibold leading-[0.95] tracking-[-0.03em] text-cream">
            Choose how{" "}
            <em className="font-serif not-italic italic text-brass">to play</em>
          </h1>

          <p className="mt-3 max-w-[460px] text-sm text-cream/55">
            Pick a deal. Online matches are seated within thirty seconds;
            offline runs never close.
          </p>

          {statusMessage ? (
            <div className="mt-3 rounded-xl border border-cyan-500/15 bg-cyan-950/25 px-4 py-3 text-sm text-cyan-100">
              {statusMessage}
            </div>
          ) : null}

          <div className="mt-7 flex flex-col gap-2.5">
            {canResumeActiveRoom ? (
              <button
                type="button"
                onClick={onResumeRoom}
                className="w-full rounded-lg border border-brass/30 bg-brass/6 px-4 py-2.5 text-sm font-medium font-mono text-brass/90 transition-colors hover:border-brass/50 hover:bg-brass/12"
              >
                Resume playing in room {activeRoomCode}
              </button>
            ) : null}

            <ModeCard
              symbol="◐"
              tag="WALK-THROUGH &middot; 2 MIN"
              label="Tutorial"
              description="Learn the deal — community letters, pots, and the showdown. Earns +50 chips on completion."
              badge="RECOMMENDED"
              stat="+50 CHIPS"
              tone="recommended"
              disabled={isDisabled}
              onSelect={onPlayTutorial}
            />

            <ModeCard
              symbol="◉"
              tag="LIVE OPPONENTS &middot; NOW"
              label="Online tables"
              description="Play against real opponents. Rooms fill fast — find a seat and ante up."
              stat="JOIN TABLE"
              tone="online"
              disabled={isDisabled}
              onSelect={onSelectOnline}
            />

            <ModeCard
              symbol="◎"
              tag="PRACTICE &middot; ANY TIME"
              label="Offline mode"
              description="Play hands against AI seats. No signup, no clock pressure. Three difficulty rungs."
              stat="BOTS &middot; OFFLINE"
              tone="offline"
              disabled={isDisabled}
              onSelect={onStartOffline}
            />

            {onSelectLeaderboard ? (
              <ModeCard
                symbol="★"
                tag="STANDINGS &middot; WEEKLY"
                label="The standings"
                description="Top players, longest words, biggest pots of the week. See who's ahead."
                stat="LEADERBOARD"
                tone="standings"
                disabled={isDisabled}
                onSelect={onSelectLeaderboard}
              />
            ) : null}
          </div>

          <Tips className="mt-7" />
        </div>

        <div className="overflow-auto border-l border-brass/12 bg-black/18 px-10 py-10 pb-20">
          <LiveFeed className="border-l-0" />
        </div>
      </div>
    </main>
  );
}
