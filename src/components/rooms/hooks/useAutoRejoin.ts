import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  clearDismissedRoomRejoin,
  isRoomRejoinDismissed,
} from "@/lib/room-rejoin-dismissal";
import { showEmailVerificationToast } from "@/lib/email-verification-toast";

interface AutoRejoinInput {
  code: string;
  isAuthPending: boolean;
  hasSessionUser: boolean;
  isEmailVerified: boolean;
  userEmail: string;
  myPlayer: unknown;
  roomData: {
    room: { _id: string; status: string; tutorialId?: string | null };
  } | null | undefined;
  setGameMessage: (msg: string | null) => void;
  resetLeftFlag: () => void;
}

/**
 * Manages auto-rejoin logic: when a user visits a room they were previously in
 * but no longer have a player seat, automatically rejoin if eligible.
 */
export function useAutoRejoin(input: AutoRejoinInput) {
  const {
    code,
    isAuthPending,
    hasSessionUser,
    isEmailVerified,
    userEmail,
    myPlayer,
    roomData,
    setGameMessage,
    resetLeftFlag,
  } = input;

  const rejoinRoomByCode = useMutation(api.rooms.rejoinRoomByCode);
  const autoRejoinAttemptedCodeRef = useRef<string | null>(null);

  // Reset auto-rejoin blocker when a player seat is acquired
  useEffect(() => {
    if (myPlayer) {
      autoRejoinAttemptedCodeRef.current = null;
      clearDismissedRoomRejoin(code);
    }
  }, [code, myPlayer]);

  // Auto-rejoin when a viewer seat is available and hasn't been dismissed
  useEffect(() => {
    if (
      isAuthPending ||
      !hasSessionUser ||
      myPlayer ||
      !roomData?.room ||
      isRoomRejoinDismissed(code) ||
      autoRejoinAttemptedCodeRef.current === code
    ) {
      return;
    }

    if (!isEmailVerified) {
      showEmailVerificationToast(userEmail);
      return;
    }

    autoRejoinAttemptedCodeRef.current = code;
    void (async () => {
      try {
        await rejoinRoomByCode({ code, name: "Player" });
        resetLeftFlag();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to rejoin room.";
        setGameMessage(message);
      }
    })();
  }, [
    code,
    isAuthPending,
    hasSessionUser,
    isEmailVerified,
    userEmail,
    myPlayer,
    rejoinRoomByCode,
    roomData,
    resetLeftFlag,
    setGameMessage,
  ]);
}
