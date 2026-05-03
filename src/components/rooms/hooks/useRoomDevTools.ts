import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useRoomDevTools(
  code: string,
  sessionUserName: string | undefined,
  sessionUserEmail: string | undefined,
) {
  const debugRejoinRoom = useMutation(api.rooms.debugRejoinRoom);
  const debugFillRoomWithBots = useMutation(api.rooms.debugFillRoomWithBots);

  const [isDevRejoining, setIsDevRejoining] = useState(false);
  const [isDevFillingBots, setIsDevFillingBots] = useState(false);
  const [gameMessage, setGameMessage] = useState<string | null>(null);

  const handleDevRejoinRoom = useCallback(async () => {
    if (!import.meta.env.DEV) return;

    const displayName =
      sessionUserName?.trim() || sessionUserEmail || "Dev Player";

    setIsDevRejoining(true);
    setGameMessage(null);
    try {
      await debugRejoinRoom({ code, name: displayName });
      setGameMessage("Rejoined room for development.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to rejoin room.";
      setGameMessage(message);
    } finally {
      setIsDevRejoining(false);
    }
  }, [code, debugRejoinRoom, sessionUserEmail, sessionUserName]);

  const handleDevFillRoomWithBots = useCallback(async () => {
    if (!import.meta.env.DEV) return;

    setIsDevFillingBots(true);
    setGameMessage(null);
    try {
      const result = await debugFillRoomWithBots({ code, count: 2 });
      setGameMessage(
        result.added > 0
          ? `Added ${result.added} test player${result.added === 1 ? "" : "s"}.`
          : "No open seats available for test players.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add test players.";
      setGameMessage(message);
    } finally {
      setIsDevFillingBots(false);
    }
  }, [code, debugFillRoomWithBots]);

  return {
    isDevRejoining,
    isDevFillingBots,
    handleDevRejoinRoom,
    handleDevFillRoomWithBots,
    devGameMessage: gameMessage,
  } as const;
}
