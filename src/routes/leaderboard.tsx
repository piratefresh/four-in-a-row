import { createFileRoute } from "@tanstack/react-router";
import { LeaderboardPage } from "@/components/leaderboard/LeaderboardPage";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardRoute,
});

function LeaderboardRoute() {
  return <LeaderboardPage />;
}
