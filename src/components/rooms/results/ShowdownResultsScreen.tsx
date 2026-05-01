import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getLetterValue } from "@/lib/letterValues";
import { cn } from "@/lib/utils";
import { WinSplashOverlay } from "./WinSplashOverlay";

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
  allSubmissions?: Submission[];
};

type ShowdownResultsScreenProps = {
  pot: number;
  playerId: string | null;
  showdownResults: ShowdownResults;
  getPlayerName: (id: string) => string;
  getPlayerAvatar: (id: string) => string | null;
  onReturnToOnlineRooms?: () => void;
  onReturnToMainMenu: () => void;
  isOfflineGame?: boolean;
  isGuestTutorialGame?: boolean;
  onPlayAnotherOffline?: () => void;
  isStartingNewGame?: boolean;
};

const PLAYER_GRADIENTS = [
  "from-[#8b5cf6] to-[#6d28d9]",
  "from-[#67d4ff] to-[#1d8fd1]",
  "from-[#5fe08a] to-[#1fb96d]",
  "from-[#ff9b54] to-[#ef5f3c]",
] as const;

type ResultsStep = "scoring" | "win" | "results";

export function ShowdownResultsScreen({
  pot,
  playerId,
  showdownResults,
  getPlayerName,
  getPlayerAvatar,
  onReturnToOnlineRooms,
  onReturnToMainMenu,
  isOfflineGame,
  isGuestTutorialGame,
  onPlayAnotherOffline,
  isStartingNewGame,
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
  const winnerName =
    showdownResults.winnerId && showdownResults.winnerId === playerId
      ? "You"
      : showdownResults.winnerId
        ? getPlayerName(showdownResults.winnerId)
        : null;

  const [resultsStep, setResultsStep] = useState<ResultsStep>(() =>
    scoringSubmission ? "scoring" : currentPlayerWon ? "win" : "results",
  );

  const advanceFromScoring = () => {
    setResultsStep(currentPlayerWon ? "win" : "results");
  };

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
        onDismiss={() => setResultsStep("results")}
      />
    );
  }

  return (
    <div
      data-testid="results-content"
      className="min-h-[calc(100vh-4rem)] bg-felt text-white"
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[430px] flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]">
        <header className="pt-6 text-center">
          <div
            data-testid="pot-amount"
            className="text-5xl font-semibold tracking-tight text-[#e2bd46]"
          >
            ${pot}
          </div>
          <p
            data-testid="winner-name"
            className="mt-4 text-[14px] uppercase tracking-[0.2em] text-white/48"
          >
            {showdownResults.hasWinner && winnerName
              ? `${winnerName} wins the pot`
              : "No winning submission"}
          </p>
        </header>

        <div className="mt-6 flex gap-3">
          {isGuestTutorialGame ? (
            <button
              type="button"
              onClick={onReturnToMainMenu}
              className="flex-1 rounded-[14px] border border-[#f3d66f]/55 bg-[linear-gradient(180deg,#f7da61_0%,#d6ac24_100%)] px-6 py-4 text-base font-semibold text-[#241700] shadow-[0_0_0_1px_rgba(255,235,163,0.12),0_12px_28px_rgba(0,0,0,0.45),0_0_22px_rgba(243,214,111,0.22)] transition-transform duration-200 hover:scale-[1.01]"
            >
              Main Menu
            </button>
          ) : isOfflineGame ? (
            <>
              <button
                type="button"
                onClick={onPlayAnotherOffline}
                disabled={isStartingNewGame}
                className="flex-1 rounded-[14px] border border-[#f3d66f]/55 bg-[linear-gradient(180deg,#f7da61_0%,#d6ac24_100%)] px-6 py-4 text-base font-semibold text-[#241700] shadow-[0_0_0_1px_rgba(255,235,163,0.12),0_12px_28px_rgba(0,0,0,0.45),0_0_22px_rgba(243,214,111,0.22)] transition-transform duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isStartingNewGame ? "Starting..." : "Play Another"}
              </button>

              <button
                type="button"
                onClick={onReturnToMainMenu}
                disabled={isStartingNewGame}
                className="flex-1 rounded-[14px] border border-white/20 bg-[linear-gradient(180deg,rgba(40,40,40,0.96),rgba(28,28,28,0.96))] px-6 py-4 text-base font-semibold text-white shadow-[0_12px_28px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                Main Menu
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onReturnToOnlineRooms}
                className="flex-1 rounded-[14px] border border-[#f3d66f]/55 bg-[linear-gradient(180deg,#f7da61_0%,#d6ac24_100%)] px-6 py-4 text-base font-semibold text-[#241700] shadow-[0_0_0_1px_rgba(255,235,163,0.12),0_12px_28px_rgba(0,0,0,0.45),0_0_22px_rgba(243,214,111,0.22)] transition-transform duration-200 hover:scale-[1.01]"
              >
                Return to Room List
              </button>

              <button
                type="button"
                onClick={onReturnToMainMenu}
                className="flex-1 rounded-[14px] border border-white/20 bg-[linear-gradient(180deg,rgba(40,40,40,0.96),rgba(28,28,28,0.96))] px-6 py-4 text-base font-semibold text-white shadow-[0_12px_28px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:scale-[1.01]"
              >
                Main Menu
              </button>
            </>
          )}
        </div>

        <p className="mt-3 text-center text-sm text-white/52">
          {isGuestTutorialGame
            ? "Return home when you are ready."
            : isOfflineGame
              ? "Start another bot game or return home."
              : "Return to the room list or head back home."}
        </p>

        <div id="tutorial-showdown-results" className="mt-8 flex-1 space-y-3">
          {submissions.map((submission, index) => (
            <ShowdownSubmissionCard
              key={submission.playerId}
              submission={submission}
              isWinner={submission.playerId === showdownResults.winnerId}
              isCurrentPlayer={submission.playerId === playerId}
              playerName={
                submission.playerId === playerId
                  ? `${getPlayerName(submission.playerId)} (you)`
                  : getPlayerName(submission.playerId)
              }
              avatarUrl={getPlayerAvatar(submission.playerId)}
              gradientClassName={
                PLAYER_GRADIENTS[index % PLAYER_GRADIENTS.length]
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShowdownSubmissionCard({
  submission,
  isWinner,
  isCurrentPlayer,
  playerName,
  avatarUrl,
  gradientClassName,
}: {
  submission: Submission;
  isWinner: boolean;
  isCurrentPlayer: boolean;
  playerName: string;
  avatarUrl?: string | null;
  gradientClassName: string;
}) {
  const displayWord =
    submission.status === "submitted" && submission.word
      ? submission.word.toUpperCase()
      : submission.status === "forfeited"
        ? "FORFEITED"
        : "NO SUBMISSION";
  const tiles = getDisplayTiles(submission);

  return (
    <article
      data-testid="player-result"
      className={cn(
        "rounded-[16px] border px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.28)]",
        isWinner
          ? "border-gold-bright bg-[linear-gradient(180deg,#f6d86f_0%,#d4a54a_56%,#b98227_100%)] text-[#2a1a02] shadow-[0_0_0_1px_rgba(255,235,163,0.32),0_16px_40px_rgba(0,0,0,0.36),0_0_24px_rgba(212,165,74,0.22)]"
          : "border-white/8 bg-felt-light text-white",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 shrink-0 border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
          <AvatarImage
            src={avatarUrl ?? undefined}
            alt={`${playerName} avatar`}
          />
          <AvatarFallback
            className={`bg-gradient-to-br ${gradientClassName} text-base font-bold text-white`}
          >
            {getInitials(playerName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                data-testid="player-name"
                className={cn(
                  "truncate text-[19px] font-semibold",
                  isWinner ? "text-[#2a1a02]" : "text-white",
                )}
              >
                {playerName}
              </div>
              <div
                data-testid="player-word"
                className={cn(
                  "mt-0.5 text-[12px] font-medium uppercase tracking-[0.12em]",
                  isWinner
                    ? submission.status === "submitted"
                      ? "text-[#3d2705]"
                      : "text-[#3d2705]"
                    : submission.status === "submitted"
                      ? "text-white"
                      : "text-white",
                )}
              >
                {displayWord}
                {isCurrentPlayer ? (
                  <span
                    className={cn(
                      "ml-2",
                      isWinner ? "text-[#3d2705]" : "text-[#d8b84a]",
                    )}
                  >
                    YOU
                  </span>
                ) : null}
              </div>
              {submission.status === "submitted" &&
              submission.scoreBreakdown ? (
                <div
                  className={cn(
                    "mt-1 text-[11px] tracking-[0.08em]",
                    isWinner ? "text-[#3d2705]" : "text-white",
                  )}
                >
                  Base {submission.scoreBreakdown.basePoints}
                  {" | "}
                  Mult {submission.scoreBreakdown.multiplierBonus}
                  {" | "}
                  Rack {submission.scoreBreakdown.fullRackBonus}
                </div>
              ) : null}
            </div>

            <div className="shrink-0 text-right">
              <div
                data-testid="player-score"
                className={cn(
                  "text-[32px] leading-none font-semibold",
                  isWinner ? "text-[#2a1a02]" : "text-white",
                )}
              >
                {submission.score}
              </div>
              <div
                className={cn(
                  "mt-1 text-[12px] uppercase tracking-[0.16em]",
                  isWinner ? "text-black" : "text-white/42",
                )}
              >
                pts
              </div>
            </div>
          </div>

          <div className="mt-4 min-h-14">
            {tiles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tiles.map((tile, index) => (
                  <ShowdownLetterTile
                    key={`${submission.playerId}-${index}-${tile.letter}-${tile.baseValue}`}
                    tile={tile}
                    isWinner={isWinner}
                  />
                ))}
              </div>
            ) : (
              <div
                className={cn(
                  "inline-flex rounded-full border px-3 py-1.5 text-[12px] uppercase tracking-[0.12em]",
                  isWinner
                    ? "border-[#3d2705]/18 bg-white/18 text-[#3d2705]/60"
                    : "border-cream/45 bg-cream text-[#1f1605]",
                )}
              >
                {submission.status === "forfeited"
                  ? "Folded before showdown"
                  : "No tiles played"}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
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
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-felt-deep px-5 py-[max(20px,env(safe-area-inset-top))] text-cream"
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
          className="text-center font-display text-[28px] font-extrabold tracking-[0.1em] text-gold"
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
          className="mt-4 rounded-[8px] bg-gold px-4 py-3 text-center text-felt-deep"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 + rows.length * 0.15 }}
        >
          <div className="font-display text-[32px] font-black leading-none">
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

function ShowdownLetterTile({
  tile,
  isWinner,
}: {
  tile: SubmissionTile;
  isWinner: boolean;
}) {
  const isCommunityTile = tile.source === "community";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "relative flex h-10 w-8 items-center justify-center rounded-[7px] border text-[22px] font-bold text-[#26190a] shadow-[0_6px_14px_rgba(0,0,0,0.25)]",
          isCommunityTile
            ? "border-[#e0bc4a] bg-[linear-gradient(180deg,#fff2c1_0%,#efd88f_100%)] shadow-[0_0_0_1px_rgba(238,206,99,0.28),0_0_10px_rgba(238,206,99,0.45)]"
            : "border-[#d1b06a]/70 bg-[linear-gradient(180deg,#f7e8c3_0%,#e8d3a2_100%)]",
        )}
      >
        {tile.letter.toUpperCase()}
        {tile.multiplier ? (
          <span
            className={`absolute left-0.5 top-0.5 rounded-[3px] px-0.5 text-[6px] font-black leading-none ${
              tile.multiplier === "3L"
                ? "bg-[#f1f5f9] text-[#111827]"
                : "bg-[#f3d66f] text-[#2b1800]"
            }`}
          >
            {tile.multiplier}
          </span>
        ) : null}
        {tile.wasChoice ? (
          <span className="absolute right-0.5 top-0.5 rounded-[3px] bg-[#d7af32] px-0.5 text-[6px] font-black leading-none text-[#2b1800]">
            ?
          </span>
        ) : null}
      </div>
      <span
        className={cn(
          "text-[10px] font-medium leading-none",
          isWinner ? "text-[#3d2705]/68" : "text-[#d7c58d]",
        )}
      >
        {tile.baseValue}
      </span>
    </div>
  );
}

function getDisplayTiles(submission: Submission) {
  if (submission.tiles && submission.tiles.length > 0) {
    return submission.tiles;
  }

  if (!submission.word) {
    return [];
  }

  return submission.word.split("").map((letter) => ({
    letter,
    baseValue: getLetterValue(letter) ?? 1,
    source: "hand" as const,
  }));
}

function getInitials(name: string) {
  const trimmed = name.replace(/\s+\(you\)$/i, "").trim();
  return trimmed[0]?.toUpperCase() ?? "?";
}
