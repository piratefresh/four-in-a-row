import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import {
  clearDismissedRoomRejoin,
  isRoomRejoinDismissed,
} from "@/lib/room-rejoin-dismissal";
import { showEmailVerificationToast } from "@/lib/email-verification-toast";

interface RoomReactionsInput {
  code: string;
  isAuthPending: boolean;
  hasSessionUser: boolean;
  allowGuestTutorial: boolean;
  isEmailVerified: boolean;
  userEmail: string;
  roomData: {
    room: { _id: string; status: string; tutorialId?: string | null };
  } | null | undefined;
  game: any;
  myPlayer: any;
  playerId: string | null;
  didShowdownExpire: boolean;
  didLobbyExpire: boolean;
  isTutorialRoom: boolean;
  gameMessage: string | null;
  setGameMessage: (msg: string | null) => void;
  resetLeftFlag: () => void;
  leaveCurrentRoom: (_silent: boolean) => Promise<boolean>;
}

export function useRoomReactions(input: RoomReactionsInput) {
  const {
    code,
    isAuthPending,
    hasSessionUser,
    allowGuestTutorial,
    isEmailVerified,
    userEmail,
    roomData,
    game,
    myPlayer,
    playerId,
    didShowdownExpire,
    didLobbyExpire,
    isTutorialRoom,
    gameMessage,
    setGameMessage,
    resetLeftFlag,
    leaveCurrentRoom,
  } = input;

  const navigate = useNavigate();
  const rejoinRoomByCode = useMutation(api.rooms.rejoinRoomByCode);
  const createGameForRoom = useMutation(api.games.createGameForRoom);
  const forfeitShowdown = useMutation(api.games.forfeitShowdown);

  const autoRejoinAttemptedCodeRef = useRef<string | null>(null);
  const wasRoomOpenRef = useRef(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  // Reset auto-rejoin blocker when player joins
  useEffect(() => {
    if (myPlayer) {
      autoRejoinAttemptedCodeRef.current = null;
      clearDismissedRoomRejoin(code);
    }
  }, [code, myPlayer]);

  // Auto-rejoin: when viewer seat is available and not dismissed
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

  // Auth redirect: unauthenticated users in non-tutorial rooms
  useEffect(() => {
    if (isAuthPending || hasSessionUser) return;
    if (allowGuestTutorial && roomData === undefined) return;
    if (roomData?.room.tutorialId === "first-bot-game") return;
    if (roomData !== undefined) {
      void navigate({ to: "/login" });
    }
  }, [allowGuestTutorial, isAuthPending, hasSessionUser, navigate, roomData]);

  // Clear transient action messages on game state change
  useEffect(() => {
    if (!gameMessage) return;
    const isTransient =
      gameMessage === "Checked." ||
      gameMessage === "Folded." ||
      gameMessage.startsWith("Matched ") ||
      gameMessage.startsWith("Raised to ");
    if (isTransient) {
      setGameMessage(null);
    }
  }, [game?.currentBet, game?.currentPlayerIndex, game?.stage, gameMessage, setGameMessage]);

  // Auto-create game when room exists but no game
  useEffect(() => {
    if (!roomData?.room._id || game !== null || isCreatingGame) return;
    void (async () => {
      setIsCreatingGame(true);
      try {
        await createGameForRoom({ roomId: roomData.room._id });
      } finally {
        setIsCreatingGame(false);
      }
    })();
  }, [createGameForRoom, game, isCreatingGame, roomData?.room._id]);

  // Room closed detection
  useEffect(() => {
    if (roomData === undefined) return;
    const isCurrentlyOpen = roomData !== null && roomData.room.status === "open";
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
    void navigate({ to: "/results/$code", params: { code } });
  }, [code, game?.status, navigate]);

  // Showdown expiry: auto-forfeit
  useEffect(() => {
    if (!didShowdownExpire || !playerId || !game?._id || isTutorialRoom) return;
    void forfeitShowdown({ gameId: game._id, playerId });
  }, [didShowdownExpire, game?._id, isTutorialRoom, playerId, forfeitShowdown]);

  // Lobby inactivity: leave and navigate
  useEffect(() => {
    if (!didLobbyExpire || game?.status !== "waiting") return;
    void (async () => {
      await leaveCurrentRoom(true);
      await navigate({ to: "/" });
    })();
  }, [didLobbyExpire, game?.status, leaveCurrentRoom, navigate]);

  return { isCreatingGame } as const;
}
