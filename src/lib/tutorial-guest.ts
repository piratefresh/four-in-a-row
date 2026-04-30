const TUTORIAL_GUEST_ID_STORAGE_KEY = "word-poker.tutorial.guest-id";
const TUTORIAL_GUEST_ID_PREFIX = "guest-tutorial:";

export function describeTutorialGuestIdForDebug(guestId: string | null | undefined) {
  if (!guestId) {
    return { present: false };
  }

  return {
    present: true,
    prefixOk: guestId.startsWith(TUTORIAL_GUEST_ID_PREFIX),
    length: guestId.length,
    suffix: guestId.slice(-6),
  };
}

export function logTutorialDebug(
  event: string,
  details: Record<string, unknown> = {},
) {
  console.info(`[tutorial-debug] ${event}`, details);
}

function createTutorialGuestId() {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return `${TUTORIAL_GUEST_ID_PREFIX}${randomPart}`;
}

export function getTutorialGuestId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.localStorage.getItem(TUTORIAL_GUEST_ID_STORAGE_KEY);
  if (existing?.startsWith(TUTORIAL_GUEST_ID_PREFIX)) {
    logTutorialDebug("guest-id:existing", {
      guest: describeTutorialGuestIdForDebug(existing),
    });
    return existing;
  }

  const next = createTutorialGuestId();
  window.localStorage.setItem(TUTORIAL_GUEST_ID_STORAGE_KEY, next);
  logTutorialDebug("guest-id:created", {
    guest: describeTutorialGuestIdForDebug(next),
  });
  return next;
}
