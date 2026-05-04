import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { FriendsPage } from "@/components/friends/FriendsPage";

export const Route = createFileRoute("/friends")({
  beforeLoad: async () => {
    const { data: session } = authClient.getSession();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: FriendsPage,
});
