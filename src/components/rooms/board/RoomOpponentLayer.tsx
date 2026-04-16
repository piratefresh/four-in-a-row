import { PhasePlayerBadge } from "../phases/PhasePlayerBadge";
import { WordTile } from "../table/WordTile";
import type { PlayerHand } from "./RoomHandsBoard.types";

const OPPONENT_POSITION_CLASS: Record<"top" | "left" | "right", string> = {
  top: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
  left: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
  right: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
};

export function getOpponentPosition(
  index: number,
  totalOpponents: number,
): "top" | "left" | "right" {
  if (totalOpponents === 1) return "top";
  if (totalOpponents === 2) return index === 0 ? "left" : "right";
  if (totalOpponents === 3) {
    if (index === 0) return "left";
    if (index === 1) return "top";
    return "right";
  }
  const positions: Array<"top" | "left" | "right"> = ["top", "left", "right"];
  return positions[index % 3]!;
}

export function getPhase1OpponentPosition(
  index: number,
  totalOpponents: number,
): "top" | "left" | "right" {
  if (totalOpponents === 1) return "top";
  if (totalOpponents === 2) return index === 0 ? "left" : "right";
  if (totalOpponents === 3) {
    if (index === 0) return "left";
    if (index === 1) return "top";
    return "right";
  }
  const positions: Array<"top" | "left" | "right"> = ["left", "top", "right"];
  return positions[index % 3]!;
}

type RoomOpponentLayerProps = {
  opponents: PlayerHand[];
  getPlayerName: (playerId: string) => string;
  getPlayerAvatar: (playerId: string) => string | null;
  otherSubmissions: any[];
  wordSubmissions?: { isCompleted?: boolean } | null;
};

export function RoomOpponentLayer({
  opponents,
  getPlayerName,
  getPlayerAvatar,
  otherSubmissions,
  wordSubmissions,
}: RoomOpponentLayerProps) {
  return opponents.map((hand, opponentIndex) => {
    const position = getOpponentPosition(opponentIndex, opponents.length);
    const opponentName = getPlayerName(hand.playerId);
    const opponentSubmission = otherSubmissions.find(
      (submission) => submission.playerId === hand.playerId,
    );

    return (
      <div
        key={`opponent-${hand._id}`}
        className={`absolute ${OPPONENT_POSITION_CLASS[position]} z-20`}
      >
        <PhasePlayerBadge
          name={opponentName}
          avatarUrl={getPlayerAvatar(hand.playerId)}
          chips={hand.chips ?? 0}
          bet={hand.betThisRound ?? 0}
          avatarSizeClass="h-12 w-12 sm:h-14 sm:w-14"
          initialsClass="text-[10px] sm:text-[12px]"
          infoCardClassName="min-w-[102px] px-2.5 py-1 sm:min-w-[118px] sm:px-3 sm:py-1.5"
        />

        {wordSubmissions?.isCompleted && opponentSubmission?.word && (
          <div className="mt-3 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              {opponentSubmission.tiles.map((tile: any, index: number) => (
                <WordTile
                  key={`revealed-opponent-${hand._id}-${index}`}
                  letter={tile.letter}
                  baseValue={tile.baseValue}
                  showValue={true}
                  size="sm"
                  variant="default"
                />
              ))}
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <span
                  className={`text-[13px] font-bold uppercase sm:text-[18px] ${
                    opponentSubmission.score === 0
                      ? "text-red-400 line-through decoration-2 decoration-red-500"
                      : "text-white"
                  }`}
                >
                  {opponentSubmission.word.toUpperCase()}
                </span>
                {opponentSubmission.score === 0 && (
                  <span className="ml-2 rounded-md bg-red-600/90 px-2 py-0.5 text-[10px] font-bold text-white sm:text-[12px]">
                    INVALID
                  </span>
                )}
              </div>
              <span
                className={`rounded-md px-2 py-1 text-[12px] font-semibold sm:px-3 sm:text-[16px] ${
                  opponentSubmission.score === 0
                    ? "bg-red-900/40 text-red-300"
                    : "bg-[#121317] text-[#d4af37]"
                }`}
              >
                Score: {opponentSubmission.score}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  });
}
