const DISMISSED_ROOM_REJOIN_STORAGE_KEY = "dismissed-room-rejoin-codes";

function normalizeRoomCode(code: string) {
  return code.trim().toUpperCase();
}

function readDismissedRoomRejoinCodes() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  const rawValue = window.sessionStorage.getItem(
    DISMISSED_ROOM_REJOIN_STORAGE_KEY,
  );
  if (!rawValue) {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    return new Set(
      parsed
        .filter((value): value is string => typeof value === "string")
        .map(normalizeRoomCode),
    );
  } catch {
    return new Set<string>();
  }
}

function writeDismissedRoomRejoinCodes(codes: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  if (codes.size === 0) {
    window.sessionStorage.removeItem(DISMISSED_ROOM_REJOIN_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(
    DISMISSED_ROOM_REJOIN_STORAGE_KEY,
    JSON.stringify([...codes]),
  );
}

export function dismissRoomRejoin(code: string) {
  const normalizedCode = normalizeRoomCode(code);
  const codes = readDismissedRoomRejoinCodes();
  codes.add(normalizedCode);
  writeDismissedRoomRejoinCodes(codes);
}

export function clearDismissedRoomRejoin(code: string) {
  const normalizedCode = normalizeRoomCode(code);
  const codes = readDismissedRoomRejoinCodes();
  codes.delete(normalizedCode);
  writeDismissedRoomRejoinCodes(codes);
}

export function isRoomRejoinDismissed(code: string) {
  const normalizedCode = normalizeRoomCode(code);
  return readDismissedRoomRejoinCodes().has(normalizedCode);
}
