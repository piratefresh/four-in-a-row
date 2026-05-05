import { Brain, Globe2, Trophy, Waves, WifiOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tips } from "./Tips";
import { ModeCard } from "./components/ModeCard";

type OfflineDifficulty = "easy" | "medium" | "hard";

const OFFLINE_DIFFICULTY_OPTIONS: Array<{
  value: OfflineDifficulty;
  label: string;
  description: string;
}> = [
  {
    value: "easy",
    label: "Easy",
    description: "More mistakes, folds more often",
  },
  { value: "medium", label: "Medium", description: "Balanced" },
  { value: "hard", label: "Hard", description: "Sharper and more aggressive" },
];

type HomeModeMenuProps = {
  activeRoomCode?: string | null;
  activeRoomTutorialId?: string | null;
  isStartingOffline: boolean;
  isStartingTutorial: boolean;
  offlineDifficulty: OfflineDifficulty;
  statusMessage: string | null;
  onOfflineDifficultyChange: (difficulty: OfflineDifficulty) => void;
  onSelectOnline: () => void;
  onSelectRiverRun: () => void;
  onStartOffline: (difficulty: OfflineDifficulty) => void;
  onPlayTutorial: () => void;
  onResumeRoom?: () => void;
  onSelectLeaderboard?: () => void;
};

export function HomeModeMenu({
  activeRoomCode,
  activeRoomTutorialId,
  isStartingOffline,
  isStartingTutorial,
  offlineDifficulty,
  statusMessage,
  onOfflineDifficultyChange,
  onSelectOnline,
  onSelectRiverRun,
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ModeCard
                icon={<WifiOff className="size-5" strokeWidth={2.25} />}
                label="Offline Mode"
                description="Play vs. bots, no signup"
                tone="warm"
                disabled={isStartingOffline || isStartingTutorial}
                interactive
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-72 rounded-xl border-gold/25 bg-ink/95 p-2 text-cream/75 shadow-2xl shadow-black/45 backdrop-blur"
            >
              <DropdownMenuLabel className="px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-gold/80">
                Choose bot difficulty
              </DropdownMenuLabel>
              {OFFLINE_DIFFICULTY_OPTIONS.map((option) => {
                const selected = offlineDifficulty === option.value;

                return (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => {
                      onOfflineDifficultyChange(option.value);
                      onStartOffline(option.value);
                    }}
                    className={`block rounded-lg px-3 py-2 text-left transition-colors ${
                      selected
                        ? "bg-felt-deep/80 text-cream"
                        : "text-cream/75 hover:bg-white/5 hover:text-cream data-highlighted:bg-white/5 data-highlighted:text-cream"
                    }`}
                  >
                    <span className="block text-sm font-medium">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-4 text-current opacity-75">
                      {option.description}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

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
