import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { startTransition, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { HomeModeMenu } from "@/components/home/HomeModeMenu";
import { OnlineRooms } from "@/components/home/OnlineRooms";
import { RoomDrawer } from "@/components/RoomDrawer";

type HomeSearch = {
  view?: "online";
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    view: search.view === "online" ? "online" : undefined,
  }),
  component: App,
});

function App() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { data: session } = authClient.useSession();
  const convexAuthUser = useQuery(api.auth.getCurrentUser);
  const activeRoom = useQuery(api.rooms.getMyActiveRoom);
  const rooms = useQuery(api.rooms.listRooms);
  const stats = useQuery(api.stats.getAllTimeStats);
  const ensureSeedRooms = useMutation(api.rooms.ensureSeedRooms);
  const refreshOpenRooms = useMutation(api.rooms.refreshOpenRooms);
  const createRoom = useMutation(api.rooms.createRoom);
  const joinRoom = useMutation(api.rooms.joinRoom);
  const toggleReady = useMutation(api.rooms.toggleReady);
  const createGameForRoom = useMutation(api.games.createGameForRoom);
  const debugRejoinRoom = useMutation(api.rooms.debugRejoinRoom);
  const debugFillRoomWithBots = useMutation(api.rooms.debugFillRoomWithBots);
  const seededRef = useRef(false);
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);
  const [isDevRejoining, setIsDevRejoining] = useState(false);
  const [isRefreshingRooms, setIsRefreshingRooms] = useState(false);
  const [isStartingOffline, setIsStartingOffline] = useState(false);
  const homeView = search.view === "online" ? "online" : "menu";

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    void ensureSeedRooms({});
  }, [ensureSeedRooms]);

  useEffect(() => {
    if (homeView !== "menu") return;
    setSelectedRoomCode(null);
    setJoinMessage(null);
  }, [homeView]);

  const getDisplayName = () => {
    if (!session?.user) {
      void navigate({ to: "/login" });
      return null;
    }

    if (convexAuthUser === undefined) {
      setJoinMessage("Checking authentication, please try again in a moment.");
      return null;
    }

    if (!convexAuthUser) {
      setJoinMessage(
        "Convex auth is not ready. Please sign out and sign back in.",
      );
      return null;
    }

    return session.user.name?.trim() || session.user.email || "Player";
  };

  const handleOpenDrawer = (roomCode: string) => {
    if (!getDisplayName()) {
      return;
    }

    setSelectedRoomCode(roomCode);
  };

  const handleJoinSeat = async () => {
    if (!selectedRoomCode) return;

    const displayName = getDisplayName();
    if (!displayName) return;
    setJoiningRoomCode(selectedRoomCode);
    setJoinMessage(null);

    try {
      const result = await joinRoom({
        code: selectedRoomCode,
        name: displayName,
      });
      await navigate({ to: "/rooms/$code", params: { code: result.code } });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join room.";
      setJoinMessage(message);
    } finally {
      setJoiningRoomCode(null);
    }
  };

  const handleDevRejoin = async () => {
    if (!import.meta.env.DEV || !selectedRoomCode) return;

    const displayName = getDisplayName();
    if (!displayName) return;
    setIsDevRejoining(true);
    setJoinMessage(null);

    try {
      const result = await debugRejoinRoom({
        code: selectedRoomCode,
        name: displayName,
      });
      await navigate({ to: "/rooms/$code", params: { code: result.code } });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to rejoin room.";
      setJoinMessage(message);
    } finally {
      setIsDevRejoining(false);
    }
  };

  const handleStartOffline = async () => {
    const displayName = getDisplayName();
    if (!displayName) return;

    if (activeRoom === undefined) {
      setJoinMessage("Checking for an active room, please try again in a moment.");
      return;
    }

    if (activeRoom?.code) {
      await navigate({ to: "/rooms/$code", params: { code: activeRoom.code } });
      return;
    }

    setIsStartingOffline(true);
    setJoinMessage(null);

    try {
      const room = await createRoom({ name: displayName });
      await debugFillRoomWithBots({ code: room.code, count: 3 });
      await createGameForRoom({ roomId: room.roomId });
      await toggleReady({ code: room.code });
      await navigate({ to: "/rooms/$code", params: { code: room.code } });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start an offline table.";
      setJoinMessage(message);
    } finally {
      setIsStartingOffline(false);
    }
  };

  const handleRefreshRooms = async () => {
    setIsRefreshingRooms(true);
    setJoinMessage(null);

    try {
      const result = await refreshOpenRooms({ count: 1 });
      setJoinMessage(
        `Created ${result.created} fresh room code${result.created === 1 ? "" : "s"}${result.closed > 0 ? ` and retired ${result.closed} empty room${result.closed === 1 ? "" : "s"}` : ""}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to refresh rooms.";
      setJoinMessage(message);
    } finally {
      setIsRefreshingRooms(false);
    }
  };

  const handleSelectOnline = () => {
    setJoinMessage(null);
    startTransition(() => {
      void navigate({
        to: "/",
        search: { view: "online" },
      });
    });
  };

  const handleResumeRoom = async () => {
    if (!activeRoom?.code) return;
    await navigate({ to: "/rooms/$code", params: { code: activeRoom.code } });
  };

  return (
    <>
      {homeView === "menu" ? (
        <HomeModeMenu
          activeRoomCode={activeRoom?.code}
          isStartingOffline={isStartingOffline}
          statusMessage={joinMessage}
          onSelectOnline={handleSelectOnline}
          onStartOffline={() => {
            void handleStartOffline();
          }}
          onResumeRoom={() => {
            void handleResumeRoom();
          }}
        />
      ) : (
        <OnlineRooms
          activeRoomCode={activeRoom?.code}
          joinMessage={joinMessage}
          joiningRoomCode={joiningRoomCode}
          isRefreshingRooms={isRefreshingRooms}
          rooms={rooms}
          stats={stats}
          onOpenRoom={handleOpenDrawer}
          onRefreshRooms={() => {
            void handleRefreshRooms();
          }}
          onResumeRoom={() => {
            void handleResumeRoom();
          }}
        />
      )}

      <RoomDrawer
        roomCode={selectedRoomCode}
        onClose={() => setSelectedRoomCode(null)}
        onJoinSeat={handleJoinSeat}
        isJoining={joiningRoomCode !== null}
        onDevRejoin={handleDevRejoin}
        isDevRejoining={isDevRejoining}
        showDevTools={import.meta.env.DEV}
      />
    </>
  );
}
