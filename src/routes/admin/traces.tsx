import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { Activity, Bell, Database, RefreshCw } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  TraceFilters,
  type TraceComponentFilter,
  type TraceDecisionSourceFilter,
  type TraceGroup,
} from "@/components/admin/TraceFilters";
import { TraceTable } from "@/components/admin/TraceTable";

export const Route = createFileRoute("/admin/traces")({
  component: AdminTracesPage,
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw new Error("Admin traces is only available in development mode");
    }
  },
});

function AdminTracesPage() {
  const [group, setGroup] = useState<TraceGroup>("all");
  const [component, setComponent] = useState<TraceComponentFilter>("all");
  const [decisionSource, setDecisionSource] = useState<TraceDecisionSourceFilter>("all");
  const [difficulty, setDifficulty] = useState("");
  const [character, setCharacter] = useState("");
  const [gameId, setGameId] = useState("");
  const [search, setSearch] = useState("");
  const [botOnly, setBotOnly] = useState(false);
  const [fallbackOnly, setFallbackOnly] = useState(false);
  const [failedOnly, setFailedOnly] = useState(false);
  const traces = useQuery(api.aiTracing.getTraces, { limit: 250 });

  const metrics = useMemo(() => {
    const rows = traces ?? [];
    const aiCount = rows.filter((trace) => trace.category.startsWith("ai_")).length;
    const fallbackCount = rows.filter((trace) => trace.usedFallback).length;
    const failedCount = rows.filter((trace) => !trace.success).length;
    const latest = rows[0]?.createdAt;
    return {
      total: rows.length,
      aiCount,
      fallbackCount,
      failedCount,
      latestLabel: latest ? new Date(latest).toLocaleTimeString() : "No traces",
    };
  }, [traces]);

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#08090b] text-white">
      <div className="border-b border-white/10 bg-[#101114] px-4 py-2 text-center text-xs text-white/50">
        Dev-only game and AI observability
      </div>

      <div className="grid min-h-[calc(100dvh-6rem)] grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#0c0d10] lg:block">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-sm bg-white text-sm font-bold text-black">
                W
              </div>
              <div>
                <p className="text-sm font-semibold">Word Poker</p>
                <p className="text-xs text-white/45">Admin</p>
              </div>
            </div>
          </div>
          <nav className="space-y-1 p-3 text-sm">
            <SidebarItem active icon={<Activity className="h-4 w-4" />} label="Traces" />
            <SidebarItem icon={<Database className="h-4 w-4" />} label="Stats" />
            <SidebarItem icon={<Bell className="h-4 w-4" />} label="Signals" />
          </nav>
        </aside>

        <section className="min-w-0 px-4 py-5 lg:px-8">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">Traces</h1>
                <span className="inline-flex items-center gap-1.5 text-xs text-white/45">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Live Convex subscription
                </span>
              </div>
              <p className="max-w-2xl text-sm text-white/50">
                Game state transitions, player actions, AI decisions, prompts, and
                dialogue in one flat debugging stream.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Traces" value={metrics.total} />
              <Metric label="AI" value={metrics.aiCount} />
              <Metric label="Fallbacks" value={metrics.fallbackCount} />
              <Metric label="Failures" value={metrics.failedCount} />
            </div>
          </div>

          <div className="mb-4">
            <div className="h-14 rounded-md border border-white/10 bg-[#0c0d10] px-3 py-2">
              <div className="flex h-full items-end">
                <div className="h-px w-full bg-cyan-300/70 shadow-[0_0_18px_rgba(103,232,249,0.45)]" />
              </div>
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-white/35">
              <span>Recent stream</span>
              <span>{metrics.latestLabel}</span>
            </div>
          </div>

          <div className="space-y-4">
            <TraceFilters
              group={group}
              onGroupChange={setGroup}
              component={component}
              onComponentChange={setComponent}
              decisionSource={decisionSource}
              onDecisionSourceChange={setDecisionSource}
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
              character={character}
              onCharacterChange={setCharacter}
              gameId={gameId}
              onGameIdChange={setGameId}
              search={search}
              onSearchChange={setSearch}
              botOnly={botOnly}
              onBotOnlyChange={setBotOnly}
              fallbackOnly={fallbackOnly}
              onFallbackOnlyChange={setFallbackOnly}
              failedOnly={failedOnly}
              onFailedOnlyChange={setFailedOnly}
            />

            {traces ? (
              <TraceTable
                traces={traces}
                group={group}
                component={component}
                decisionSource={decisionSource}
                difficulty={difficulty}
                character={character}
                gameId={gameId}
                search={search}
                botOnly={botOnly}
                fallbackOnly={fallbackOnly}
                failedOnly={failedOnly}
              />
            ) : (
              <div className="grid min-h-80 place-items-center rounded-md border border-white/10 bg-[#0c0d10] text-sm text-white/45">
                Loading traces...
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SidebarItem({
  icon,
  label,
  active,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-sm px-3 py-2 ${
        active ? "bg-white/10 text-white" : "text-white/50"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0c0d10] px-3 py-2">
      <div className="text-[10px] font-medium uppercase text-white/40">{label}</div>
      <div className="font-mono text-lg text-white">{value}</div>
    </div>
  );
}
