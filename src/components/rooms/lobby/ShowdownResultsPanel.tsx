type Submission = {
  playerId: string;
  word: string | null;
  score: number;
  scoreBreakdown: {
    lengthPoints: number;
    speedBonus: number;
    validWordBonus: number;
  } | null;
  status: "submitted" | "forfeited" | "no-submission";
};

type ShowdownResults = {
  hasWinner: boolean;
  winnerId?: string | null;
  winningWord?: string | null;
  winningScore?: number;
  winningScoreBreakdown?: {
    lengthPoints: number;
    speedBonus: number;
    validWordBonus: number;
  } | null;
  allSubmissions?: Submission[];
};

export function ShowdownResultsPanel({
  showdownResults,
  playerId,
  getPlayerName,
}: {
  showdownResults: ShowdownResults;
  playerId: string | null;
  getPlayerName: (id: string) => string;
}) {
  return (
    <div className="mb-3 rounded-md border border-purple-700 bg-purple-950/40 p-4">
      <h3 className="mb-3 text-lg font-bold text-purple-300">Showdown Results</h3>

      {showdownResults.hasWinner ? (
        <>
          <div className="mb-4 rounded-md border border-amber-500 bg-amber-500/10 p-3">
            <p className="mb-1 text-sm font-semibold text-amber-300">
              Winner:{" "}
              {showdownResults.winnerId === playerId
                ? "You!"
                : getPlayerName(showdownResults.winnerId ?? "")}
            </p>
            {showdownResults.winningWord ? (
              <>
                <p className="mb-1 text-xl font-bold text-white">
                  {showdownResults.winningWord.toUpperCase()}
                </p>
                <p className="mb-2 text-2xl font-bold text-amber-400">
                  {showdownResults.winningScore} points
                </p>
                {showdownResults.winningScoreBreakdown && (
                  <div className="text-xs text-slate-300">
                    <p>
                      Length Points:{" "}
                      {showdownResults.winningScoreBreakdown.lengthPoints}
                    </p>
                    <p>
                      Speed Bonus: {showdownResults.winningScoreBreakdown.speedBonus}
                    </p>
                    <p>
                      Valid Word Bonus:{" "}
                      {showdownResults.winningScoreBreakdown.validWordBonus}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm italic text-slate-300">
                Won by default (all other players folded)
              </p>
            )}
          </div>

          {showdownResults.allSubmissions && showdownResults.allSubmissions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-300">
                All Submissions
              </p>
              <div className="space-y-2">
                {showdownResults.allSubmissions.map((submission) => {
                  const isForfeited = submission.status === "forfeited" || submission.status === "no-submission";
                  return (
                    <div
                      key={submission.playerId}
                      className={`rounded-md border p-2 text-sm ${
                        submission.playerId === showdownResults.winnerId
                          ? "border-amber-500 bg-amber-500/5"
                          : isForfeited
                            ? "border-slate-700 bg-slate-900/50"
                            : "border-slate-600 bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-200">
                            {submission.playerId === playerId
                              ? "You"
                              : getPlayerName(submission.playerId)}
                          </span>
                          <span className="mx-2 text-slate-400">|</span>
                          {isForfeited ? (
                            <span className="italic text-slate-500">
                              Forfeited
                            </span>
                          ) : (
                            <span className="font-bold text-white">
                              {submission.word?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className={`font-bold ${isForfeited ? "text-slate-600" : "text-cyan-300"}`}>
                          {submission.score} pts
                        </span>
                      </div>
                      {!isForfeited && submission.scoreBreakdown && (
                        <div className="mt-1 text-xs text-slate-400">
                          Length: {submission.scoreBreakdown.lengthPoints} | Speed:{" "}
                          {submission.scoreBreakdown.speedBonus} | Valid:{" "}
                          {submission.scoreBreakdown.validWordBonus}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-300">No winner - no eligible submissions.</p>
      )}
    </div>
  );
}
