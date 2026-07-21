import { createContext, useContext, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// RoomTableContext — phase / timer / ready / tutorial state
//
// Components that only need timer or phase info (e.g. RoomHeader) subscribe
// to this context and avoid re-rendering on betting-action changes.
// ---------------------------------------------------------------------------

export type RoomTableContextValue = {
  anteAmount: number;
  raisesThisRound: number;
  maxRaisesPerRound: number;
  showReadyButton: boolean;
  onReady?: () => void;
  isReady: boolean;
  isTogglingReady: boolean;
  lobbyInactivityTimeRemainingMs: number | null;
  readyCount: number;
  totalPlayers: number;
  allPlayersReady: boolean;
  turnClockTimeRemaining: number | null;
  turnClockTargetName: string | null;
  isTurnClockTarget: boolean;
  showdownTimeRemaining: number | null;
  turnTimeRemaining: number | null;
  isShowdownSubmissionOpen: boolean;
  isTutorialBettingPaused: boolean;
  isTutorialRoom: boolean;
  // Out-of-chips re-buy state (table-stakes epic M1.7). When a balance-table
  // seat is busted between hands it must re-buy or leave rather than ready up.
  isOutOfChips: boolean;
  buyIn: number | null;
  canAffordRebuy: boolean;
  isRebuying: boolean;
  onRebuy?: () => void;
};

const RoomTableContext = createContext<RoomTableContextValue | null>(null);

export function useRoomTableContext() {
  const ctx = useContext(RoomTableContext);
  if (!ctx) {
    throw new Error(
      "useRoomTableContext must be used inside RoomGameProvider.",
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// RoomBettingContext — betting actions and per-turn state
//
// Components that render action controls (check/call/raise/fold) subscribe
// to this context.  RoomHeader does NOT depend on it.
// ---------------------------------------------------------------------------

export type RoomBettingContextValue = {
  actionMessage: string | null;
  showBettingControls: boolean;
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
  // No live bet yet this round → the raise action is an opening "Bet"
  // (table-stakes epic M1.7, no forced blinds).
  isOpeningBet: boolean;
};

const RoomBettingContext = createContext<RoomBettingContextValue | null>(null);

export function useRoomBettingContext() {
  const ctx = useContext(RoomBettingContext);
  if (!ctx) {
    throw new Error(
      "useRoomBettingContext must be used inside RoomGameProvider.",
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Legacy combined type and provider
// ---------------------------------------------------------------------------

export type RoomGameContextValue = RoomTableContextValue &
  RoomBettingContextValue;

export function RoomGameProvider({
  table,
  betting,
  children,
}: {
  table: RoomTableContextValue;
  betting: RoomBettingContextValue;
  children: ReactNode;
}) {
  return (
    <RoomTableContext.Provider value={table}>
      <RoomBettingContext.Provider value={betting}>
        {children}
      </RoomBettingContext.Provider>
    </RoomTableContext.Provider>
  );
}

/**
 * Legacy hook returning the full combined context.
 * Prefer `useRoomTableContext` or `useRoomBettingContext` for granular
 * subscriptions to avoid unnecessary re-renders.
 */
export function useRoomGameContext(): RoomGameContextValue {
  const table = useRoomTableContext();
  const betting = useRoomBettingContext();
  return { ...table, ...betting };
}
