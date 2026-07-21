import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../../convex/_generated/api";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Keeps the player's presence fresh while the tab is visible. Closing or
 * navigating away deliberately does NOT leave the room (table-stakes epic
 * M1.6) — the seat and its table stack are held on a disconnect lease and are
 * cashed out server-side only after the grace period. Reconnecting before then
 * resumes the same session.
 */
export function useRoomPresence(code: string, enabled: boolean) {
  const heartbeatByCode = useMutation(api.rooms.heartbeatByCode);
  const isSendingHeartbeatRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const sendHeartbeat = async () => {
      if (
        cancelled ||
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

    const interval = window.setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    };

    void sendHeartbeat();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [code, enabled, heartbeatByCode]);
}
