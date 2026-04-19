import { createContext, useContext, type ReactNode } from "react";

type RoomGameContextValue = {
  anteAmount: number;
  raisesThisRound: number;
  maxRaisesPerRound: number;
  actionMessage: string | null;
  showBettingControls: boolean;
  showReadyButton: boolean;
  onReady?: () => void;
  isReady: boolean;
  isTogglingReady: boolean;
  readyCount: number;
  totalPlayers: number;
  allPlayersReady: boolean;
  isBetting: boolean;
  isMyTurn: boolean;
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  canFold: boolean;
  currentTurnPlayerName: string | null;
  onCheck?: () => void;
  onCall?: () => void;
  onRaise?: () => void;
  onFold?: () => void;
  onRaiseAmountChange?: (amount: number) => void;
  onLeaveRoom?: () => void;
  callLabel: string;
  callAmount: number;
  raiseLabel: string;
  raiseAmount: number | null;
  raiseOptions: number[];
  showdownTimeRemaining: number | null;
};

const RoomGameContext = createContext<RoomGameContextValue | null>(null);

export function RoomGameProvider({
  value,
  children,
}: {
  value: RoomGameContextValue;
  children: ReactNode;
}) {
  return (
    <RoomGameContext.Provider value={value}>{children}</RoomGameContext.Provider>
  );
}

export function useRoomGameContext() {
  const context = useContext(RoomGameContext);
  if (!context) {
    throw new Error("useRoomGameContext must be used inside RoomGameProvider.");
  }
  return context;
}

export type { RoomGameContextValue };
