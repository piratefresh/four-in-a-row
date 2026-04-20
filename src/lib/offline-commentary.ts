import { getBotCharacterForAuthUserId } from "../../convex/aiStrategy";

export type OfflineCommentaryModelStatus =
  | "idle"
  | "loading"
  | "ready"
  | "unsupported"
  | "error";

export type OfflineCommentaryModelState = {
  status: OfflineCommentaryModelStatus;
  error: string | null;
  progress: number | null;
  progressLabel: string | null;
  currentFile: string | null;
  hasLoadedBefore: boolean;
};

export type RoundCommentaryResult =
  | {
      type: "skip";
    }
  | {
      type: "message";
      message: string;
    };

export type ActiveRivalBubble = {
  playerId: string;
  message: string;
  stageKey: string;
};

export type CommentaryPlayerSnapshot = {
  playerId: string;
  authUserId?: string | null;
  seatIndex?: number | null;
  name: string;
  chips: number;
  isBot: boolean;
  personality: string | null;
};

export type RoundCommentaryContext = {
  stage: "preflop" | "flop" | "turn" | "river" | "final" | "showdown";
  stageKey: string;
  pot: number;
  currentBet: number;
  currentTurnPlayerId: string | null;
  currentTurnPlayerName: string | null;
  speaker: CommentaryPlayerSnapshot;
  player: CommentaryPlayerSnapshot | null;
  players: CommentaryPlayerSnapshot[];
  communityTileCount: number;
  wordHint: string | null;
  scoreHint: number | null;
};

export function buildRoundStageKey(gameId: string, stage: string) {
  return `${gameId}:${stage}`;
}

export function buildRoundCommentaryEventKey(args: {
  stageKey: string;
  currentTurnPlayerId: string | null;
  botPlayerIds: string[];
  wordHint: string | null;
}) {
  const segments = [args.stageKey];

  if (
    args.currentTurnPlayerId &&
    args.botPlayerIds.includes(args.currentTurnPlayerId)
  ) {
    segments.push(`turn:${args.currentTurnPlayerId}`);
  }

  if (args.wordHint) {
    segments.push(`word:${args.wordHint.trim().toUpperCase()}`);
  }

  return segments.join(":");
}

export function shouldShowOfflineCommentaryLoader(
  state: OfflineCommentaryModelState,
) {
  return state.status === "loading" && !state.hasLoadedBefore;
}

export function getBotNotes(authUserId: string | null | undefined) {
  return getBotCharacterForAuthUserId(authUserId)?.notes ?? null;
}

export function chooseCommentarySpeaker(args: {
  botPlayers: CommentaryPlayerSnapshot[];
  currentTurnPlayerId: string | null;
}) {
  const sortedBots = [...args.botPlayers].sort(
    (left, right) => (left.seatIndex ?? Number.MAX_SAFE_INTEGER) - (right.seatIndex ?? Number.MAX_SAFE_INTEGER),
  );
  if (sortedBots.length === 0) {
    return null;
  }

  const activeTurnBot =
    (args.currentTurnPlayerId
      ? sortedBots.find((player) => player.playerId === args.currentTurnPlayerId)
      : null) ?? null;

  return activeTurnBot ?? sortedBots[0] ?? null;
}

export function parseRoundCommentary(rawText: string): RoundCommentaryResult {
  const compact = rawText.replace(/\s+/g, " ").trim();
  if (!compact) {
    return { type: "skip" };
  }

  if (compact.toUpperCase() === "SKIP") {
    return { type: "skip" };
  }

  const normalized = compact
    .replace(/^["'`\s]+|["'`\s]+$/g, "")
    .replace(/[<>*_#`]/g, "")
    .trim();

  if (!normalized || normalized.toUpperCase() === "SKIP") {
    return { type: "skip" };
  }

  return {
    type: "message",
    message: normalized.split(/\s+/).slice(0, 18).join(" "),
  };
}

export function buildRoundCommentaryPrompt(context: RoundCommentaryContext) {
  const playerSummary = context.player
    ? `${context.player.name} (${context.player.chips} chips)`
    : "human player unavailable";
  const wordSummary = context.wordHint
    ? `Latest visible word: ${context.wordHint}${context.scoreHint !== null ? ` (${context.scoreHint} pts)` : ""}.`
    : "No revealed word yet this stage.";
  const botNotes = getBotNotes(context.speaker.authUserId);

  return [
    `You are ${context.speaker.name}, a rival in an offline word-poker game.`,
    `Title: ${context.speaker.personality ?? "Rival"}.`,
    botNotes ? `Style notes: ${botNotes}` : "",
    `Current stage: ${context.stage}.`,
    `Pot: ${context.pot}. Current bet: ${context.currentBet}.`,
    `Speaker chips: ${context.speaker.chips}. Player snapshot: ${playerSummary}.`,
    `Current turn: ${context.currentTurnPlayerName ?? "unknown"}.`,
    `Community tiles showing: ${context.communityTileCount}.`,
    wordSummary,
    "Reply with exactly one of these:",
    "1. SKIP",
    "2. One short sentence with at most 18 words.",
    "Rules: no emojis, no markdown, no quotes, no lists, no line breaks.",
    "Prefer giving a short line in most stages.",
    "Use SKIP only if the moment is truly too flat to comment on.",
  ]
    .filter(Boolean)
    .join("\n");
}
