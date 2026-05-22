interface HeaderProps {
  onCreateRoom: () => void;
  isCreating: boolean;
}

export function Header({ onCreateRoom, isCreating }: HeaderProps) {
  return (
    <header className="flex items-end justify-between px-6 pb-3 pt-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          Bet. Make / Word
        </div>
        <h1 className="mt-1 font-serif text-3xl italic text-cream">Rooms</h1>
      </div>

      <button
        type="button"
        onClick={onCreateRoom}
        disabled={isCreating}
        className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-gold bg-linear-to-b from-gold-bright via-gold to-[#a8801f] px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-felt-deep transition-[filter,transform] hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreating ? "Opening..." : "New room"}
      </button>
    </header>
  );
}
