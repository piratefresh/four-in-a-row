import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsOverview } from "@/components/admin/StatsOverview";
import { AICharacterComparison } from "@/components/admin/AICharacterComparison";

export const Route = createFileRoute("/admin/stats")({
  component: AdminStatsPage,
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw new Error("Admin stats is only available in development mode");
    }
  },
});

function AdminStatsPage() {
  const [filter, setFilter] = useState<"all" | "players" | "bots">("all");
  const [timeMode, setTimeMode] = useState<"all" | "7d" | "30d" | "custom">("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const timeArgs =
    timeMode === "all"
      ? {}
      : timeMode === "custom" && customStart && customEnd
        ? {
            dateRange: {
              start: new Date(customStart).getTime(),
              end: new Date(customEnd + "T23:59:59").getTime(),
            },
          }
        : { days: timeMode === "7d" ? 7 : 30 };

  const computeArgs = {
    filter,
    ...timeArgs,
  };

  const allCached = useQuery(api.statsCache.getCachedStats, computeArgs);
  const botCached = useQuery(api.statsCache.getCachedStats, { filter: "bots", ...timeArgs });
  const computeStats = useMutation(api.statsCache.computeStats);
  const [computing, setComputing] = useState(false);

  const handleRefresh = async () => {
    setComputing(true);
    try {
      await computeStats({ filter, ...timeArgs });
      await computeStats({ filter: "bots", ...timeArgs });
    } catch (e) {
      console.error("Failed to compute stats", e);
    }
    setComputing(false);
  };

  const allStats = allCached?.stats;
  const botStats = botCached?.stats;
  const isComputing = computing || allCached?.computing || botCached?.computing;
  const computedAt = allCached?.computedAt ?? 0;
  const filters: Array<{ value: typeof filter; label: string }> = [
    { value: "all", label: "All" },
    { value: "players", label: "Players" },
    { value: "bots", label: "AI Characters" },
  ];
  const timePresets: Array<{ value: typeof timeMode; label: string }> = [
    { value: "all", label: "All Time" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[radial-gradient(circle_at_18%_0%,rgba(132,28,38,0.34),transparent_33%),radial-gradient(circle_at_80%_20%,rgba(55,26,18,0.18),transparent_34%),linear-gradient(180deg,#150f10_0%,#080707_46%,#030303_100%)] px-4 py-8 text-stone-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-wrap items-center gap-4">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#d73745] text-lg font-black shadow-[0_0_30px_rgba(215,55,69,0.35)]">
            WP
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-500">
              Admin Intelligence
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-stone-100 sm:text-2xl">
              Player & AI Stats
            </h1>
          </div>
          <div className="rounded-md bg-[#421b22]/80 px-3 py-1 text-sm font-medium text-[#e06478]">
            Development
          </div>
        </div>

        <Tabs defaultValue="leaderboard" className="space-y-8">
          <TabsList className="rounded-full border border-white/10 bg-white/[0.04] p-1 text-stone-400 shadow-2xl shadow-black/30">
            <TabsTrigger
              value="leaderboard"
              className="rounded-full px-4 text-stone-400 data-[state=active]:border-white/10 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              Leaderboard
            </TabsTrigger>
            <TabsTrigger
              value="ai-comparison"
              className="rounded-full px-4 text-stone-400 data-[state=active]:border-white/10 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              AI Characters
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {timePresets.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTimeMode(item.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    timeMode === item.value
                      ? "border-white/16 bg-white/12 text-white"
                      : "border-white/8 bg-black/20 text-stone-500 hover:border-white/16 hover:text-stone-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isComputing}
                className={`ml-auto rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isComputing
                    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/20"
                }`}
              >
                {isComputing ? "Computing..." : "Refresh Stats"}
              </button>
            </div>

            {timeMode === "custom" && (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-200"
                />
                <span className="text-stone-500">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-200"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    filter === item.value
                      ? "border-white/16 bg-white/12 text-white"
                      : "border-white/8 bg-black/20 text-stone-500 hover:border-white/16 hover:text-stone-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {computedAt > 0 && !isComputing && (
              <p className="text-xs text-stone-500">
                Last refreshed: {new Date(computedAt).toLocaleString()}
              </p>
            )}

            {isComputing && (
              <p className="text-sm text-yellow-400/80">
                Computing stats across multiple batches... this may take a moment.
              </p>
            )}

            {allStats && allStats.length > 0 ? (
              <StatsOverview stats={allStats} />
            ) : !isComputing && (
              <p className="text-stone-500">
                No stats cached yet. Click "Refresh Stats" to compute.
              </p>
            )}
          </TabsContent>

          <TabsContent value="ai-comparison">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isComputing}
                className={`ml-auto rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isComputing
                    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/20"
                }`}
              >
                {isComputing ? "Computing..." : "Refresh Stats"}
              </button>
            </div>

            {botStats && botStats.length > 0 ? (
              <AICharacterComparison data={botStats} />
            ) : !isComputing && (
              <p className="text-stone-500">No stats cached yet.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
