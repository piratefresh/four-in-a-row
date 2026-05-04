import { useState } from "react";
import type { StatsRow } from "./types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlayerStatCard } from "./PlayerStatCard";

type StatsOverviewProps = {
  stats: StatsRow[];
};

export function StatsOverview({ stats }: StatsOverviewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (stats.length === 0) {
    return <p className="text-stone-500">No stats available yet.</p>;
  }

  const sorted = [...stats].sort((a, b) => b.winRate - a.winRate);
  const chartStats = sorted.slice(0, 8);

  return (
    <div className="space-y-7">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/35 shadow-2xl shadow-black/30 backdrop-blur">
        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="h-14 px-6 text-stone-500">Name</TableHead>
              <TableHead className="h-14 text-stone-500">Type</TableHead>
              <TableHead className="h-14 text-right text-stone-500">Games</TableHead>
              <TableHead className="h-14 text-right text-stone-500">Win %</TableHead>
              <TableHead className="h-14 text-right text-stone-500">Net Chips</TableHead>
              <TableHead className="h-14 text-right text-stone-500">Avg Score</TableHead>
              <TableHead className="h-14 text-stone-500">Best Word</TableHead>
              <TableHead className="h-14 text-right text-stone-500">VPIP</TableHead>
              <TableHead className="h-14 pr-6 text-right text-stone-500">Fold %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((stat) => {
              const rowId =
                stat.identity.authUserId ??
                stat.identity.characterId ??
                stat.identity.name;
              const isBot = stat.identity.type === "bot";

              return (
                <TableRow
                  key={rowId}
                  className="cursor-pointer border-white/10 text-stone-200 hover:bg-white/[0.045]"
                  onClick={() =>
                    setExpandedId(expandedId === rowId ? null : rowId)
                  }
                >
                  <TableCell className="px-6 font-medium text-white">
                    {stat.identity.name}
                  </TableCell>
                  <TableCell>
                    {isBot ? (
                      <Badge className="rounded-full border border-white/10 bg-white/12 px-2 text-stone-100">
                        AI
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="rounded-full border-white/15 px-2 text-stone-400"
                      >
                        Player
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(stat.gamesPlayed)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatRate(stat.winRate)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      stat.netChips >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatSignedNumber(stat.netChips)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatDecimal(stat.avgWordScore)}
                  </TableCell>
                  <TableCell>
                    {stat.bestWord ? (
                      <span>
                        {stat.bestWord}{" "}
                        <span className="text-stone-500">
                          ({formatNumber(stat.bestWordScore)})
                        </span>
                      </span>
                    ) : (
                      <span className="text-stone-600">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatRate(stat.vpip)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    {formatRate(stat.foldPercent)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {expandedId && (
        <PlayerStatCard
          stat={
            sorted.find(
              (s) =>
                (s.identity.authUserId ??
                  s.identity.characterId ??
                  s.identity.name) === expandedId,
            )!
          }
          onClose={() => setExpandedId(null)}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <ComparisonPanel
          title="Win rate spread"
          legend={`${chartStats[0]?.identity.name ?? "Leader"} ${formatRate(
            chartStats[0]?.winRate ?? 0,
          )}`}
          points={chartStats.map((stat) => stat.winRate * 100)}
          accent="stroke-[#f1f7a5]"
          fill="rgba(161,214,122,0.18)"
          labels={chartStats.map((stat) => stat.identity.name)}
        />
        <ComparisonPanel
          title="Net chips"
          legend={`${chartStats[0]?.identity.name ?? "Leader"} ${formatSignedNumber(
            chartStats[0]?.netChips ?? 0,
          )}`}
          points={chartStats.map((stat) => stat.netChips)}
          accent="stroke-[#f09975]"
          fill="rgba(209,77,91,0.16)"
          labels={chartStats.map((stat) => stat.identity.name)}
        />
      </div>
    </div>
  );
}

function ComparisonPanel({
  title,
  legend,
  points,
  accent,
  fill,
  labels,
}: {
  title: string;
  legend: string;
  points: number[];
  accent: string;
  fill: string;
  labels: string[];
}) {
  const path = buildChartPath(points);
  const areaPath = path ? `${path} L 100 82 L 0 82 Z` : "";

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-6 shadow-2xl shadow-black/25">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm text-stone-400">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#f1f7a5]" />
            {legend}
          </p>
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">
          Live
        </div>
      </div>
      <div className="relative h-52">
        <div className="absolute inset-x-0 top-4 border-t border-dashed border-white/10" />
        <div className="absolute inset-x-0 top-1/3 border-t border-dashed border-white/10" />
        <div className="absolute inset-x-0 top-2/3 border-t border-dashed border-white/10" />
        <svg
          viewBox="0 0 100 90"
          preserveAspectRatio="none"
          className="relative h-full w-full"
        >
          {areaPath ? <path d={areaPath} fill={fill} /> : null}
          {path ? (
            <path
              d={path}
              fill="none"
              className={`${accent} drop-shadow`}
              strokeWidth="1.8"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-stone-500">
        {labels.slice(0, 4).map((label) => (
          <span key={label} className="truncate">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function buildChartPath(values: number[]) {
  const safeValues = values.map((v) => (Number.isFinite(v) ? v : 0));
  if (safeValues.length === 0) return "";
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;

  return safeValues
    .map((value, index) => {
      const x =
        safeValues.length === 1 ? 0 : (index / (safeValues.length - 1)) * 100;
      const y = 76 - ((value - min) / range) * 58;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
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

function formatRate(value: number | null | undefined) {
  return `${((Number.isFinite(value) ? Number(value) : 0) * 100).toFixed(1)}%`;
}
