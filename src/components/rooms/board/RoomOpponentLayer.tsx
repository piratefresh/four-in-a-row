import { PhasePlayerBadge } from "../phases/PhasePlayerBadge";
import { WordTile } from "../table/word-tile-v2";
import type { PlayerHand } from "./RoomHandsBoard.types";
import { ROOM_OPPONENT_POSITION_CLASS } from "./roomBoardLayout";

function formatPlayerActionLabel(
  lastAction?: "check" | "call" | "raise" | "fold",
) {
  if (!lastAction) return undefined;
  return lastAction.toUpperCase();
}

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
  currentTurnPlayerId?: string | null;
  getPlayerName: (playerId: string) => string;
  getPlayerAvatar: (playerId: string) => string | null;
  getPlayerPersonality: (playerId: string) => string | null;
  getBlindPosition?: (playerId: string) => "dealer" | "small" | "big" | undefined;
  otherSubmissions: any[];
  wordSubmissions?: { isCompleted?: boolean } | null;
  gameStage?: string;
  currentPlayerHasSubmitted?: boolean;
  canRevealSubmittedWords?: boolean;
};

export function RoomOpponentLayer({
  opponents,
  currentTurnPlayerId,
  getPlayerName,
  getPlayerAvatar,
  getPlayerPersonality,
  getBlindPosition,
  otherSubmissions,
  wordSubmissions,
  gameStage,
  currentPlayerHasSubmitted,
  canRevealSubmittedWords,
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
        className={`absolute ${ROOM_OPPONENT_POSITION_CLASS[position]} z-20`}
      >
        <PhasePlayerBadge
          name={opponentName}
          avatarUrl={getPlayerAvatar(hand.playerId)}
          chips={hand.chips ?? 0}
          actionLabel={formatPlayerActionLabel(hand.lastAction)}
          isActiveTurn={currentTurnPlayerId === hand.playerId}
          personality={getPlayerPersonality(hand.playerId)}
          blindPosition={getBlindPosition?.(hand.playerId)}
          avatarSizeClass="h-9 w-9 xs:h-10 xs:w-10 sm:h-14 sm:w-14"
          initialsClass="text-[8px] xs:text-[9px] sm:text-[12px]"
          infoCardClassName="min-w-[82px] px-1.5 py-1 xs:min-w-[92px] xs:px-2 sm:min-w-[118px] sm:px-3 sm:py-1.5"
          infoLayout="compact"
        />
        {gameStage === "showdown" &&
          wordSubmissions?.isCompleted &&
          currentPlayerHasSubmitted &&
          canRevealSubmittedWords &&
          opponentSubmission?.word && (
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
