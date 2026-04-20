import { useEffect, useState } from "react";

const STORAGE_KEY = "offline-rival-commentary-enabled";
const DEFAULT_VALUE = true;

function readPreference() {
  if (typeof window === "undefined") {
    return DEFAULT_VALUE;
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  if (storedValue === null) {
    return DEFAULT_VALUE;
  }

  return storedValue !== "false";
}

export function getOfflineCommentaryEnabled() {
  return readPreference();
}

export function setOfflineCommentaryEnabled(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, String(enabled));
  window.dispatchEvent(
    new CustomEvent("offline-commentary-preference-change", {
      detail: { enabled },
    }),
  );
}

export function useOfflineCommentaryEnabled() {
  const [enabled, setEnabled] = useState(readPreference);

  useEffect(() => {
    const syncPreference = () => {
      setEnabled(readPreference());
    };

    window.addEventListener("storage", syncPreference);
    window.addEventListener("offline-commentary-preference-change", syncPreference);

    return () => {
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener(
        "offline-commentary-preference-change",
        syncPreference,
      );
    };
  }, []);

  return [enabled, setOfflineCommentaryEnabled] as const;
}
