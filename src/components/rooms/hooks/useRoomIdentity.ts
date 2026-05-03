import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { getTutorialGuestId } from "@/lib/tutorial-guest";

export function useRoomIdentity(
  _code: string,
  options: { allowGuestTutorial?: boolean } = {},
) {
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const allowGuestTutorial = options.allowGuestTutorial === true;
  const tutorialGuestAuthUserId = useMemo(() => getTutorialGuestId(), []);

  return {
    session,
    isAuthPending,
    allowGuestTutorial,
    tutorialGuestAuthUserId,
  } as const;
}
