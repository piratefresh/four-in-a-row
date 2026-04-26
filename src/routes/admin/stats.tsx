import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "convex/react";
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

  const allStats = useQuery(api.playerStats.getAllStats, { filter });
  const aiComparison = useQuery(api.playerStats.getAICharacterComparison);
  const filters: Array<{ value: typeof filter; label: string }> = [
    { value: "all", label: "All" },
    { value: "players", label: "Players" },
    { value: "bots", label: "AI Characters" },
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

            {allStats ? (
              <StatsOverview stats={allStats} />
            ) : (
              <p className="text-stone-500">Loading stats...</p>
            )}
          </TabsContent>

          <TabsContent value="ai-comparison">
            {aiComparison ? (
              <AICharacterComparison data={aiComparison} />
            ) : (
              <p className="text-stone-500">Loading AI comparison...</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
