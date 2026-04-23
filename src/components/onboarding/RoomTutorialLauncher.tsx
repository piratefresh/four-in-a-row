import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useNextStep } from "nextstepjs";
import {
  getTourCompletionStorageKey,
  getTourPausedStepStorageKey,
} from "./wordPokerTours";

type RoomTutorialLauncherProps = {
  tutorialName: string | null;
  roomCode: string;
  forceStart?: boolean;
};

export function RoomTutorialLauncher({
  tutorialName,
  roomCode,
  forceStart = false,
}: RoomTutorialLauncherProps) {
  const navigate = useNavigate();
  const { startNextStep } = useNextStep();
  const lastLaunchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tutorialName) return;

    const launchKey = `${tutorialName}:${roomCode}:${forceStart ? "force" : "auto"}`;
    if (lastLaunchKeyRef.current === launchKey) return;
    lastLaunchKeyRef.current = launchKey;

    const completionKey = getTourCompletionStorageKey(tutorialName, roomCode);
    const pausedStepKey = getTourPausedStepStorageKey(tutorialName, roomCode);
    if (typeof window !== "undefined" && forceStart) {
      window.localStorage.removeItem(completionKey);
      window.localStorage.removeItem(pausedStepKey);
    }

    const hasCompletedTour =
      typeof window !== "undefined" &&
      window.localStorage.getItem(completionKey) === "true";
    const hasPausedTour =
      typeof window !== "undefined" &&
      window.localStorage.getItem(pausedStepKey) !== null;

    if (forceStart || (!hasCompletedTour && !hasPausedTour)) {
      startNextStep(tutorialName);
    }

    if (forceStart) {
      void navigate({
        to: "/rooms/$code",
        params: { code: roomCode },
        search: {},
        replace: true,
      });
    }
  }, [forceStart, navigate, roomCode, startNextStep, tutorialName]);

  return null;
}
