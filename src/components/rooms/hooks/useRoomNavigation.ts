import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

interface RoomNavigationInput {
  code: string;
  roomData: {
    room: { _id: string; status: string };
  } | null | undefined;
  game: {
    _id: string;
    status: string;
  } | null | undefined;
  didLobbyExpire: boolean;
  leaveCurrentRoom: (silent: boolean) => Promise<boolean>;
}

/**
 * Handles navigation side effects tied to room/game lifecycle events:
 * - Room closed by server → toast + redirect to lobby
 * - Game completed → redirect to results page
 * - Lobby inactivity expiry → leave + redirect to lobby
 */
export function useRoomNavigation(input: RoomNavigationInput) {
  const { code, roomData, game, didLobbyExpire, leaveCurrentRoom } = input;
  const navigate = useNavigate();
  const wasRoomOpenRef = useRef(false);

  // Room closed detection
  useEffect(() => {
    if (roomData === undefined) return;
    const isCurrentlyOpen =
      roomData !== null && roomData.room.status === "open";
    if (wasRoomOpenRef.current && !isCurrentlyOpen) {
      toast.warning("Room closed due to inactivity", {
        description: "You will be redirected to the lobby.",
        duration: 5000,
      });
      setTimeout(() => {
        void navigate({ to: "/" });
      }, 1500);
    }
    wasRoomOpenRef.current = isCurrentlyOpen;
  }, [roomData, navigate, code]);

  // Auto-navigate to results when game completes
  useEffect(() => {
    if (game?.status !== "completed") return;
    void navigate({
      to: "/results/$code",
      params: { code },
      search: { gameId: String(game._id) },
    });
  }, [code, game?._id, game?.status, navigate]);

  // Lobby inactivity: leave and navigate away
  useEffect(() => {
    if (!didLobbyExpire || game?.status !== "waiting") return;
    void (async () => {
      await leaveCurrentRoom(true);
      await navigate({ to: "/" });
    })();
  }, [didLobbyExpire, game?.status, leaveCurrentRoom, navigate]);
}
