import { Brain, Globe2, Trophy, WifiOff } from "lucide-react";
import { Tips } from "./Tips";
import { ModeCard } from "./components/ModeCard";

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

  return (
    <main className="relative flex flex-1 overflow-hidden text-white">
      <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col items-center justify-between px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="w-full max-w-3xl">
          <h1 className="font-display text-4xl font-bold tracking-tight text-cream sm:text-6xl">
            Choose how to play
          </h1>
          <p className="max-w-2xl font-mono text-xs uppercase leading-6 tracking-widest text-gold sm:text-sm sm:leading-7">
            Pick one to continue
          </p>
        </div>

        <div className="grid w-full max-w-3xl flex-1 content-center gap-3 py-4 sm:gap-4 sm:py-8">
          {canResumeActiveRoom ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onResumeRoom}
                className="inline-flex items-center rounded-md border border-white/12 bg-black/25 px-4 py-2 text-sm font-medium text-cream transition-colors hover:border-gold/35 hover:text-white"
              >
                Resume playing in room {activeRoomCode}
              </button>
            </div>
          ) : null}

          <ModeCard
            icon={<Brain className="size-5" strokeWidth={2.25} />}
            label="Tutorial"
            description="Learn in 2 minutes + 50 coins"
            badge="Recommended"
            tone="recommended"
            disabled={isStartingOffline || isStartingTutorial}
            onSelect={onPlayTutorial}
          />

          <ModeCard
            icon={<Globe2 className="size-5" strokeWidth={2.25} />}
            label="Online Mode"
            description="Play live opponents"
            disabled={isStartingOffline || isStartingTutorial}
            onSelect={onSelectOnline}
          />

          <ModeCard
            icon={<WifiOff className="size-5" strokeWidth={2.25} />}
            label="Offline Mode"
            description="Play vs. bots, no signup"
            tone="warm"
            disabled={isStartingOffline || isStartingTutorial}
            onSelect={onStartOffline}
          />

          {/* <ModeCard
            icon={<Waves className="size-5" strokeWidth={2.25} />}
            label="River Run"
            description="Beat the target score"
            tone="warm"
            disabled={isStartingOffline || isStartingTutorial}
            onSelect={onSelectRiverRun}
          /> */}

          {onSelectLeaderboard ? (
            <ModeCard
              icon={<Trophy className="size-5" strokeWidth={2.25} />}
              label="Leaderboard"
              description="Top players & best words"
              onSelect={onSelectLeaderboard}
              disabled={isStartingOffline || isStartingTutorial}
            />
          ) : null}

          <Tips className="mt-1" />
        </div>

        <div className="space-y-3">
          {statusMessage ? (
            <div className="max-w-2xl rounded-xl border border-cyan-500/15 bg-cyan-950/25 p-3 text-sm text-cyan-100">
              {statusMessage}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
