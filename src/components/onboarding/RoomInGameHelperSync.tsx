import type { Id } from "../../../convex/_generated/dataModel";
import type { RoomGameContextValue } from "@/components/rooms/context/RoomGameContext";
import type {
  PlayerHand,
  Tile,
} from "@/components/rooms/board/RoomHandsBoard.types";
import { IN_GAME_HELPER_STEPS } from "./wordPokerTours";

type GameStage = "preflop" | "flop" | "turn" | "river" | "final" | "showdown";

export type InGameHelperTarget = "actions" | "community" | "builder";

export type InGameHelperContext = {
  step: number;
  signature: string;
  target: InGameHelperTarget;
};

type RoomInGameHelperSyncProps = {
  gameId: Id<"games">;
  gameStage: GameStage;
  isTutorialRoom: boolean;
  roomCode: string;
  bottomPlayerId?: string;
  hands: PlayerHand[];
  communityTiles: Tile[];
  roomGame: RoomGameContextValue;
};

function tileHasSpecialScoring(tile: Tile) {
  return tile.kind === "choice" || Boolean(tile.multiplier);
}

function isRevealed(tile: Tile) {
  return tile.revealed !== false;
}

export function deriveInGameHelperContext({
  gameStage,
  bottomPlayerId,
  hands,
  communityTiles,
  roomGame,
}: Omit<RoomInGameHelperSyncProps, "gameId" | "isTutorialRoom" | "roomCode">):
  | InGameHelperContext
  | null {
  if (roomGame.showReadyButton) {
    return {
      step: IN_GAME_HELPER_STEPS.ready,
      signature: "ready",
      target: "actions",
    };
  }

  if (gameStage === "showdown") {
    return {
      step: IN_GAME_HELPER_STEPS.showdown,
      signature: `showdown:${roomGame.isShowdownSubmissionOpen ? "open" : "closed"}`,
      target: "builder",
    };
  }

  if (roomGame.showBettingControls && roomGame.isMyTurn) {
    return {
      step: IN_GAME_HELPER_STEPS.betting,
      signature: `betting:${gameStage}:${roomGame.canCheck ? "check" : "priced"}`,
      target: "actions",
    };
  }

  const bottomHand = bottomPlayerId
    ? hands.find((hand) => hand.playerId === bottomPlayerId)
    : undefined;
  const visibleTiles = [
    ...(bottomHand?.tiles ?? []),
    ...communityTiles.filter(isRevealed),
  ];
  const hasSpecialTile = visibleTiles.some(tileHasSpecialScoring);

  if (gameStage !== "preflop" && hasSpecialTile) {
    return {
      step: IN_GAME_HELPER_STEPS.tileDetails,
      signature: `special:${gameStage}`,
      target: "builder",
    };
  }

  if (gameStage === "flop" || gameStage === "turn" || gameStage === "river") {
    const revealedCommunityCount = communityTiles.filter(isRevealed).length;
    return {
      step: IN_GAME_HELPER_STEPS.communityReveal,
      signature: `community:${gameStage}:${revealedCommunityCount}`,
      target: "community",
    };
  }

  if (gameStage === "final") {
    return {
      step: IN_GAME_HELPER_STEPS.wordBuilder,
      signature: "word-builder:final",
      target: "builder",
    };
  }

  if (roomGame.showBettingControls && !roomGame.isMyTurn) {
    return {
      step: IN_GAME_HELPER_STEPS.waiting,
      signature: `waiting:${gameStage}:${roomGame.turnClockTimeRemaining ? "clock" : "normal"}`,
      target: "actions",
    };
  }

  return null;
}
