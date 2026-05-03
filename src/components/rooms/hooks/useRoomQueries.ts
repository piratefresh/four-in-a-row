import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRoomIdentity } from "./useRoomIdentity";

export function useRoomQueries(
  code: string,
  options: { allowGuestTutorial?: boolean } = {},
) {
  const { session, isAuthPending, tutorialGuestAuthUserId } = useRoomIdentity(
    code,
    options,
  );

  const roomData = useQuery(api.rooms.getRoomMembers, {
    code,
    guestAuthUserId: session?.user
      ? undefined
      : (tutorialGuestAuthUserId ?? undefined),
  });

  const game = useQuery(api.games.getGameByRoom, {
    roomId: roomData?.room._id ?? "",
  });

  const playerHands = useQuery(
    api.games.getPlayerHands,
    game ? { gameId: game._id } : "skip",
  );

  const showdownResults = useQuery(
    api.games.getShowdownResults,
    game ? { gameId: game._id } : "skip",
  );

  const wordSubmissions = useQuery(
    api.games.getWordSubmissions,
    game ? { gameId: game._id } : "skip",
  );

  const myPlayer = useMemo(() => {
    if (!roomData?.members) return null;
    if (session?.user) {
      const authMatched =
        roomData.members.find(
          (member) => member.authUserId === session.user.id,
        ) ?? null;
      if (authMatched) return authMatched;
    }
    if (roomData.viewerPlayerId) {
      return (
        roomData.members.find(
          (member) => member._id === roomData.viewerPlayerId,
        ) ?? null
      );
    }
    return null;
  }, [roomData, session?.user]);

  const sessionNameLower = session?.user?.name?.trim().toLowerCase() ?? null;
  const nameMatchedPlayerId = useMemo(() => {
    if (!sessionNameLower || !roomData?.members) return null;
    const byName =
      roomData.members.find(
        (member) => member.name.trim().toLowerCase() === sessionNameLower,
      ) ?? null;
    return byName?._id ? String(byName._id) : null;
  }, [roomData?.members, sessionNameLower]);

  const playerId = myPlayer?._id ? String(myPlayer._id) : null;

  return {
    session,
    isAuthPending,
    tutorialGuestAuthUserId,
    roomData,
    game,
    playerHands,
    showdownResults,
    wordSubmissions,
    myPlayer,
    playerId,
    nameMatchedPlayerId,
  } as const;
}
