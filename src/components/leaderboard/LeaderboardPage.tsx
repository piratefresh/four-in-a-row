import { useState } from "react";
import { useQuery } from "convex/react";
import { Trophy, User, Bot } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { StatsRow } from "@/components/admin/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function LeaderboardTable({ stats, emptyText }: { stats: StatsRow[] | undefined; emptyText: string }) {
  if (stats === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-stone-500">
        <Trophy className="size-10 opacity-20" />
        <p className="text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/35 shadow-2xl shadow-black/30 backdrop-blur">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="h-12 w-12 px-6 text-stone-500">#</TableHead>
            <TableHead className="h-12 px-6 text-stone-500">Name</TableHead>
            <TableHead className="h-12 text-right text-stone-500">Wins</TableHead>
            <TableHead className="h-12 text-right text-stone-500">Losses</TableHead>
            <TableHead className="h-12 pr-6 text-stone-500">Best Word</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((stat, idx) => {
            const rowId =
              stat.identity.authUserId ??
              stat.identity.characterId ??
              stat.identity.name;
            const losses = stat.gamesPlayed - stat.gamesWon;

            return (
              <TableRow
                key={rowId}
                className="border-white/10 text-stone-200 hover:bg-white/[0.045]"
              >
                <TableCell className="px-6 text-stone-500">
                  {idx + 1}
                </TableCell>
                <TableCell className="px-6 font-medium text-white">
                  {stat.identity.name}
                </TableCell>
                <TableCell className="text-right text-emerald-400">
                  {stat.gamesWon}
                </TableCell>
                <TableCell className="text-right text-red-400/80">
                  {losses}
                </TableCell>
                <TableCell className="pr-6">
                  {stat.bestWord ? (
                    <span>
                      <span className="text-white">{stat.bestWord}</span>
                      <span className="ml-1.5 text-xs text-amber-400/80">
                        {stat.bestWordScore} pts
                      </span>
                    </span>
                  ) : (
                    <span className="text-stone-600">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function LeaderboardPage() {
  const [tab, setTab] = useState("players");
  const players = useQuery(api.playerStats.getAllStats, { filter: "players" });
  const bots = useQuery(api.playerStats.getAllStats, { filter: "bots" });

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">
            Leaderboard
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-gold">
            Top players by games played
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="rounded-full border border-white/10 bg-white/[0.04] p-1 text-stone-400 shadow-2xl shadow-black/30">
            <TabsTrigger
              value="players"
              className="rounded-full gap-1.5 px-4 text-stone-400 data-[state=active]:border-white/10 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              <User className="size-3.5" />
              Players
            </TabsTrigger>
            <TabsTrigger
              value="bots"
              className="rounded-full gap-1.5 px-4 text-stone-400 data-[state=active]:border-white/10 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              <Bot className="size-3.5" />
              AI Characters
            </TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="space-y-4">
            <LeaderboardTable
              stats={players}
              emptyText="No players have played a game yet."
            />
          </TabsContent>

          <TabsContent value="bots" className="space-y-4">
            <LeaderboardTable
              stats={bots}
              emptyText="No AI characters have played yet."
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
