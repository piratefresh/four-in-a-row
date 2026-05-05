export type RiverRunPhase = "deal" | "turn" | "river";
export type RiverRunStatus = "active" | "shop" | "failed" | "completed";
export type TileMultiplier = "2L" | "3L";

export type RiverRunViewTile = {
  index: number;
  revealed: boolean;
  flippedThisHand?: boolean;
  tile:
    | {
        kind: "single";
        letter: string;
        baseValue: number;
        multiplier?: TileMultiplier;
      }
    | {
        kind: "choice";
        options: string[];
        baseValues: number[];
        multiplier?: TileMultiplier;
      };
};

export type RiverRunSubmission = {
  phase: RiverRunPhase;
  word: string;
  score: number;
  valid: boolean;
  invalidReason?: string;
  tiles: Array<{
    index: number;
    letter: string;
    baseValue: number;
    multiplier?: TileMultiplier;
    wasChoice: boolean;
  }>;
  scoreBreakdown: {
    letterPoints: number;
    multiplierBonus: number;
    lengthBonus: number;
  };
  submittedAt: number;
};

export type RiverRunPlayRun = {
  roomCode: string;
  target: number;
  targetCurve: readonly number[];
  targetIndex: number;
  phase: RiverRunPhase;
  status: RiverRunStatus;
  terminalState: "failed" | "completed" | null;
  tiles: RiverRunViewTile[];
  revealedTiles: RiverRunViewTile[];
  credits: number;
  submissions: RiverRunSubmission[];
  handTotal: number;
  totalScore: number;
  canSubmit: boolean;
  canShop: boolean;
  updatedAt: number;
};

export type SelectedTile = {
  key: string;
  index: number;
  letter: string;
  baseValue: number;
  multiplier?: TileMultiplier;
  wasChoice: boolean;
};

export const RIVER_RUN_PHASES: RiverRunPhase[] = ["deal", "turn", "river"];
