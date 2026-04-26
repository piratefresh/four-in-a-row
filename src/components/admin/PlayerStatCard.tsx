import { X } from "lucide-react";
import { Doc } from "../../../convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";

type PlayerStatCardProps = {
  stat: Doc<"playerStats">;
  onClose: () => void;
};

export function PlayerStatCard({ stat, onClose }: PlayerStatCardProps) {
  const totalActions =
    safeNumber(stat.totalChecks) +
    safeNumber(stat.totalCalls) +
    safeNumber(stat.totalRaises) +
    safeNumber(stat.totalFolds);
  const foldRate =
    totalActions > 0 ? (safeNumber(stat.totalFolds) / totalActions) * 100 : 0;
  const raiseRate =
    totalActions > 0 ? (safeNumber(stat.totalRaises) / totalActions) * 100 : 0;
  const callRate =
    totalActions > 0 ? (safeNumber(stat.totalCalls) / totalActions) * 100 : 0;
  const checkRate =
    totalActions > 0 ? (safeNumber(stat.totalChecks) / totalActions) * 100 : 0;
  const netChips = safeNumber(stat.totalChipsWon) - safeNumber(stat.totalChipsLost);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
            Selected profile
          </p>
          <h3 className="text-lg font-semibold text-white">{stat.playerName}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close player details"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/8 text-stone-400 transition-colors hover:bg-white/14 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatBlock label="Games Played" value={formatNumber(stat.gamesPlayed)} />
          <StatBlock label="Games Won" value={formatNumber(stat.gamesWon)} />
          <StatBlock label="Win Rate" value={formatPercent(stat.winRate)} />
          <StatBlock label="Net Chips" value={formatSignedNumber(netChips)} />
          <StatBlock label="Best Chip Finish" value={formatNumber(stat.bestChipFinish)} />
          <StatBlock label="Showdowns Reached" value={formatNumber(stat.showdownsReached)} />
          <StatBlock label="Showdowns Won" value={formatNumber(stat.showdownsWon)} />
          <StatBlock label="Words Submitted" value={formatNumber(stat.wordsSubmitted)} />
          <StatBlock label="Avg Word Score" value={formatDecimal(stat.avgWordScore)} />
          <StatBlock label="Best Word" value={stat.bestWord ?? "-"} />
          <StatBlock label="Best Word Score" value={formatNumber(stat.bestWordScore)} />
          <StatBlock label="Longest Word" value={stat.longestWord ?? "-"} />
        </div>

        <div className="mt-8">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
            Betting Actions
          </h4>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatBlock label="Check" value={`${formatNumber(stat.totalChecks)} (${formatPercentFromNumber(checkRate)})`} />
            <StatBlock label="Call" value={`${formatNumber(stat.totalCalls)} (${formatPercentFromNumber(callRate)})`} />
            <StatBlock label="Raise" value={`${formatNumber(stat.totalRaises)} (${formatPercentFromNumber(raiseRate)})`} />
            <StatBlock label="Fold" value={`${formatNumber(stat.totalFolds)} (${formatPercentFromNumber(foldRate)})`} />
          </div>
        </div>

        {stat.isBot && (
          <div className="mt-8">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
              AI Stats
            </h4>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <StatBlock label="Total Bluffs" value={formatNumber(stat.totalBluffs)} />
              <StatBlock label="Total Fallbacks" value={formatNumber(stat.totalFallbacks)} />
              <StatBlock label="Avg Hand Strength" value={formatCompactDecimal(stat.avgHandStrength)} />
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/6 bg-white/[0.045] p-3">
      <div className="text-sm text-stone-400">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function formatNumber(value: number | null | undefined) {
  return safeNumber(value).toLocaleString();
}

function formatSignedNumber(value: number | null | undefined) {
  const safeValue = safeNumber(value);
  return `${safeValue > 0 ? "+" : ""}${safeValue.toLocaleString()}`;
}

function formatDecimal(value: number | null | undefined) {
  return safeNumber(value).toFixed(1);
}

function formatCompactDecimal(value: number | null | undefined) {
  return safeNumber(value).toFixed(2);
}

function formatPercent(value: number | null | undefined) {
  return `${(safeNumber(value) * 100).toFixed(1)}%`;
}

function formatPercentFromNumber(value: number | null | undefined) {
  return `${safeNumber(value).toFixed(1)}%`;
}
