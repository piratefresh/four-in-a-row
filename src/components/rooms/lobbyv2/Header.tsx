interface HeaderProps {
  onCreateRoom: () => void;
  isCreating: boolean;
}

export function Header({ onCreateRoom, isCreating }: HeaderProps) {
  return (
    <header className="flex items-end justify-between px-6 pt-6 pb-3">
      <div>
        <div className="text-brass font-mono text-[10px] uppercase tracking-[0.3em]">
          BET. MAKE Â· WORD
        </div>
        <h1 className="text-3xl font-serif italic text-cream mt-1">Rooms</h1>
      </div>

      <button
        type="button"
        onClick={onCreateRoom}
        disabled={isCreating}
        className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-[#806316] bg-linear-to-b from-gold-bright via-brass via-60% to-[#a8801f] px-4.5 py-3 font-mono text-xs font-bold uppercase tracking-widest text-[#1a1208] transition-[filter,transform] hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreating ? "Opening..." : "New room"}
      </button>
    </header>
  );
}
