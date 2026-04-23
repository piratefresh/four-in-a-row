import type { ReactNode } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";

export type Tile =
  | {
      kind: "single";
      letter: string;
      baseValue: number;
      revealed?: boolean;
      multiplier?: "2L" | "3L";
    }
  | {
      kind: "choice";
      options: string[];
      baseValues: number[];
      revealed?: boolean;
      multiplier?: "2L" | "3L";
    };

export type PlayerHand = {
  _id: string;
  playerId: string;
  tiles: Tile[];
  bet?: number;
  chips?: number;
  betThisRound?: number;
  totalBet?: number;
  hasFolded?: boolean;
  hasActed?: boolean;
  lastAction?: "check" | "call" | "raise" | "fold";
};

export type RoomHandsBoardProps = {
  gameId: Id<"games">;
  roomCode?: string;
  currentTurnPlayerId?: string | null;
  gameStage: "preflop" | "flop" | "turn" | "river" | "final" | "showdown";
  communityTiles: Tile[];
  hands: PlayerHand[];
  bottomPlayerId?: string;
  getPlayerName: (playerId: string) => string;
  getPlayerAvatar: (playerId: string) => string | null;
  getPlayerPersonality: (playerId: string) => string | null;
  dealerButtonIndex?: number;
  smallBlindIndex?: number;
  bigBlindIndex?: number;
  pot?: number;
  chatDraft?: string;
  tutorialReplayControl?: ReactNode;
};

export type BuilderTile = {
  id: string;
  letter?: string;
  letters?: string[];
  baseValue?: number;
  baseValues?: number[];
  multiplier?: "2L" | "3L";
  source: "hand" | "community";
  disabled?: boolean;
  isChoice?: boolean;
  cardIndex?: number;
};
