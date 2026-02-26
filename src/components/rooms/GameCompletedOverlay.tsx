type GameCompletedOverlayProps = {
  isWinner: boolean;
  playerName: string;
  onReturnHome?: () => void;
  onLeaveRoom?: () => void;
};

export function GameCompletedOverlay({
  isWinner,
  playerName,
  onReturnHome,
  onLeaveRoom,
}: GameCompletedOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-8 px-12 py-16">
        {isWinner ? (
          <>
            {/* Winner Animation */}
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/30 blur-2xl" />
              <div className="relative animate-bounce text-[120px]">🏆</div>
            </div>

            {/* Winner Text */}
            <div className="text-center">
              <h1 className="mb-4 animate-pulse bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-[96px] font-bold leading-none text-transparent">
                VICTORY!
              </h1>
              <p className="text-[40px] font-semibold text-amber-200">
                Well played, {playerName}!
              </p>
              <p className="mt-2 text-[28px] text-amber-300/80">
                You dominated the table
              </p>
            </div>

            {/* Decorative elements */}
            <div className="flex gap-8 text-[48px]">
              <span className="animate-bounce delay-100">🎉</span>
              <span className="animate-bounce delay-200">✨</span>
              <span className="animate-bounce delay-300">🎊</span>
            </div>
          </>
        ) : (
          <>
            {/* Loser Animation */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-slate-600/20 blur-2xl" />
              <div className="relative text-[120px] opacity-80">😔</div>
            </div>

            {/* Loser Text */}
            <div className="text-center">
              <h1 className="mb-4 text-[96px] font-bold leading-none text-slate-300">
                DEFEATED
              </h1>
              <p className="text-[40px] font-semibold text-slate-400">
                Not this time, {playerName}
              </p>
              <p className="mt-2 text-[28px] text-slate-500">
                Every defeat is a lesson
              </p>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-6">
          {onReturnHome && (
            <button
              onClick={onReturnHome}
              className={`group relative overflow-hidden rounded-xl px-12 py-6 text-[28px] font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 ${
                isWinner
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600"
                  : "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600"
              }`}
            >
              <span className="relative z-10">Play Again</span>
              <div className="absolute inset-0 -z-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </button>
          )}
          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 px-12 py-6 text-[28px] font-bold text-slate-200 shadow-2xl transition-all duration-300 hover:scale-105 hover:from-slate-600 hover:to-slate-700"
            >
              <span className="relative z-10">Leave Room</span>
              <div className="absolute inset-0 -z-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </button>
          )}
        </div>

        {/* Subtle hint */}
        <p className="mt-4 text-[18px] text-slate-400">
          Press ESC or click a button to continue
        </p>
      </div>
    </div>
  );
}
