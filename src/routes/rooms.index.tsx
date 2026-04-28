import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { OnlineRooms } from "@/components/rooms/OnlineRooms";
import { RoomDrawer } from "@/components/RoomDrawer";
import { authClient } from "@/lib/auth-client";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/rooms/")({
  component: OnlineRoomsRoute,
});

function OnlineRoomsRoute() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const convexAuthUser = useQuery(api.auth.getCurrentUser);
  const activeRoom = useQuery(api.rooms.getMyActiveRoom);
  const rooms = useQuery(api.rooms.listRooms);
  const stats = useQuery(api.stats.getAllTimeStats);
  const createRoom = useMutation(api.rooms.createRoom);
  const joinRoom = useMutation(api.rooms.joinRoom);
  const debugRejoinRoom = useMutation(api.rooms.debugRejoinRoom);
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);
  const [isDevRejoining, setIsDevRejoining] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

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

  const handleCreateRoom = async () => {
    const displayName = getDisplayName();
    if (!displayName) return;

    setIsCreatingRoom(true);
    setJoinMessage(null);

    try {
      const result = await createRoom({ name: displayName });
      await navigate({ to: "/rooms/$code", params: { code: result.code } });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create room.";
      setJoinMessage(message);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleResumeRoom = async () => {
    if (!activeRoom?.code) return;
    await navigate({ to: "/rooms/$code", params: { code: activeRoom.code } });
  };

  return (
    <>
      <OnlineRooms
        activeRoomCode={activeRoom?.code}
        activeRoomTutorialId={activeRoom?.tutorialId}
        joinMessage={joinMessage}
        joiningRoomCode={joiningRoomCode}
        isCreatingRoom={isCreatingRoom}
        rooms={rooms}
        stats={stats}
        onOpenRoom={handleOpenDrawer}
        onCreateRoom={() => {
          void handleCreateRoom();
        }}
        onResumeRoom={() => {
          void handleResumeRoom();
        }}
      />

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
