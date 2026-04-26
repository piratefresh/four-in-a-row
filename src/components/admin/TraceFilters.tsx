import { Search, SlidersHorizontal } from "lucide-react";

export type TraceCategory =
  | "game_start"
  | "game_action"
  | "stage_change"
  | "showdown_submit"
  | "game_complete"
  | "ai_betting"
  | "ai_showdown"
  | "ai_dialogue";

export type TraceGroup = "all" | "game" | "ai" | "dialogue";

type TraceFiltersProps = {
  group: TraceGroup;
  onGroupChange: (group: TraceGroup) => void;
  search: string;
  onSearchChange: (search: string) => void;
  botOnly: boolean;
  onBotOnlyChange: (botOnly: boolean) => void;
  fallbackOnly: boolean;
  onFallbackOnlyChange: (fallbackOnly: boolean) => void;
  failedOnly: boolean;
  onFailedOnlyChange: (failedOnly: boolean) => void;
};

const GROUPS: Array<{ value: TraceGroup; label: string }> = [
  { value: "all", label: "All" },
  { value: "game", label: "Game" },
  { value: "ai", label: "AI" },
  { value: "dialogue", label: "Dialogue" },
];

export function TraceFilters({
  group,
  onGroupChange,
  search,
  onSearchChange,
  botOnly,
  onBotOnlyChange,
  fallbackOnly,
  onFallbackOnlyChange,
  failedOnly,
  onFailedOnlyChange,
}: TraceFiltersProps) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0c0d10]">
      <div className="flex flex-col gap-3 border-b border-white/10 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1">
          {GROUPS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onGroupChange(item.value)}
              className={`h-8 rounded-sm px-3 text-xs font-medium transition-colors ${
                group === item.value
                  ? "bg-white text-black"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="flex h-9 min-w-0 items-center gap-2 rounded-sm border border-white/10 bg-black/30 px-3 text-white/60 lg:w-[420px]">
          <Search className="h-4 w-4 flex-none" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search player, word, action, prompt..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3 text-xs">
        <span className="flex items-center gap-2 pr-2 font-medium uppercase text-white/60">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </span>
        <FilterChip
          label="Bots"
          active={botOnly}
          onClick={() => onBotOnlyChange(!botOnly)}
        />
        <FilterChip
          label="Fallbacks"
          active={fallbackOnly}
          onClick={() => onFallbackOnlyChange(!fallbackOnly)}
        />
        <FilterChip
          label="Failures"
          active={failedOnly}
          onClick={() => onFailedOnlyChange(!failedOnly)}
        />
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-2.5 py-1 transition-colors ${
        active
          ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100"
          : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

