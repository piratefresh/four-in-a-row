type RoomDevToolsProps = {
  isDevRejoining: boolean;
  isDevFillingBots: boolean;
  isRoomFull: boolean;
  onRejoin: () => void;
  onFillBots: () => void;
};

export function RoomDevTools({
  isDevRejoining,
  isDevFillingBots,
  isRoomFull,
  onRejoin,
  onFillBots,
}: RoomDevToolsProps) {
  return (
    <div className="fixed left-4 top-20 z-50 rounded-lg border border-cyan-700 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur-sm">
      <div className="text-sm font-semibold">Development</div>
      <div className="mt-1 text-xs text-slate-300">
        You are not an active player in this room.
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRejoin}
          disabled={isDevRejoining}
          className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isDevRejoining ? "Rejoining..." : "Rejoin room"}
        </button>
        <button
          type="button"
          onClick={onFillBots}
          disabled={isDevFillingBots || isRoomFull}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isDevFillingBots ? "Adding..." : "Add 2 test players"}
        </button>
      </div>
    </div>
  );
}
