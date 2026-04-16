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
};

export type RoomHandsBoardProps = {
  gameId: Id<"games">;
  roomCode?: string;
  gameStage: "preflop" | "flop" | "turn" | "river" | "final" | "showdown";
  communityTiles: Tile[];
  hands: PlayerHand[];
  bottomPlayerId?: string;
  getPlayerName: (playerId: string) => string;
  getPlayerAvatar: (playerId: string) => string | null;
  pot?: number;
};

export type BuilderTile = {
  id: string;
  letter?: string;
  letters?: string[];
  baseValue?: number;
  baseValues?: number[];
  source: "hand" | "community";
  disabled?: boolean;
  isChoice?: boolean;
  cardIndex?: number;
};
