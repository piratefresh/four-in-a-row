import { useCallback, useMemo } from "react";
import { getBotCharacterForAuthUserId } from "../../../../convex/aiStrategy";

const DEALER_PLAYER_ID = "ai_dealer";
const INITIAL_CHIPS = 1000;

export function useRoomDisplay(
  roomData: { members: Array<Record<string, unknown>>; room: { status: string } } | null | undefined,
  playerHands: Array<{ playerId: string; createdAt?: number; tiles?: unknown[] }> | undefined,
  game: { status?: string } | null | undefined,
  playerId: string | null,
  nameMatchedPlayerId: string | null,
) {
  const memberById = useMemo(
    () =>
      new Map(
        (roomData?.members ?? []).map((member) => [
          String(member._id),
          member,
        ]),
      ),
    [roomData?.members],
  );

  const getPlayerName = useCallback(
    (targetPlayerId: string, handIndex?: number) => {
      const member = memberById.get(targetPlayerId);
      const botCharacter = getBotCharacterForAuthUserId(member?.authUserId);
      return (
        botCharacter?.name ??
        member?.name ??
        (handIndex !== undefined ? `Player ${handIndex + 1}` : "Player")
      );
    },
    [memberById],
  );

  const getPlayerAvatar = useCallback(
    (targetPlayerId: string) => memberById.get(targetPlayerId)?.image ?? null,
    [memberById],
  );

  const getPlayerPersonality = useCallback(
    (targetPlayerId: string): string | null => {
      const member = memberById.get(targetPlayerId);
      const botCharacter = getBotCharacterForAuthUserId(member?.authUserId);
      return botCharacter?.title ?? null;
    },
    [memberById],
  );

  const nonDealerHands = useMemo(
    () =>
      [...(playerHands ?? [])]
        .filter((hand) => hand.playerId !== DEALER_PLAYER_ID)
        .sort((a, b) => {
          const seatA =
            memberById.get(a.playerId)?.seatIndex ?? Number.MAX_SAFE_INTEGER;
          const seatB =
            memberById.get(b.playerId)?.seatIndex ?? Number.MAX_SAFE_INTEGER;
          return seatA - seatB;
        }),
    [memberById, playerHands],
  );

  const bottomPlayerId =
    playerId ?? nameMatchedPlayerId ?? nonDealerHands[0]?.playerId ?? undefined;

  const rotatedHands = useMemo(() => {
    if (!bottomPlayerId || nonDealerHands.length === 0) return nonDealerHands;
    const bottomIndex = nonDealerHands.findIndex(
      (hand) => hand.playerId === bottomPlayerId,
    );
    if (bottomIndex <= 0) return nonDealerHands;
    return [
      ...nonDealerHands.slice(bottomIndex),
      ...nonDealerHands.slice(0, bottomIndex),
    ];
  }, [bottomPlayerId, nonDealerHands]);

  const turnOrderedHands = useMemo(
    () =>
      [...(playerHands ?? [])].sort((a, b) => {
        if (a.createdAt !== b.createdAt) {
          return (a.createdAt ?? 0) - (b.createdAt ?? 0);
        }
        return a.playerId.localeCompare(b.playerId);
      }),
    [playerHands],
  );

  const displayHands = useMemo(() => {
    if (game?.status === "waiting" && roomData?.members) {
      return roomData.members.map((member) => ({
        _id: String(member._id),
        playerId: String(member._id),
        tiles: [] as unknown[],
        chips: INITIAL_CHIPS,
        betThisRound: 0,
        totalBet: 0,
      }));
    }
    return rotatedHands;
  }, [game?.status, roomData?.members, rotatedHands]);

  return {
    memberById,
    getPlayerName,
    getPlayerAvatar,
    getPlayerPersonality,
    nonDealerHands,
    bottomPlayerId,
    rotatedHands,
    turnOrderedHands,
    displayHands,
  } as const;
}
