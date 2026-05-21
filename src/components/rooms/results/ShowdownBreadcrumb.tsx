type ShowdownBreadcrumbProps = {
  roomName: string;
  handNumber?: number;
  onBack: () => void;
};

export function ShowdownBreadcrumb({
  roomName,
  handNumber,
  onBack,
}: ShowdownBreadcrumbProps) {
  return (
    <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.18)] px-4 py-3.5 lg:px-7">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(0,0,0,0.3)]"
          aria-label="Go back"
        >
          <svg width="9" height="13" viewBox="0 0 9 13" fill="none">
            <path
              d="M7 1L2 6.5L7 12"
              stroke="#d4af37"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="hidden font-mono text-[10px] tracking-[2px] text-[rgba(212,175,55,0.65)] lg:block">
          RESULTS
          {" · "}
          {handNumber ? <>HAND {handNumber} · </> : null}
          <span className="text-gold">{roomName.toUpperCase()}</span>
        </div>

        <div className="font-mono text-[10px] tracking-[2px] text-[rgba(212,175,55,0.65)] lg:hidden">
          {roomName.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
