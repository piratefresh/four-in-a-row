import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { createServerFn } from "@tanstack/react-start";
import { getToken } from "@/lib/auth-server";
import { FriendsPage } from "@/components/friends/FriendsPage";

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

export const Route = createFileRoute("/friends")({
  beforeLoad: async () => {
    const token = await getAuth();
    if (!token) {
      throw redirect({ to: "/login" });
    }
  },
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
