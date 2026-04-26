import { Doc } from "../../../convex/_generated/dataModel";
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
  data: Array<{
    characterId: string;
    stats: Doc<"playerStats"> | null;
  }>;
};

export function AICharacterComparison({ data }: AICharacterComparisonProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data.map(({ characterId, stats }) => {
          const displayName = BOT_DISPLAY_NAMES[characterId] ?? characterId;
          const personality = getPersonalityForCharacter(characterId);
          const badge = PERSONALITY_BADGES[personality] ?? {
            label: personality,
            className: "bg-white/10 text-stone-200",
          };
          const netChips = stats
            ? safeNumber(stats.totalChipsWon) - safeNumber(stats.totalChipsLost)
            : 0;

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

              {stats ? (
                <div className="space-y-3 text-sm">
                  <StatRow label="Games" value={formatNumber(stats.gamesPlayed)} />
                  <StatRow label="Win Rate" value={formatPercent(stats.winRate)} />
                  <StatRow label="Net Chips" value={formatSignedNumber(netChips)} />
                  <StatRow label="Avg Score" value={formatDecimal(stats.avgWordScore)} />
                  <StatRow label="Best Word" value={stats.bestWord ?? "-"} />
                  <StatRow label="Bluffs" value={formatNumber(stats.totalBluffs)} />
                  <StatRow label="Fallbacks" value={formatNumber(stats.totalFallbacks)} />
                  <StatRow label="Avg Hand Strength" value={formatCompactDecimal(stats.avgHandStrength)} />
                </div>
              ) : (
                <p className="text-sm text-stone-500">No data yet</p>
              )}
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
              <TableHead className="h-14 pr-6 text-right text-stone-500">Fallbacks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(({ characterId, stats }) => {
              const displayName = BOT_DISPLAY_NAMES[characterId] ?? characterId;
              const personality = getPersonalityForCharacter(characterId);
              const badge = PERSONALITY_BADGES[personality] ?? {
                label: personality,
                className: "bg-white/10 text-stone-200",
              };
              const netChips = stats
                ? safeNumber(stats.totalChipsWon) - safeNumber(stats.totalChipsLost)
                : 0;

              return (
                <TableRow key={characterId} className="border-white/10 text-stone-200 hover:bg-white/[0.045]">
                  <TableCell className="px-6 font-medium text-white">{displayName}</TableCell>
                  <TableCell>
                    <Badge className={`rounded-full border border-white/8 ${badge.className}`}>
                      {badge.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(stats?.gamesPlayed)}</TableCell>
                  <TableCell className="text-right">
                    {stats ? formatPercent(stats.winRate) : "-"}
                  </TableCell>
                  <TableCell className={`text-right ${netChips >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatSignedNumber(netChips)}
                  </TableCell>
                  <TableCell className="text-right">
                    {stats ? formatDecimal(stats.avgWordScore) : "-"}
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(stats?.totalBluffs)}</TableCell>
                  <TableCell className="pr-6 text-right">{formatNumber(stats?.totalFallbacks)}</TableCell>
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
