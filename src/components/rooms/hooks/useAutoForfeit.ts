import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

interface AutoForfeitInput {
  didShowdownExpire: boolean;
  gameId: string | undefined;
  playerId: string | null;
  isTutorialRoom: boolean;
}

/**
 * Automatically forfeits a showdown when the timer expires.
 * Skipped in tutorial rooms.
 */
export function useAutoForfeit(input: AutoForfeitInput) {
  const { didShowdownExpire, gameId, playerId, isTutorialRoom } = input;
  const forfeitShowdown = useMutation(api.games.forfeitShowdown);

  useEffect(() => {
    if (!didShowdownExpire || !playerId || !gameId || isTutorialRoom) return;
    void forfeitShowdown({ gameId, playerId });
  }, [didShowdownExpire, gameId, isTutorialRoom, playerId, forfeitShowdown]);
}
