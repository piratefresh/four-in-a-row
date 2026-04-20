import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildRoundCommentaryEventKey,
  buildRoundCommentaryPrompt,
  buildRoundStageKey,
  chooseCommentarySpeaker,
  parseRoundCommentary,
  type ActiveRivalBubble,
  type CommentaryPlayerSnapshot,
  type RoundCommentaryContext,
} from "@/lib/offline-commentary";
import {
  generateOfflineCommentaryText,
  preloadOfflineCommentaryModel,
  useOfflineCommentaryModelState,
} from "@/lib/offline-commentary-model";

type Member = {
  _id: string;
  authUserId?: string | null;
  name: string;
  seatIndex?: number | null;
};

type Hand = {
  playerId: string;
  chips?: number;
};

type Submission = {
  playerId: string;
  word?: string;
  score?: number;
};

type UseOfflineRoundCommentaryArgs = {
  enabled: boolean;
  gameId?: string | null;
  stage?: "preflop" | "flop" | "turn" | "river" | "final" | "showdown" | null;
  pot?: number;
  currentBet?: number;
  currentTurnPlayerId?: string | null;
  currentTurnPlayerName?: string | null;
  communityTileCount?: number;
  members: Member[];
  hands: Hand[];
  playerId?: string | null;
  getPlayerName: (playerId: string) => string;
  getPlayerPersonality: (playerId: string) => string | null;
  mySubmission?: Submission | null;
  otherSubmissions?: Submission[];
};

const BUBBLE_DURATION_MS = 4800;

function logOfflineCommentaryDebug(
  event: string,
  details: Record<string, unknown>,
) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.debug("[offline-commentary]", event, details);
}

export function useOfflineRoundCommentary({
  enabled,
  gameId,
  stage,
  pot = 0,
  currentBet = 0,
  currentTurnPlayerId = null,
  currentTurnPlayerName = null,
  communityTileCount = 0,
  members,
  hands,
  playerId = null,
  getPlayerName,
  getPlayerPersonality,
  mySubmission = null,
  otherSubmissions = [],
}: UseOfflineRoundCommentaryArgs) {
  const modelState = useOfflineCommentaryModelState();
  const [activeBubble, setActiveBubble] = useState<ActiveRivalBubble | null>(null);
  const attemptedEventsRef = useRef(new Set<string>());
  const pendingEventsRef = useRef(new Set<string>());
  const bubbleTimeoutRef = useRef<number | null>(null);

  const playersById = useMemo(
    () =>
      new Map(
        members.map((member) => [
          String(member._id),
          {
            member,
            hand: hands.find((hand) => hand.playerId === String(member._id)) ?? null,
          },
        ]),
      ),
    [hands, members],
  );

  const botPlayers = useMemo(() => {
    return members
      .map((member) => {
        const memberId = String(member._id);
        const hand = playersById.get(memberId)?.hand;
        return {
          playerId: memberId,
          authUserId: member.authUserId ?? null,
          seatIndex: member.seatIndex ?? null,
          name: getPlayerName(memberId),
          chips: hand?.chips ?? 0,
          isBot: Boolean(member.authUserId?.startsWith("dev-bot:")),
          personality: getPlayerPersonality(memberId),
        } satisfies CommentaryPlayerSnapshot;
      })
      .filter((player) => player.isBot);
  }, [getPlayerName, getPlayerPersonality, members, playersById]);

  const playerSnapshot = useMemo(() => {
    if (!playerId) {
      return null;
    }
    const member = members.find((entry) => String(entry._id) === playerId);
    const hand = playersById.get(playerId)?.hand;
    return {
      playerId,
      authUserId: member?.authUserId ?? null,
      seatIndex: member?.seatIndex ?? null,
      name: getPlayerName(playerId),
      chips: hand?.chips ?? 0,
      isBot: false,
      personality: getPlayerPersonality(playerId),
    } satisfies CommentaryPlayerSnapshot;
  }, [getPlayerName, getPlayerPersonality, members, playerId, playersById]);

  const stageKey =
    gameId && stage && stage !== "final"
      ? buildRoundStageKey(gameId, stage)
      : null;
  const visibleSubmission =
    mySubmission?.word
      ? mySubmission
      : otherSubmissions.find((submission) => submission.word) ?? null;
  const commentaryEventKey = stageKey
    ? buildRoundCommentaryEventKey({
        stageKey,
        currentTurnPlayerId,
        botPlayerIds: botPlayers.map((player) => player.playerId),
        wordHint: visibleSubmission?.word ?? null,
      })
    : null;

  useEffect(() => {
    if (!enabled) {
      setActiveBubble(null);
      logOfflineCommentaryDebug("disabled", {
        stageKey,
        botCount: botPlayers.length,
      });
      return;
    }

    if (modelState.status === "idle") {
      void preloadOfflineCommentaryModel();
    }
  }, [botPlayers.length, enabled, modelState.status, stageKey]);

  useEffect(() => {
    return () => {
      if (bubbleTimeoutRef.current !== null) {
        window.clearTimeout(bubbleTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled || !stageKey || !commentaryEventKey || !stage || botPlayers.length === 0) {
      return;
    }

    if (
      attemptedEventsRef.current.has(commentaryEventKey) ||
      pendingEventsRef.current.has(commentaryEventKey)
    ) {
      return;
    }

    if (modelState.status !== "ready") {
      logOfflineCommentaryDebug("waiting_for_model", {
        eventKey: commentaryEventKey,
        stageKey,
        stage,
        modelStatus: modelState.status,
        attemptedEventCount: attemptedEventsRef.current.size,
        botCount: botPlayers.length,
      });
      return;
    }

    const speaker = chooseCommentarySpeaker({
      botPlayers,
      currentTurnPlayerId,
    });

    if (!speaker) {
      logOfflineCommentaryDebug("no_speaker", {
        eventKey: commentaryEventKey,
        stageKey,
        stage,
        currentTurnPlayerId,
      });
      return;
    }

    const commentaryContext: RoundCommentaryContext = {
      stage,
      stageKey,
      pot,
      currentBet,
      currentTurnPlayerId,
      currentTurnPlayerName,
      speaker,
      player: playerSnapshot,
      players: [...botPlayers, ...(playerSnapshot ? [playerSnapshot] : [])],
      communityTileCount,
      wordHint: visibleSubmission?.word ?? null,
      scoreHint: visibleSubmission?.score ?? null,
    };
    const prompt = buildRoundCommentaryPrompt(commentaryContext);
    pendingEventsRef.current.add(commentaryEventKey);
    logOfflineCommentaryDebug("attempt", {
      eventKey: commentaryEventKey,
      stageKey,
      stage,
      speaker: speaker.name,
      attemptedEventCount: attemptedEventsRef.current.size,
      prompt,
    });

    let isCancelled = false;

    void (async () => {
      try {
        const rawText = await generateOfflineCommentaryText(prompt);
        if (isCancelled || !rawText) {
          return;
        }

        const parsed = parseRoundCommentary(rawText);
        if (parsed.type !== "message") {
          logOfflineCommentaryDebug("model_skip", {
            eventKey: commentaryEventKey,
            stageKey,
            stage,
            speaker: speaker.name,
            rawResponse: rawText,
          });
          return;
        }

        logOfflineCommentaryDebug("generated", {
          eventKey: commentaryEventKey,
          stageKey,
          stage,
          speaker: speaker.name,
          rawResponse: rawText,
          parsedMessage: parsed.message,
        });
        setActiveBubble({
          playerId: speaker.playerId,
          message: parsed.message,
          stageKey,
        });

        if (bubbleTimeoutRef.current !== null) {
          window.clearTimeout(bubbleTimeoutRef.current);
        }

        bubbleTimeoutRef.current = window.setTimeout(() => {
          setActiveBubble((current) =>
            current?.stageKey === stageKey ? null : current,
          );
        }, BUBBLE_DURATION_MS);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("[offline-commentary] generation_error", {
            eventKey: commentaryEventKey,
            stageKey,
            stage,
            speaker: speaker.name,
            error,
          });
        }
        // Commentary is decorative; generation failures should not affect gameplay.
      } finally {
        pendingEventsRef.current.delete(commentaryEventKey);
        attemptedEventsRef.current.add(commentaryEventKey);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    botPlayers,
    communityTileCount,
    currentBet,
    currentTurnPlayerId,
    currentTurnPlayerName,
    enabled,
    commentaryEventKey,
    modelState.status,
    mySubmission,
    otherSubmissions,
    playerSnapshot,
    pot,
    stage,
    stageKey,
  ]);

  return {
    modelState,
    activeBubble: enabled ? activeBubble : null,
  };
}
