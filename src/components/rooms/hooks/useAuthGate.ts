import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

interface AuthGateInput {
  isAuthPending: boolean;
  hasSessionUser: boolean;
  allowGuestTutorial: boolean;
  roomData: {
    room: { tutorialId?: string | null };
  } | null | undefined;
}

/**
 * Redirects unauthenticated users away from rooms that require authentication.
 * Guest users are allowed in tutorial rooms.
 */
export function useAuthGate(input: AuthGateInput) {
  const {
    isAuthPending,
    hasSessionUser,
    allowGuestTutorial,
    roomData,
  } = input;

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthPending || hasSessionUser) return;
    // While tutorial guest data is loading, don't redirect yet
    if (allowGuestTutorial && roomData === undefined) return;
    // Tutorial room allows unauthenticated guests
    if (roomData?.room.tutorialId === "first-bot-game") return;
    if (roomData !== undefined) {
      void navigate({ to: "/login" });
    }
  }, [allowGuestTutorial, isAuthPending, hasSessionUser, navigate, roomData]);
}
