import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useRoomReady(
  code: string,
  isTutorialRoom: boolean,
  hasSessionUser: boolean,
  tutorialGuestAuthUserId: string | undefined,
) {
  const [isTogglingReady, setIsTogglingReady] = useState(false);
  const toggleReady = useMutation(api.rooms.toggleReady);

  const handleToggleReady = useCallback(async () => {
    setIsTogglingReady(true);
    try {
      await toggleReady({
        code,
        guestAuthUserId:
          isTutorialRoom && !hasSessionUser
            ? (tutorialGuestAuthUserId ?? undefined)
            : undefined,
      });
    } finally {
      setIsTogglingReady(false);
    }
  }, [code, isTutorialRoom, hasSessionUser, toggleReady, tutorialGuestAuthUserId]);

  return {
    handleToggleReady,
    isTogglingReady,
  } as const;
}
