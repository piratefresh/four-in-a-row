import { useCallback, useMemo } from "react";
import { getBotCharacterForAuthUserId } from "../../../../convex/aiStrategy";

type MemberEntry = {
  _id: string;
  name?: string;
  image?: string | null;
  authUserId?: string;
  seatIndex?: number;
};

/**
 * Shared member-lookup primitive used by both the live room display
 * and the results page.  Extracted to eliminate duplicated Map
 * construction and name/avatar derivation across routes.
 */
export function useMemberLookup(
  members: MemberEntry[] | null | undefined,
  opts?: {
    /** Auth user ID for finding the current user's member entry. */
    sessionUserId?: string;
    /** Fallback viewer player ID (e.g. for guest tutorial users). */
    viewerPlayerId?: string;
  },
) {
  const memberById = useMemo(
    () =>
      new Map(
        (members ?? []).map((member) => [String(member._id), member]),
      ),
    [members],
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
    (targetPlayerId: string) =>
      memberById.get(targetPlayerId)?.image ?? null,
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

  const myPlayer = useMemo(() => {
    if (!members) return null;

    if (opts?.sessionUserId) {
      const authMatched =
        members.find((m) => m.authUserId === opts.sessionUserId) ?? null;
      if (authMatched) return authMatched;
    }

    if (opts?.viewerPlayerId) {
      return (
        members.find((m) => m._id === opts.viewerPlayerId) ?? null
      );
    }

    return null;
  }, [members, opts?.sessionUserId, opts?.viewerPlayerId]);

  return {
    memberById,
    myPlayer,
    getPlayerName,
    getPlayerAvatar,
    getPlayerPersonality,
  } as const;
}
