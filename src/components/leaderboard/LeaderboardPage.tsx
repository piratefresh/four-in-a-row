import { useState } from "react";
import { useQuery } from "convex/react";
import { Bot, Medal, Trophy, User } from "lucide-react";
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

function getRowId(stat: StatsRow) {
  return (
    stat.identity.authUserId ?? stat.identity.characterId ?? stat.identity.name
  );
}

function formatNumber(value: number | null | undefined) {
  return (Number.isFinite(value) ? Number(value) : 0).toLocaleString();
}

function getRankClassName(rank: number) {
  if (rank === 1) return "border-gold-bright bg-gold text-felt-deep";
  if (rank === 2) return "border-cream/45 bg-cream/20 text-cream";
  if (rank === 3) return "border-gold/40 bg-gold/15 text-gold-bright";
  return "border-cream/10 bg-white/5 text-cream/55";
}

function LeaderboardHighlights({ stats }: { stats: StatsRow[] | undefined }) {
  const rows = stats ?? [];
  const topPlayer = rows[0];
  const bestWord = rows
    .filter((stat) => stat.bestWord)
    .sort((a, b) => b.bestWordScore - a.bestWordScore)[0];
  const mostGames = rows
    .slice()
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed)[0];

  const highlights = [
    {
      label: "Table leader",
      value: topPlayer?.identity.name ?? "Loading...",
      detail: topPlayer
        ? `${formatNumber(topPlayer.gamesWon)} wins`
        : "Rankings settling",
    },
    {
      label: "Best word",
      value: bestWord?.bestWord ?? "Loading...",
      detail: bestWord
        ? `${formatNumber(bestWord.bestWordScore)} pts`
        : "No words yet",
    },
    {
      label: "Most hands",
      value: mostGames?.identity.name ?? "Loading...",
      detail: mostGames
        ? `${formatNumber(mostGames.gamesPlayed)} played`
        : "Waiting for games",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {highlights.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-cream/10 bg-cream/[0.06] p-4 shadow-xl shadow-black/15"
        >
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-gold">
            {item.label}
          </p>
          <p className="mt-2 truncate font-display text-2xl font-bold leading-none text-cream">
            {item.value}
          </p>
          <p className="mt-2 text-sm text-cream/60">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

function LeaderboardTable({
  stats,
  emptyText,
}: {
  stats: StatsRow[] | undefined;
  emptyText: string;
}) {
  if (stats === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-cream/10 bg-cream/[0.04] py-20 text-cream/55">
        <Trophy className="size-10 text-gold/50" />
        <p className="text-sm text-cream/65">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-cream/10 bg-black/30 shadow-2xl shadow-black/25">
      <Table className="min-w-[680px]">
        <TableHeader>
          <TableRow className="border-cream/10 hover:bg-transparent">
            <TableHead className="h-12 w-16 px-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gold/80 sm:px-6">
              Rank
            </TableHead>
            <TableHead className="h-12 px-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gold/80 sm:px-6">
              Name
            </TableHead>
            <TableHead className="h-12 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-gold/80">
              Wins
            </TableHead>
            <TableHead className="h-12 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-gold/80">
              Losses
            </TableHead>
            <TableHead className="h-12 pr-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gold/80 sm:pr-6">
              Best Word
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((stat, idx) => {
            const rowId = getRowId(stat);
            const losses = stat.gamesPlayed - stat.gamesWon;
            const rank = idx + 1;

            return (
              <TableRow
                key={rowId}
                className="border-cream/10 text-cream/80 transition-colors hover:bg-cream/[0.045]"
              >
                <TableCell className="px-4 sm:px-6">
                  <span
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-xs font-bold ${getRankClassName(rank)}`}
                  >
                    {rank}
                  </span>
                </TableCell>
                <TableCell className="px-4 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-cream/10 bg-cream/[0.08] text-cream">
                      {stat.identity.type === "bot" ? (
                        <Bot className="size-4" />
                      ) : (
                        <User className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white">
                        {stat.identity.name}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-cream/45">
                        {stat.identity.type === "bot"
                          ? "AI character"
                          : "Player"}
                      </span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-gold-bright">
                  {formatNumber(stat.gamesWon)}
                </TableCell>
                <TableCell className="text-right text-cream/55">
                  {formatNumber(losses)}
                </TableCell>
                <TableCell className="pr-4 sm:pr-6">
                  {stat.bestWord ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {stat.bestWord}
                      </span>
                      <span className="rounded-full border border-gold/20 bg-gold/10 px-2 py-0.5 font-mono text-[10px] text-gold-bright">
                        {formatNumber(stat.bestWordScore)} pts
                      </span>
                    </span>
                  ) : (
                    <span className="text-cream/35">-</span>
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
  const activeStats = tab === "players" ? players : bots;

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-felt px-4 py-6 text-cream sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-gold">
              Word Poker standings
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold leading-none text-cream sm:text-5xl">
              Leaderboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-cream/70">
              Track the players and AI characters stacking wins, chips, and
              high-value words.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-gold/25 bg-gold/10 px-4 py-3 text-gold-bright">
            <Medal className="size-5" />
            <span className="font-mono text-xs uppercase tracking-[0.18em]">
              Live stats
            </span>
          </div>
        </div>

        <LeaderboardHighlights stats={activeStats} />

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="rounded-xl border border-cream/10 bg-black/25 p-1 text-cream/55">
            <TabsTrigger
              value="players"
              className="gap-1.5 rounded-lg px-4 text-cream/60 data-[state=active]:bg-gold data-[state=active]:text-felt-deep"
            >
              <User className="size-3.5" />
              Players
            </TabsTrigger>
            <TabsTrigger
              value="bots"
              className="gap-1.5 rounded-lg px-4 text-cream/60 data-[state=active]:bg-gold data-[state=active]:text-felt-deep"
            >
              <Bot className="size-3.5" />
              AI Characters
            </TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="min-w-0 overflow-x-auto">
            <LeaderboardTable
              stats={players}
              emptyText="No players have played a game yet."
            />
          </TabsContent>

          <TabsContent value="bots" className="min-w-0 overflow-x-auto">
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
