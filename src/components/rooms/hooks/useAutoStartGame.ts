import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

/**
 * Automatically creates a game when a room exists but has no active game.
 * Returns whether a game creation is currently in progress.
 */
export function useAutoStartGame(roomId: string | undefined, game: unknown) {
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const createGameForRoom = useMutation(api.games.createGameForRoom);

  useEffect(() => {
    if (!roomId || game !== null || isCreatingGame) return;
    void (async () => {
      setIsCreatingGame(true);
      try {
        await createGameForRoom({ roomId });
      } finally {
        setIsCreatingGame(false);
      }
    })();
  }, [createGameForRoom, game, isCreatingGame, roomId]);

  return { isCreatingGame } as const;
}
