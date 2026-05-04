import { X } from "lucide-react";
import type { StatsRow } from "./types";
import { ScrollArea } from "@/components/ui/scroll-area";

type PlayerStatCardProps = {
  stat: StatsRow;
  onClose: () => void;
};

export function PlayerStatCard({ stat, onClose }: PlayerStatCardProps) {
  const isBot = stat.identity.type === "bot";
  const totalActions =
    stat.totalChecks + stat.totalCalls + stat.totalRaises + stat.totalFolds;
  const raiseRate = totalActions > 0 ? (stat.totalRaises / totalActions) * 100 : 0;
  const callRate = totalActions > 0 ? (stat.totalCalls / totalActions) * 100 : 0;
  const checkRate = totalActions > 0 ? (stat.totalChecks / totalActions) * 100 : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
            Selected profile
          </p>
          <h3 className="text-lg font-semibold text-white">{stat.identity.name}</h3>
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
          <StatBlock label="Win Rate" value={formatRate(stat.winRate)} />
          <StatBlock label="Net Chips" value={formatSignedNumber(stat.netChips)} />
          <StatBlock label="Best Chip Finish" value={formatNumber(stat.bestChipFinish)} />
          <StatBlock label="VPIP" value={formatRate(stat.vpip)} />
          <StatBlock label="Aggression Factor" value={formatDecimal(stat.aggressionFactor)} />
          <StatBlock label="Showdowns Reached" value={formatNumber(stat.showdownsReached)} />
          <StatBlock label="Showdowns Won" value={formatNumber(stat.showdownsWon)} />
          <StatBlock label="Words Submitted" value={formatNumber(stat.totalWords)} />
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
            <StatBlock
              label="Check"
              value={`${formatNumber(stat.totalChecks)} (${formatPctNum(checkRate)})`}
            />
            <StatBlock
              label="Call"
              value={`${formatNumber(stat.totalCalls)} (${formatPctNum(callRate)})`}
            />
            <StatBlock
              label="Raise"
              value={`${formatNumber(stat.totalRaises)} (${formatPctNum(raiseRate)})`}
            />
            <StatBlock
              label="Fold"
              value={`${formatNumber(stat.totalFolds)} (${formatRate(stat.foldPercent)})`}
            />
          </div>
        </div>

        <div className="mt-8">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
            Fold by Stage
          </h4>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatBlock label="Preflop" value={formatNumber(stat.foldsByStage.preflop)} />
            <StatBlock label="Flop" value={formatNumber(stat.foldsByStage.flop)} />
            <StatBlock label="Turn" value={formatNumber(stat.foldsByStage.turn)} />
            <StatBlock label="Final" value={formatNumber(stat.foldsByStage.final)} />
          </div>
        </div>

        {isBot && (
          <div className="mt-8">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
              AI Stats
            </h4>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <StatBlock label="Total Bluffs" value={formatNumber(stat.totalBluffs)} />
              <StatBlock label="Total Fallbacks" value={formatNumber(stat.totalFallbacks)} />
              <StatBlock label="Bluff Rate" value={formatRate(stat.bluffRate)} />
              <StatBlock label="Fallback Rate" value={formatRate(stat.fallbackRate)} />
              <StatBlock label="Avg Hand Strength" value={formatCompactDecimal(stat.avgHandStrength)} />
              <StatBlock label="Avg Latency" value={stat.avgLatencyMs ? `${formatDecimal(stat.avgLatencyMs)}ms` : "-"} />
              <StatBlock label="AI Decisions" value={formatNumber(stat.totalAiDecisions)} />
              <StatBlock label="AI Successes" value={formatNumber(stat.totalAiSuccesses)} />
              <StatBlock label="AI Failures" value={formatNumber(stat.totalAiFailures)} />
            </div>
          </div>
        )}

        {stat.recentWords.length > 0 && (
          <div className="mt-8">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
              Recent Words ({Math.min(stat.recentWords.length, 10)} of {stat.totalWords})
            </h4>
            <div className="space-y-2">
              {stat.recentWords.slice(0, 10).map((w, i) => (
                <div
                  key={`${w.word}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-white/6 bg-white/[0.045] px-3 py-2 text-sm"
                >
                  <span className="font-medium text-white">{w.word}</span>
                  <span className="text-stone-500">{w.score}</span>
                </div>
              ))}
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

function formatNumber(value: number | null | undefined) {
  return (Number.isFinite(value) ? Number(value) : 0).toLocaleString();
}

function formatSignedNumber(value: number | null | undefined) {
  const safe = Number.isFinite(value) ? Number(value) : 0;
  return `${safe > 0 ? "+" : ""}${safe.toLocaleString()}`;
}

function formatDecimal(value: number | null | undefined) {
  return (Number.isFinite(value) ? Number(value) : 0).toFixed(1);
}

function formatCompactDecimal(value: number | null | undefined) {
  return (Number.isFinite(value) ? Number(value) : 0).toFixed(2);
}

function formatRate(value: number | null | undefined) {
  return `${((Number.isFinite(value) ? Number(value) : 0) * 100).toFixed(1)}%`;
}

function formatPctNum(value: number | null | undefined) {
  return `${(Number.isFinite(value) ? Number(value) : 0).toFixed(1)}%`;
}
