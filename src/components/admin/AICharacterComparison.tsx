import type { StatsRow } from "./types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PERSONALITY_BADGES: Record<string, { label: string; className: string }> = {
  cautious: { label: "Cautious", className: "bg-amber-300/15 text-amber-200" },
  balanced: { label: "Balanced", className: "bg-sky-300/15 text-sky-200" },
  aggressive: { label: "Aggressive", className: "bg-rose-300/15 text-rose-200" },
  creative: { label: "Creative", className: "bg-fuchsia-300/15 text-fuchsia-200" },
};

const BOT_DISPLAY_NAMES: Record<string, string> = {
  nora: "Nora Vale",
  ellis: "Ellis March",
  jax: "Jax Rook",
  mira: "Mira Quill",
};

type AICharacterComparisonProps = {
  data: StatsRow[];
};

export function AICharacterComparison({ data }: AICharacterComparisonProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data.map((stat) => {
          const characterId = stat.identity.characterId ?? "unknown";
          const displayName = BOT_DISPLAY_NAMES[characterId] ?? stat.identity.name;
          const personality = getPersonalityForCharacter(characterId);
          const badge = PERSONALITY_BADGES[personality] ?? {
            label: personality,
            className: "bg-white/10 text-stone-200",
          };

          return (
            <div
              key={characterId}
              className="rounded-xl border border-white/10 bg-black/30 p-5 shadow-2xl shadow-black/25"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white">{displayName}</h3>
                <Badge className={`rounded-full border border-white/8 ${badge.className}`}>
                  {badge.label}
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                <StatRow label="Games" value={formatNumber(stat.gamesPlayed)} />
                <StatRow label="Win Rate" value={formatRate(stat.winRate)} />
                <StatRow label="Net Chips" value={formatSignedNumber(stat.netChips)} />
                <StatRow label="Avg Score" value={formatDecimal(stat.avgWordScore)} />
                <StatRow label="Best Word" value={stat.bestWord ?? "-"} />
                <StatRow label="Bluffs" value={formatNumber(stat.totalBluffs)} />
                <StatRow label="Bluff Rate" value={formatRate(stat.bluffRate)} />
                <StatRow label="Fallbacks" value={formatNumber(stat.totalFallbacks)} />
                <StatRow label="Fallback Rate" value={formatRate(stat.fallbackRate)} />
                <StatRow label="VPIP" value={formatRate(stat.vpip)} />
                <StatRow label="Aggression" value={formatDecimal(stat.aggressionFactor)} />
                <StatRow label="Avg Hand Str" value={formatCompactDecimal(stat.avgHandStrength)} />
                <StatRow label="Avg Latency" value={stat.avgLatencyMs ? `${formatDecimal(stat.avgLatencyMs)}ms` : "-"} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/35 shadow-2xl shadow-black/30 backdrop-blur">
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="h-14 px-6 text-stone-500">Character</TableHead>
              <TableHead className="h-14 text-stone-500">Personality</TableHead>
              <TableHead className="h-14 text-right text-stone-500">Games</TableHead>
              <TableHead className="h-14 text-right text-stone-500">Win %</TableHead>
              <TableHead className="h-14 text-right text-stone-500">Net Chips</TableHead>
              <TableHead className="h-14 text-right text-stone-500">Avg Score</TableHead>
              <TableHead className="h-14 text-right text-stone-500">Bluffs</TableHead>
              <TableHead className="h-14 text-right text-stone-500">Fallbacks</TableHead>
              <TableHead className="h-14 pr-6 text-right text-stone-500">VPIP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((stat) => {
              const characterId = stat.identity.characterId ?? "unknown";
              const displayName = BOT_DISPLAY_NAMES[characterId] ?? stat.identity.name;
              const personality = getPersonalityForCharacter(characterId);
              const badge = PERSONALITY_BADGES[personality] ?? {
                label: personality,
                className: "bg-white/10 text-stone-200",
              };

              return (
                <TableRow key={characterId} className="border-white/10 text-stone-200 hover:bg-white/[0.045]">
                  <TableCell className="px-6 font-medium text-white">{displayName}</TableCell>
                  <TableCell>
                    <Badge className={`rounded-full border border-white/8 ${badge.className}`}>
                      {badge.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(stat.gamesPlayed)}</TableCell>
                  <TableCell className="text-right">{formatRate(stat.winRate)}</TableCell>
                  <TableCell className={`text-right ${stat.netChips >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatSignedNumber(stat.netChips)}
                  </TableCell>
                  <TableCell className="text-right">{formatDecimal(stat.avgWordScore)}</TableCell>
                  <TableCell className="text-right">{formatNumber(stat.totalBluffs)}</TableCell>
                  <TableCell className="text-right">{formatNumber(stat.totalFallbacks)}</TableCell>
                  <TableCell className="pr-6 text-right">{formatRate(stat.vpip)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function getPersonalityForCharacter(characterId: string): string {
  const personalities: Record<string, string> = {
    nora: "cautious",
    ellis: "balanced",
    jax: "aggressive",
    mira: "creative",
  };
  return personalities[characterId] ?? "unknown";
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/6 pb-2 last:border-b-0">
      <span className="text-stone-500">{label}</span>
      <span className="truncate font-medium text-stone-100">{value}</span>
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
