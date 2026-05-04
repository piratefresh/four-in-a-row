import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { dismissRoomRejoin } from "@/lib/room-rejoin-dismissal";

export function useRoomLeave(code: string) {
  const navigate = useNavigate();
  const leaveRoom = useMutation(api.rooms.leaveRoomByCode);

  const hasLeftRoomRef = useRef(false);
  const codeRef = useRef(code);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState<string | null>(null);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  const leaveCurrentRoom = useCallback(
    async (_silent: boolean): Promise<boolean> => {
      if (hasLeftRoomRef.current) return true;
      try {
        await leaveRoom({ code: codeRef.current });
        hasLeftRoomRef.current = true;
        return true;
      } catch {
        hasLeftRoomRef.current = false;
        return false;
      }
    },
    [leaveRoom],
  );

  const handleLeaveRoom = useCallback(async () => {
    setIsLeavingRoom(true);
    setLeaveMessage(null);
    try {
      const didLeave = await leaveCurrentRoom(false);
      if (didLeave) {
        dismissRoomRejoin(code);
        await navigate({ to: "/" });
      }
    } finally {
      setIsLeavingRoom(false);
    }
  }, [code, leaveCurrentRoom, navigate]);

  const handleBack = useCallback(async () => {
    if (isLeavingRoom) return;
    setIsLeavingRoom(true);
    setLeaveMessage(null);
    dismissRoomRejoin(code);
    try {
      await leaveCurrentRoom(true);
      await navigate({ to: "/" });
    } finally {
      setIsLeavingRoom(false);
    }
  }, [code, isLeavingRoom, leaveCurrentRoom, navigate]);

  const handleViewResults = useCallback(async () => {
    await navigate({ to: "/results/$code", params: { code } });
  }, [code, navigate]);

  return {
    handleLeaveRoom,
    handleBack,
    handleViewResults,
    isLeavingRoom,
    leaveMessage,
    setLeaveMessage,
    hasLeftRoomRef,
    leaveCurrentRoom,
    resetLeftFlag: () => {
      hasLeftRoomRef.current = false;
    },
  } as const;
}
