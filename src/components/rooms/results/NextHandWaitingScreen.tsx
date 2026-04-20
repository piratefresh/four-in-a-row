type NextHandWaitingScreenProps = {
  readyCount: number;
  totalPlayers: number;
  isReady: boolean;
  canToggleReady: boolean;
  isUpdatingNextHand: boolean;
  nextHandError: string | null;
  onToggleReady: () => Promise<void> | void;
};

export function NextHandWaitingScreen({
  readyCount,
  totalPlayers,
  isReady,
  canToggleReady,
  isUpdatingNextHand,
  nextHandError,
  onToggleReady,
}: NextHandWaitingScreenProps) {
  const playersRemaining = Math.max(0, totalPlayers - readyCount);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,#19160d_0%,#090909_28%,#050505_100%)] text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[430px] flex-col justify-center px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]">
        <div className="rounded-[24px] border border-[#f3d66f]/18 bg-[linear-gradient(180deg,rgba(24,20,12,0.95),rgba(12,12,12,0.98))] p-6 shadow-[0_18px_46px_rgba(0,0,0,0.38)]">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#d8b84a]">
            Next Hand
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#f8f0da]">
            Waiting for the table.
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Players stay on the results screen until they opt into the next
            hand. The table only advances once everyone is ready.
          </p>

          <div className="mt-6 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[12px] uppercase tracking-[0.2em] text-white/38">
                  Ready Players
                </div>
                <div className="mt-1 text-3xl font-semibold text-[#f4d37a]">
                  {readyCount}/{totalPlayers}
                </div>
              </div>
              <div className="text-right text-sm text-white/52">
                {playersRemaining === 0
                  ? "Dealing now..."
                  : `${playersRemaining} ${playersRemaining === 1 ? "player" : "players"} left`}
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#f7da61_0%,#d6ac24_100%)] transition-[width] duration-300"
                style={{
                  width:
                    totalPlayers > 0
                      ? `${(readyCount / totalPlayers) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void onToggleReady();
            }}
            disabled={isUpdatingNextHand || !canToggleReady}
            className="mt-6 w-full rounded-[14px] border border-[#f3d66f]/55 bg-[linear-gradient(180deg,#f7da61_0%,#d6ac24_100%)] px-6 py-5 text-lg font-semibold text-[#241700] shadow-[0_0_0_1px_rgba(255,235,163,0.12),0_12px_28px_rgba(0,0,0,0.45),0_0_22px_rgba(243,214,111,0.22)] transition-transform duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isUpdatingNextHand
              ? "Updating..."
              : !canToggleReady
                ? "Seat unavailable"
                : isReady
                  ? "Not Ready"
                  : "I'm Ready"}
          </button>

          <p className="mt-3 text-center text-sm text-white/54">
            {canToggleReady
              ? isReady
                ? "You are queued for the next hand."
                : "Review the showdown, then join when you're ready."
              : "Your previous seat is no longer available in this room."}
          </p>

          {nextHandError ? (
            <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              {nextHandError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
