import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { AchievementsPage } from "@/components/achievements/AchievementsPage";

export const Route = createFileRoute("/achievements")({
  component: AchievementsRoute,
});

function AchievementsRoute() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      void navigate({ to: "/login" });
    }
  }, [isPending, navigate, session?.user]);

  if (isPending || !session?.user) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] bg-felt px-6 py-10">
        <p className="text-sm text-game-muted">Loading...</p>
      </main>
    );
  }

  return <AchievementsPage sessionUserId={session.user.id} />;
}
