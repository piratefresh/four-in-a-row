type HomeModeMenuProps = {
  activeRoomCode?: string | null;
  activeRoomTutorialId?: string | null;
  isStartingOffline: boolean;
  isStartingTutorial: boolean;
  statusMessage: string | null;
  onSelectOnline: () => void;
  onStartOffline: () => void;
  onPlayTutorial: () => void;
  onResumeRoom?: () => void;
  onReplayTutorial?: () => void;
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
  onReplayTutorial,
}: HomeModeMenuProps) {
  const offlineCtaLabel = isStartingOffline
    ? "Setting up table..."
    : "Start offline game";
  const tutorialCtaLabel = isStartingTutorial
    ? activeRoomTutorialId
      ? "Resetting tutorial..."
      : "Setting up tutorial..."
    : "Play tutorial";

  return (
    <main className="relative overflow-hidden bg-[#07120f] text-white flex flex-1">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,171,76,0.2),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(18,95,71,0.26),transparent_34%),linear-gradient(160deg,#0b1712_0%,#050806_54%,#020303_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f4d27a]/70 to-transparent" />

      <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col justify-between items-center px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="font-serif text-4xl tracking-tight text-[#fbf5e8] sm:text-6xl">
            Choose your table.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d4d0c5] sm:mt-5 sm:text-lg sm:leading-7">
            Jump into a live room with other players or spin up an instant solo
            table against bots.
          </p>
        </div>

        <div className="grid flex-1 content-center gap-3 py-4 sm:gap-4 sm:py-8 lg:grid-cols-2">
          {activeRoomCode ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onResumeRoom}
                className="inline-flex items-center rounded-full border border-white/12 bg-black/25 px-4 py-2 text-sm font-medium text-[#f1eee4] transition-colors hover:border-[#d5b35f]/35 hover:text-white"
              >
                {activeRoomTutorialId
                  ? `Resume your tutorial table ${activeRoomCode}`
                  : `Resume playing in room ${activeRoomCode}`}
              </button>

              {activeRoomTutorialId ? (
                <button
                  type="button"
                  onClick={onReplayTutorial}
                  className="inline-flex items-center rounded-full border border-[#d5b35f]/30 bg-[#1c1406]/70 px-4 py-2 text-sm font-medium text-[#f3deb0] transition-colors hover:border-[#d5b35f]/55 hover:text-[#fff0cb]"
                >
                  Replay tutorial
                </button>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={onSelectOnline}
            className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,33,28,0.94),rgba(7,10,9,0.98))] p-5 text-left shadow-[0_24px_60px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:-translate-y-1 hover:border-[#d5b35f]/40 sm:p-6"
          >
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#f6d78c]/80 to-transparent opacity-80" />
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#d5b35f]">
              Online Play
            </p>
            <h2 className="mt-3 font-serif text-2xl text-[#fcf7ea] sm:mt-4 sm:text-3xl">
              Browse open rooms
            </h2>
            <p className="mt-2 max-w-md text-sm leading-5 text-[#cbc5b7] sm:mt-3 sm:leading-6">
              Check live tables, inspect seat availability, and join any room
              from the public lobby.
            </p>
            <div className="mt-5 inline-flex items-center rounded-full border border-[#d5b35f]/35 px-4 py-2 text-sm font-medium text-[#f3deb0] sm:mt-8">
              Browse online rooms
            </div>
          </button>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(49,28,12,0.94),rgba(11,10,8,0.98))] p-5 text-left shadow-[0_24px_60px_rgba(0,0,0,0.4)] sm:p-6">
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#f6a96d]/80 to-transparent opacity-80" />
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#f2a165]">
              Offline Play
            </p>
            <h2 className="mt-3 font-serif text-2xl text-[#fcf4ea] sm:mt-4 sm:text-3xl">
              Quick start vs bots
            </h2>
            <p className="mt-2 max-w-md text-sm leading-5 text-[#d6c5b8] sm:mt-3 sm:leading-6">
              Create a fresh room, fill the table with bots, and drop straight
              into a playable hand.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 sm:mt-8">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onStartOffline}
                  disabled={isStartingOffline || isStartingTutorial}
                  className="inline-flex items-center rounded-full border border-[#f2a165]/35 px-4 py-2 text-sm font-medium text-[#f4cfb0] transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#f1a15c]/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {offlineCtaLabel}
                </button>
                <button
                  type="button"
                  onClick={onPlayTutorial}
                  disabled={isStartingOffline || isStartingTutorial}
                  className="inline-flex items-center rounded-full border border-[#d7b45e]/35 bg-[#1a1509]/60 px-4 py-2 text-sm font-medium text-[#f4d99d] transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#d7b45e]/50 hover:text-[#fff0cb] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {tutorialCtaLabel}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {statusMessage ? (
            <div className="max-w-2xl rounded-2xl border border-cyan-500/15 bg-cyan-950/25 p-3 text-sm text-cyan-100">
              {statusMessage}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
