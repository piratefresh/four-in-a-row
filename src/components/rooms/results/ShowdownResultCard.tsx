import type { WordTileSize } from "../table/word-tile-v2";
import { WordTile } from "../table/word-tile-v2";

type SubmissionTile = {
  letter: string;
  baseValue: number;
  multiplier?: "2L" | "3L";
  source: "hand" | "community";
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

type ShowdownResultCardProps = {
  submission: Submission;
  isWinner: boolean;
  isCurrentPlayer: boolean;
  playerName: string;
  playerInitials: string;
  avatarColor: string;
  isDesktop?: boolean;
};

export function ShowdownResultCard({
  submission,
  isWinner,
  isCurrentPlayer,
  playerName,
  playerInitials,
  avatarColor,
  isDesktop = false,
}: ShowdownResultCardProps) {
  const word =
    submission.status === "submitted" && submission.word
      ? submission.word.toUpperCase()
      : null;
  const tileSize: WordTileSize = isDesktop && isWinner ? "sm" : "xs";

  return (
    <article
      data-testid="player-result"
      className={
        isWinner
          ? "relative rounded-xl border border-[#806316] bg-[linear-gradient(180deg,#f4d35e_0%,#d4af37_80%,#b8902c_100%)] px-[18px] py-[22px] text-[#1a1208] shadow-[0_8px_24px_rgba(212,175,55,0.18),inset_0_1px_0_rgba(255,255,255,0.35)]"
          : "relative rounded-xl border border-[rgba(212,175,55,0.15)] bg-[rgba(0,0,0,0.28)] px-5 py-[18px] text-cream shadow-none"
      }
    >
      {isWinner && (
        <div className="absolute right-4 top-3.5 rounded-[3px] bg-[rgba(26,18,8,0.15)] px-2 py-0.5 font-mono text-[9px] font-bold tracking-[2px] text-[#1a1208]">
          ★ TAKES THE POT
        </div>
      )}

      <div className="flex items-start gap-3.5">
        <div
          className="flex shrink-0 items-center justify-center rounded-full font-body text-base font-extrabold"
          style={{
            width: isWinner && isDesktop ? 50 : 44,
            height: isWinner && isDesktop ? 50 : 44,
            background: isWinner
              ? "rgba(26,18,8,0.18)"
              : avatarColor,
            color: isWinner ? "#1a1208" : "#0c1410",
            fontSize: isWinner && isDesktop ? 18 : 16,
          }}
        >
          {playerInitials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2.5">
            <div
              data-testid="player-name"
              className="font-serif font-semibold leading-[1.1]"
              style={{
                fontSize: isWinner && isDesktop ? 22 : 18,
              }}
            >
              {playerName}
              {isCurrentPlayer && (
                <span className="italic opacity-65"> (you)</span>
              )}
            </div>
            <div className="text-right">
              <span
                data-testid="player-score"
                className="font-serif font-bold leading-none"
                style={{
                  fontSize: isWinner && isDesktop ? 38 : 28,
                }}
              >
                {submission.score}
              </span>
              <span className="ml-1 font-mono text-[9px] tracking-[1.6px] opacity-70">
                PTS
              </span>
            </div>
          </div>

          <div className="mt-1 flex items-center gap-2">
            {word ? (
              <>
                <div data-testid="player-word" className="font-mono text-[11px] font-semibold tracking-[2.4px]">
                  {word}
                </div>
                {isCurrentPlayer && !isWinner && (
                  <div className="rounded-[3px] border border-[rgba(212,175,55,0.4)] px-1.5 py-0.5 font-mono text-[8px] tracking-[1.4px] text-gold">
                    YOU
                  </div>
                )}
              </>
            ) : (
              <div className="font-mono text-[11px] tracking-[1.4px] opacity-60">
                {submission.status === "forfeited"
                  ? "FOLDED"
                  : "NO SUBMISSION"}
              </div>
            )}
          </div>

          {submission.status === "submitted" && submission.scoreBreakdown && (
            <div className="mt-1 font-mono text-[10px] tracking-[0.8px] opacity-65">
              Base {submission.scoreBreakdown.basePoints}
              {" · "}Mult +{submission.scoreBreakdown.multiplierBonus}
              {" · "}Rack +{submission.scoreBreakdown.fullRackBonus}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1">
        {submission.tiles && submission.tiles.length > 0 ? (
          submission.tiles.map((tile, i) => (
            <WordTile
              key={`${submission.playerId}-${i}-${tile.letter}-${tile.baseValue}`}
              letter={tile.letter}
              baseValue={tile.baseValue}
              multiplier={tile.multiplier}
              size={tileSize}
              variant={tile.source === "community" ? "community" : "default"}
              inlineValue
            />
          ))
        ) : word ? (
          word.split("").map((letter, i) => (
            <WordTile
              key={`${submission.playerId}-fallback-${i}`}
              letter={letter}
              size={tileSize}
              variant="default"
              inlineValue
            />
          ))
        ) : (
          <span
            className={
              isWinner
                ? "rounded-full border border-[#3d2705]/20 bg-white/18 px-3 py-1.5 text-[12px] uppercase tracking-[0.12em] text-[#3d2705]/60"
                : "rounded-full border border-cream/45 bg-cream px-3 py-1.5 text-[12px] uppercase tracking-[0.12em] text-felt-deep"
            }
          >
            {submission.status === "forfeited"
              ? "Did not play a word"
              : "No tiles played"}
          </span>
        )}
      </div>
    </article>
  );
}
