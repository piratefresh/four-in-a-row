import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getLetterValue } from "@/lib/letterValues";

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
  onPlayAnotherOffline?: () => void;
  isStartingNewGame?: boolean;
};

const PLAYER_GRADIENTS = [
  "from-[#8b5cf6] to-[#6d28d9]",
  "from-[#67d4ff] to-[#1d8fd1]",
  "from-[#5fe08a] to-[#1fb96d]",
  "from-[#ff9b54] to-[#ef5f3c]",
] as const;

export function ShowdownResultsScreen({
  pot,
  playerId,
  showdownResults,
  getPlayerName,
  getPlayerAvatar,
  onReturnToOnlineRooms,
  onReturnToMainMenu,
  isOfflineGame,
  onPlayAnotherOffline,
  isStartingNewGame,
}: ShowdownResultsScreenProps) {
  const submissions = showdownResults.allSubmissions ?? [];
  const winnerName =
    showdownResults.winnerId && showdownResults.winnerId === playerId
      ? "You"
      : showdownResults.winnerId
        ? getPlayerName(showdownResults.winnerId)
        : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,#19160d_0%,#090909_28%,#050505_100%)] text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[430px] flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]">
        <header className="pt-6 text-center">
          <div className="text-5xl font-semibold tracking-tight text-[#e2bd46]">
            ${pot}
          </div>
          <p className="mt-4 text-[14px] uppercase tracking-[0.2em] text-white/48">
            {showdownResults.hasWinner && winnerName
              ? `${winnerName} wins the pot`
              : "No winning submission"}
          </p>
        </header>

        <div className="mt-6 flex gap-3">
          {isOfflineGame ? (
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
          {isOfflineGame
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
      className={`rounded-[16px] border px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.28)] ${
        isWinner
          ? "border-[#8b6f1b] bg-[linear-gradient(180deg,rgba(41,34,15,0.96),rgba(27,24,14,0.96))] shadow-[0_0_0_1px_rgba(212,175,55,0.15),0_16px_40px_rgba(0,0,0,0.32)]"
          : "border-white/8 bg-[linear-gradient(180deg,rgba(20,20,20,0.96),rgba(14,14,14,0.96))]"
      }`}
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
              <div className="truncate text-[19px] font-semibold text-white">
                {playerName}
              </div>
              <div
                className={`mt-0.5 text-[12px] font-medium uppercase tracking-[0.12em] ${
                  submission.status === "submitted"
                    ? "text-white/55"
                    : "text-white/38"
                }`}
              >
                {displayWord}
                {isCurrentPlayer ? (
                  <span className="ml-2 text-[#d8b84a]">YOU</span>
                ) : null}
              </div>
              {submission.status === "submitted" &&
              submission.scoreBreakdown ? (
                <div className="mt-1 text-[11px] tracking-[0.08em] text-white/42">
                  Base {submission.scoreBreakdown.basePoints}
                  {" • "}
                  Mult {submission.scoreBreakdown.multiplierBonus}
                  {" • "}
                  Rack {submission.scoreBreakdown.fullRackBonus}
                </div>
              ) : null}
            </div>

            <div className="shrink-0 text-right">
              <div
                className={`text-[32px] leading-none font-semibold ${
                  isWinner ? "text-[#f1c84c]" : "text-white"
                }`}
              >
                {submission.score}
              </div>
              <div className="mt-1 text-[12px] uppercase tracking-[0.16em] text-white/42">
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
                  />
                ))}
              </div>
            ) : (
              <div className="inline-flex rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-[12px] uppercase tracking-[0.12em] text-white/38">
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

function ShowdownLetterTile({ tile }: { tile: SubmissionTile }) {
  const isCommunityTile = tile.source === "community";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`relative flex h-10 w-8 items-center justify-center rounded-[7px] border text-[22px] font-bold text-[#26190a] shadow-[0_6px_14px_rgba(0,0,0,0.25)] ${
          isCommunityTile
            ? "border-[#e0bc4a] bg-[linear-gradient(180deg,#fff2c1_0%,#efd88f_100%)] shadow-[0_0_0_1px_rgba(238,206,99,0.28),0_0_10px_rgba(238,206,99,0.45)]"
            : "border-[#d1b06a]/70 bg-[linear-gradient(180deg,#f7e8c3_0%,#e8d3a2_100%)]"
        }`}
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
      <span className="text-[10px] font-medium leading-none text-[#d7c58d]">
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
