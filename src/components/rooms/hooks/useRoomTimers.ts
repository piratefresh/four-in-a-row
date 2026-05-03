import { useEffect, useMemo, useRef, useState } from "react";
import {
  ROOM_INACTIVITY_TIMEOUT_MS,
} from "../../../../convex/constants";

export function useRoomTimers(
  game: {
    status?: string;
    stage?: string;
    turnClockExpiresAt?: number;
    turnClockTargetPlayerId?: string;
    showdownStartedAt?: number;
    config?: { showdownTimerMs?: number };
  } | null | undefined,
  roomData: {
    room: { lastActiveAt?: number; tutorialId?: string | null };
  } | null | undefined,
  playerId: string | null,
  getPlayerName: (playerId: string) => string,
  isTutorialRoom: boolean,
) {
  const [liveNow, setLiveNow] = useState(() => Date.now());

  useEffect(() => {
    if (game?.status !== "active" && game?.status !== "waiting") return;
    const interval = window.setInterval(() => {
      setLiveNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [game?.status]);

  const turnClockTimeRemaining = useMemo(() => {
    if (game?.turnClockExpiresAt === undefined) return null;
    return Math.max(0, game.turnClockExpiresAt - liveNow);
  }, [game?.turnClockExpiresAt, liveNow]);

  const hasPendingTurnClock = game?.turnClockExpiresAt !== undefined;

  const turnClockTargetName = useMemo(
    () =>
      game?.turnClockTargetPlayerId
        ? getPlayerName(game.turnClockTargetPlayerId)
        : null,
    [game?.turnClockTargetPlayerId, getPlayerName],
  );

  const isTurnClockTarget = useMemo(
    () =>
      Boolean(
        playerId &&
          hasPendingTurnClock &&
          game?.turnClockTargetPlayerId === playerId,
      ),
    [game?.turnClockTargetPlayerId, hasPendingTurnClock, playerId],
  );

  const lobbyInactivityTimeRemainingMs = useMemo(() => {
    if (
      !roomData?.room ||
      game?.status !== "waiting" ||
      isTutorialRoom
    ) {
      return null;
    }
    return Math.max(
      0,
      (roomData.room.lastActiveAt ?? 0) + ROOM_INACTIVITY_TIMEOUT_MS - liveNow,
    );
  }, [game?.status, isTutorialRoom, liveNow, roomData?.room]);

  const showdownTimerMs =
    game?.config?.showdownTimerMs ?? 60000;
  const showdownTimerStartedAtRef = useRef<number | undefined>(undefined);
  const showdownTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const [showdownTimeRemaining, setShowdownTimeRemaining] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (
      game?.stage !== "showdown" ||
      game?.status !== "active" ||
      game.showdownStartedAt === undefined
    ) {
      setShowdownTimeRemaining(null);
      return;
    }

    showdownTimerStartedAtRef.current = game.showdownStartedAt;

    const tick = () => {
      const start = showdownTimerStartedAtRef.current;
      if (start === undefined) return;
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, showdownTimerMs - elapsed);
      setShowdownTimeRemaining(remaining);
    };

    tick();
    showdownTimerIntervalRef.current = setInterval(tick, 100);

    return () => {
      if (showdownTimerIntervalRef.current) {
        clearInterval(showdownTimerIntervalRef.current);
        showdownTimerIntervalRef.current = null;
      }
    };
  }, [game?.stage, game?.status, game?.showdownStartedAt, showdownTimerMs]);

  const didShowdownExpire =
    showdownTimeRemaining !== null && showdownTimeRemaining <= 0;

  const didLobbyExpire = lobbyInactivityTimeRemainingMs === 0;

  return {
    liveNow,
    turnClockTimeRemaining,
    turnClockTargetName,
    isTurnClockTarget,
    hasPendingTurnClock,
    lobbyInactivityTimeRemainingMs,
    showdownTimeRemaining,
    didShowdownExpire,
    didLobbyExpire,
  } as const;
}
