import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../../convex/_generated/api";

const HEARTBEAT_INTERVAL_MS = 15_000;

export function useRoomPresence(code: string, enabled: boolean) {
  const heartbeatByCode = useMutation(api.rooms.heartbeatByCode);
  const leaveRoomByCode = useMutation(api.rooms.leaveRoomByCode);
  const isSendingHeartbeatRef = useRef(false);
  const didLeaveRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      didLeaveRef.current = false;
      return;
    }

    let cancelled = false;

    const sendHeartbeat = async () => {
      if (
        cancelled ||
        didLeaveRef.current ||
        document.visibilityState !== "visible" ||
        isSendingHeartbeatRef.current
      ) {
        return;
      }

      isSendingHeartbeatRef.current = true;
      try {
        await heartbeatByCode({ code });
      } catch {
        // Ignore transient presence failures; staleness is resolved server-side.
      } finally {
        isSendingHeartbeatRef.current = false;
      }
    };

    const leaveRoom = async () => {
      if (didLeaveRef.current) return;
      didLeaveRef.current = true;
      try {
        await leaveRoomByCode({ code });
      } catch {
        // Best-effort cleanup only.
      }
    };

    const interval = window.setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        didLeaveRef.current = false;
        void sendHeartbeat();
      }
    };

    const handlePageHide = () => {
      void leaveRoom();
    };

    void sendHeartbeat();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [code, enabled, heartbeatByCode, leaveRoomByCode]);
}
