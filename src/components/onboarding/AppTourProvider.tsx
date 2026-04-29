import { useMemo } from "react";
import { NextStepProvider, NextStepReact } from "nextstepjs";
import { useRouterState } from "@tanstack/react-router";
import {
  FIRST_BOT_GAME_TOUR,
  getRoomCodeFromPathname,
  getTourCompletionStorageKey,
  wordPokerTours,
} from "./wordPokerTours";
import { OnboardingCard } from "./OnboardingCard";

function useTanStackNextStepAdapter() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return useMemo(
    () => ({
      push: (path: string) => {
        if (typeof window === "undefined") return;
        window.history.pushState({}, "", path);
        window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
      },
      getCurrentPath: () => pathname || "/",
    }),
    [pathname],
  );
}

export function AppTourProvider({ children }: { children: React.ReactNode }) {
  const navigationAdapter = useTanStackNextStepAdapter;
  const getScopedCompletionKey = (tourName: string) => {
    if (typeof window === "undefined") {
      return getTourCompletionStorageKey(tourName);
    }

    const roomCode = getRoomCodeFromPathname(window.location.pathname);
    return getTourCompletionStorageKey(tourName, roomCode);
  };

  return (
    <NextStepProvider>
      <NextStepReact
        cardComponent={OnboardingCard}
        clickThroughOverlay
        shadowRgb="7, 36, 25"
        shadowOpacity="0.65"
        navigationAdapter={navigationAdapter}
        steps={wordPokerTours}
        disableConsoleLogs
        onComplete={(tourName) => {
          if (
            tourName !== FIRST_BOT_GAME_TOUR ||
            typeof window === "undefined"
          ) {
            return;
          }
          window.localStorage.setItem(getScopedCompletionKey(tourName), "true");
        }}
        onSkip={(_, tourName) => {
          if (
            tourName !== FIRST_BOT_GAME_TOUR ||
            typeof window === "undefined"
          ) {
            return;
          }
          window.localStorage.setItem(getScopedCompletionKey(tourName), "true");
        }}
      >
        {children}
      </NextStepReact>
    </NextStepProvider>
  );
}
