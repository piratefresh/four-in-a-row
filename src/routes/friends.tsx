import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { FriendsPage } from "@/components/friends/FriendsPage";

export const Route = createFileRoute("/friends")({
  component: FriendsRoute,
});

function FriendsRoute() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      void navigate({ to: "/login" });
    }
  }, [isPending, navigate, session?.user]);

  if (isPending || !session?.user) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6 py-10">
        <p className="text-sm text-slate-400">Loading...</p>
      </main>
    );
  }

  return <FriendsPage />;
}
