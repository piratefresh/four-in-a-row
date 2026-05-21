import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WinSplashOverlay } from "./WinSplashOverlay";
import { ShowdownResultCard } from "./ShowdownResultCard";
import { ShowdownBreadcrumb } from "./ShowdownBreadcrumb";
import { useMediaQuery } from "../hooks/useMediaQuery";

type SubmissionTile = {
  letter: string;
  baseValue: number;
  multiplier?: "2L" | "3L";
  source: "hand" | "community";
  cardIndex?: number;
  wasChoice?: boolean;
};

type Submission = {
  playerId: string;
  word: string | null;
  tiles?: SubmissionTile[];
  score: number;
  scoreBreakdown: {
    basePoints: number;
    multiplierBonus: number;
    fullRackBonus: number;
  } | null;
  status: "submitted" | "forfeited" | "no-submission";
};

type ShowdownResults = {
  hasWinner: boolean;
  winnerId?: string | null;
  winningWord?: string | null;
  winningScore?: number;
  winningScoreBreakdown?: {
    basePoints: number;
    multiplierBonus: number;
    fullRackBonus: number;
  } | null;
  allSubmissions?: Submission[];
};

type ShowdownResultsScreenProps = {
  pot: number;
  playerId: string | null;
  showdownResults: ShowdownResults;
  getPlayerName: (id: string) => string;
  roomName: string;
  handNumber?: number;
  onReturnToOnlineRooms?: () => void;
  onReturnToMainMenu: () => void;
  isOfflineGame?: boolean;
  isGuestTutorialGame?: boolean;
  onPlayAnotherOffline?: () => void;
  isStartingNewGame?: boolean;
  onPlayAgainOnline?: () => void;
  isStartingPlayAgain?: boolean;
};

const PLAYER_COLORS = [
  "rgb(167, 139, 250)",
  "rgb(126, 196, 207)",
  "rgb(250, 179, 135)",
  "rgb(224, 122, 95)",
] as const;

type ResultsStep = "scoring" | "win" | "results";

export function ShowdownResultsScreen({
  pot,
  playerId,
  showdownResults,
  getPlayerName,
  roomName,
  handNumber,
  onReturnToOnlineRooms,
  onReturnToMainMenu,
  isOfflineGame,
  isGuestTutorialGame,
  onPlayAnotherOffline,
  isStartingNewGame,
  onPlayAgainOnline,
  isStartingPlayAgain,
}: ShowdownResultsScreenProps) {
  const submissions = showdownResults.allSubmissions ?? [];
  const currentPlayerSubmission = useMemo(() => {
    if (!playerId) return null;
    return (
      submissions.find((submission) => submission.playerId === playerId) ?? null
    );
  }, [playerId, submissions]);
  const scoringSubmission =
    currentPlayerSubmission ??
    submissions.find(
      (submission) => submission.playerId === showdownResults.winnerId,
    ) ??
    submissions[0] ??
    null;
  const currentPlayerWon =
    playerId != null &&
    showdownResults.hasWinner &&
    showdownResults.winnerId === playerId;
  const didWinByFold =
    showdownResults.hasWinner &&
    submissions.some((submission) => submission.status === "forfeited") &&
    !submissions.some((submission) => submission.status === "submitted");

  const [resultsStep, setResultsStep] = useState<ResultsStep>(() =>
    didWinByFold
      ? "results"
      : scoringSubmission
        ? "scoring"
        : currentPlayerWon
          ? "win"
          : "results",
  );

  const advanceFromScoring = useCallback(() => {
    setResultsStep(currentPlayerWon ? "win" : "results");
  }, [currentPlayerWon]);

  const dismissWinSplash = useCallback(() => {
    setResultsStep("results");
  }, []);

  const handleBack = useCallback(() => {
    if (onReturnToOnlineRooms) {
      onReturnToOnlineRooms();
    } else {
      onReturnToMainMenu();
    }
  }, [onReturnToOnlineRooms, onReturnToMainMenu]);

  const submissionColors = useMemo(() => {
    const map = new Map<string, string>();
    submissions.forEach((submission, index) => {
      map.set(submission.playerId, PLAYER_COLORS[index % PLAYER_COLORS.length]);
    });
    return map;
  }, [submissions]);

  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (resultsStep === "scoring" && scoringSubmission) {
    return (
      <ScoringScreen
        submission={scoringSubmission}
        onContinue={advanceFromScoring}
      />
    );
  }

  if (resultsStep === "win") {
    return (
      <WinSplashOverlay
        pot={pot}
        winningWord={showdownResults.winningWord}
        winningScore={showdownResults.winningScore}
        onDismiss={dismissWinSplash}
      />
    );
  }

  const winnerName =
    showdownResults.winnerId && showdownResults.winnerId === playerId
      ? "You"
      : showdownResults.winnerId
        ? getPlayerName(showdownResults.winnerId)
        : null;
  const winnerWord = showdownResults.winningWord;
  const winnerScore = showdownResults.winningScore;

  const headline =
    winnerName && !didWinByFold
      ? `${winnerName} takes the pot`
      : winnerName && didWinByFold
        ? `${winnerName} wins by fold`
        : "Hand complete";

  const narrative = generateNarrative(
    submissions,
    showdownResults,
    getPlayerName,
    didWinByFold,
  );

  const foldCount = submissions.filter((s) => s.status === "forfeited").length;
  const wordCount = submissions.filter((s) => s.status === "submitted").length;
  const playerCount = submissions.length;

  return (
    <div
      data-testid="results-content"
      className="flex min-h-dvh flex-col bg-linear-to-b from-wire to-wire-deep font-body text-cream"
    >
      <ShowdownBreadcrumb
        roomName={roomName}
        handNumber={handNumber}
        onBack={handleBack}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-auto lg:grid lg:grid-cols-[1fr_1.2fr] lg:overflow-hidden">
        {/* ── LEFT PANEL — Winner Spotlight ── */}
        <div className="flex flex-col justify-center border-r border-[rgba(212,175,55,0.12)] px-4 pb-8 pt-4 lg:px-12 lg:py-10">
          <div className="mx-auto w-full max-w-[420px]">
            <div className="font-mono text-[10px] tracking-[3px] text-gold lg:mb-3.5 text-center sm:text-left">
              HEADLINE · SHOWDOWN
            </div>

            <h1
              data-testid="winner-name"
              className="text-center mt-1 font-serif text-[32px] font-semibold leading-[0.95] tracking-[-0.6px] text-cream  sm:text-left lg:text-[56px] lg:tracking-[-1.5px]"
            >
              {headline}
            </h1>

            <p className="text-center mt-3 max-w-[420px] text-sm leading-relaxed text-[rgba(232,220,192,0.6)]  sm:text-left lg:mt-3.5">
              Winning word: {winnerWord}
            </p>

            {didWinByFold && (
              <p className="mt-2 text-sm leading-relaxed text-[rgba(232,220,192,0.45)]">
                The hand ended immediately because only one player remained.
              </p>
            )}

            {/* Pot Card */}
            {isDesktop && !didWinByFold && (
              <div className="mt-7 flex items-center justify-between rounded-2xl border border-[rgba(212,175,55,0.35)] bg-[linear-gradient(180deg,rgba(212,175,55,0.12)_0%,rgba(0,0,0,0.3)_100%)] p-6">
                <div>
                  <div className="font-mono text-[9px] tracking-[1.8px] text-[rgba(232,220,192,0.6)]">
                    POT AWARDED
                  </div>
                  <div
                    data-testid="pot-amount"
                    className="mt-0.5 font-serif text-[40px] font-semibold leading-none text-gold lg:text-[56px]"
                  >
                    ${pot}
                  </div>
                </div>
                {winnerName && winnerWord && winnerScore != null && (
                  <div className="text-right">
                    <div className="font-mono text-[9px] tracking-[1.6px] text-[rgba(232,220,192,0.5)]">
                      {winnerName.toUpperCase()}
                    </div>
                    <div className="font-serif text-lg font-semibold text-cream lg:text-[22px]">
                      {winnerWord.toUpperCase()}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] tracking-[1px] text-[#9ec27a]">
                      +{winnerScore} PTS
                    </div>
                  </div>
                )}
              </div>
            )}

            {isDesktop && didWinByFold && (
              <div className="mt-7 flex items-center justify-between rounded-2xl border border-[rgba(212,175,55,0.35)] bg-[linear-gradient(180deg,rgba(212,175,55,0.12)_0%,rgba(0,0,0,0.3)_100%)] p-6">
                <div>
                  <div className="font-mono text-[9px] tracking-[1.8px] text-[rgba(232,220,192,0.6)]">
                    POT AWARDED
                  </div>
                  <div
                    data-testid="pot-amount"
                    className="mt-0.5 font-serif text-[40px] font-semibold leading-none text-gold lg:text-[56px]"
                  >
                    ${pot}
                  </div>
                </div>
                {winnerName && (
                  <div className="text-right">
                    <div className="font-serif text-lg font-semibold text-cream lg:text-[22px]">
                      {winnerName.toUpperCase()}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] tracking-[1px] text-[#9ec27a]">
                      WINS BY FOLD
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="mt-4 flex gap-2.5">
              {isGuestTutorialGame ? (
                <button
                  type="button"
                  onClick={onReturnToMainMenu}
                  className="flex flex-1 items-center justify-center gap-2.5 rounded-lg border border-[#806316] bg-[linear-gradient(180deg,#f4d35e_0%,#d4af37_60%,#a8801f_100%)] px-4 py-3.5 font-body text-[13px] font-bold uppercase tracking-[1px] text-[#1a1208] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.4)]"
                >
                  Main Menu
                </button>
              ) : isOfflineGame ? (
                <>
                  <button
                    type="button"
                    onClick={onPlayAnotherOffline}
                    disabled={isStartingNewGame}
                    className="flex flex-1 items-center justify-center gap-2.5 rounded-lg border border-[#806316] bg-[linear-gradient(180deg,#f4d35e_0%,#d4af37_60%,#a8801f_100%)] px-4 py-3.5 font-body text-[13px] font-bold uppercase tracking-[1px] text-[#1a1208] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isStartingNewGame ? "Starting..." : "Play Another"}
                  </button>
                  <button
                    type="button"
                    onClick={onReturnToMainMenu}
                    disabled={isStartingNewGame}
                    className="rounded-lg border border-[rgba(212,175,55,0.3)] bg-transparent px-4 py-3.5 font-body text-[13px] font-semibold text-cream disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Main Menu
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onPlayAgainOnline}
                    disabled={isStartingPlayAgain}
                    data-testid="play-again-button"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#806316] bg-[linear-gradient(180deg,#f4d35e_0%,#d4af37_60%,#a8801f_100%)] px-4 py-3.5 font-body text-[13px] font-bold uppercase tracking-[1px] text-[#1a1208] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isStartingPlayAgain ? "Starting..." : "Deal another hand"}
                  </button>
                  <button
                    type="button"
                    onClick={onReturnToOnlineRooms}
                    data-testid="lobby-button"
                    className="rounded-lg border border-[rgba(212,175,55,0.3)] bg-transparent px-5 py-3.5 font-body text-[13px] font-semibold text-cream"
                  >
                    Leave table
                  </button>
                  <button
                    type="button"
                    onClick={onReturnToMainMenu}
                    className="rounded-lg border border-[rgba(212,175,55,0.15)] bg-transparent px-4 py-3.5 font-body text-[13px] font-semibold text-[rgba(232,220,192,0.55)]"
                  >
                    Menu
                  </button>
                </>
              )}
            </div>

            {/* Timeline row */}
            {isDesktop && (
              <div className="mt-4.5 flex items-baseline gap-3 rounded-lg border border-[rgba(212,175,55,0.1)] bg-[rgba(0,0,0,0.25)] p-3 font-mono text-[11px]">
                <span className="text-[rgba(232,220,192,0.35)]">NOW</span>
                <span className="text-gold">●</span>
                <span className="text-[rgba(232,220,192,0.55)]">
                  {roomName.toUpperCase()}
                </span>
                <span className="flex-1 font-body text-cream">
                  {winnerName && winnerWord
                    ? `${winnerName} played ${winnerWord.toUpperCase()} · won $${pot} pot`
                    : winnerName
                      ? `${winnerName} won $${pot} pot`
                      : `$${pot} pot awarded`}
                </span>
                {winnerScore != null && !didWinByFold && (
                  <span className="font-serif text-sm font-semibold text-gold">
                    +{winnerScore}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL — Scoreboard ── */}
        <div className="overflow-auto p-4 lg:px-12 lg:py-10">
          <div className="mx-auto w-full max-w-[600px]">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-mono text-[10px] tracking-[2px] text-[rgba(232,220,192,0.5)]">
                  SCOREBOARD
                </div>
                <div className="mt-0.5 font-serif text-[22px] font-semibold italic text-cream">
                  How it played
                </div>
              </div>
              <div className="hidden font-mono text-[10px] tracking-[1.4px] text-[rgba(232,220,192,0.5)] lg:block">
                {playerCount} PLAYERS
                {foldCount > 0 && ` · ${foldCount} FOLD`}
                {wordCount > 0 &&
                  ` · ${wordCount} WORD${wordCount !== 1 ? "S" : ""} PLAYED`}
              </div>
            </div>
            {/* Mobile stats */}
            <div className="mt-4 font-mono text-[10px] tracking-[1.4px] text-[rgba(232,220,192,0.5)] lg:hidden">
              {playerCount} PLAYERS
              {foldCount > 0 && ` · ${foldCount} FOLD`}
              {wordCount > 0 &&
                ` · ${wordCount} WORD${wordCount !== 1 ? "S" : ""} PLAYED`}
            </div>
            <div className="mt-4.5 flex flex-col gap-2.5 lg:mt-6">
              {submissions.map((submission) => (
                <ShowdownResultCard
                  key={submission.playerId}
                  submission={submission}
                  isWinner={submission.playerId === showdownResults.winnerId}
                  isCurrentPlayer={submission.playerId === playerId}
                  playerName={
                    submission.playerId === playerId
                      ? getPlayerName(submission.playerId)
                      : getPlayerName(submission.playerId)
                  }
                  playerInitials={getInitials(
                    getPlayerName(submission.playerId),
                  )}
                  avatarColor={
                    submissionColors.get(submission.playerId) ??
                    PLAYER_COLORS[0]
                  }
                  isDesktop
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoringScreen({
  submission,
  onContinue,
}: {
  submission: Submission;
  onContinue: () => void;
}) {
  const word =
    submission.status === "submitted" && submission.word
      ? submission.word.toUpperCase()
      : submission.status === "forfeited"
        ? "FORFEITED"
        : "NO SUBMISSION";
  const breakdown = submission.scoreBreakdown;
  const rows = breakdown
    ? [
        { label: "Letter values", value: `+${breakdown.basePoints}` },
        { label: "Multiplier bonus", value: `+${breakdown.multiplierBonus}` },
        { label: "Full rack bonus", value: `+${breakdown.fullRackBonus}` },
      ]
    : [{ label: "Submitted score", value: `+${submission.score}` }];

  useEffect(() => {
    const timer = window.setTimeout(onContinue, 2400);
    return () => window.clearTimeout(timer);
  }, [onContinue]);

  return (
    <div
      data-testid="scoring-screen"
      className="flex min-h-dvh items-center justify-center bg-linear-to-b from-wire to-wire-deep px-5 py-[max(20px,env(safe-area-inset-top))] text-cream"
      onClick={onContinue}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onContinue();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <section
        aria-label="Score breakdown"
        className="w-full max-w-[390px] px-1"
      >
        <motion.div
          className="text-center font-serif text-[28px] font-extrabold tracking-[0.1em] text-gold"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {word.split("").join(" ")}
        </motion.div>

        <div className="mt-6">
          {rows.map((row, index) => (
            <motion.div
              key={row.label}
              className="flex justify-between border-b border-cream/10 py-2.5 text-xs text-cream"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15 + index * 0.15 }}
            >
              <span>{row.label}</span>
              <span className="font-mono font-bold text-gold">{row.value}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-4 rounded-lg bg-gold px-4 py-3 text-center text-felt-deep"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 + rows.length * 0.15 }}
        >
          <div className="font-serif text-[32px] font-black leading-none">
            + {submission.score}
          </div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em]">
            Stronger words win bigger pots
          </div>
        </motion.div>

        <motion.div
          className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-gold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.3 }}
        >
          Tap to continue
        </motion.div>
      </section>
    </div>
  );
}

function generateNarrative(
  submissions: Submission[],
  results: ShowdownResults,
  getPlayerName: (id: string) => string,
  didWinByFold: boolean,
): string {
  if (didWinByFold) {
    return "Everyone folded. The last player standing takes the pot uncontested.";
  }

  if (!results.hasWinner || !results.winnerId) {
    return "No winning word was played.";
  }

  const winnerSub = submissions.find((s) => s.playerId === results.winnerId);
  if (!winnerSub || !winnerSub.word) {
    return "The pot was awarded without a word being played.";
  }

  const word = winnerSub.word.toUpperCase();
  const score = winnerSub.score;

  const multiplierTiles = winnerSub.tiles?.filter((t) => t.multiplier) ?? [];
  const multiplierNote =
    multiplierTiles.length > 0
      ? multiplierTiles
          .map((t) => `a doubled ${t.letter.toUpperCase()}`)
          .join(" on ")
      : null;

  const otherSubmissions = submissions.filter(
    (s) => s.playerId !== results.winnerId && s.status === "submitted",
  );
  const runnerUp = otherSubmissions[0];
  const comparison =
    runnerUp && runnerUp.word
      ? `, ${score - runnerUp.score} above ${getPlayerName(runnerUp.playerId)}'s ${runnerUp.word.toUpperCase()}`
      : "";

  const multiplierPrefix = multiplierNote ? ` — ${multiplierNote}` : "";

  return `${word} clears the field at ${score}${multiplierPrefix}${comparison}.`;
}

function getInitials(name: string): string {
  const trimmed = name.replace(/\s+\(you\)$/i, "").trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (trimmed[0] ?? "?").toUpperCase();
}
