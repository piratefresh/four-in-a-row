import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { ShowdownResultsPanel } from "../lobby/ShowdownResultsPanel";

type Member = {
  _id: string;
  name: string;
  isHost: boolean;
  readyStatus: boolean;
};

type RoomData = {
  room: {
    _id: string;
  };
  members: Member[];
};

type Game = {
  status: "waiting" | "active" | "completed";
  stage: "preflop" | "flop" | "turn" | "river" | "final" | "showdown";
};

type ShowdownResults = ComponentProps<
  typeof ShowdownResultsPanel
>["showdownResults"];

type RoomPageState = {
  code: string;
  roomData: RoomData | null | undefined;
  game: Game | null | undefined;
  playerHands: unknown[] | undefined;
  showdownResults: ShowdownResults | undefined;
  playerId: string | null;
  myPlayerReady: boolean;
  isLeavingRoom: boolean;
  leaveMessage: string | null;
  gameMessage: string | null;
  isTogglingReady: boolean;
  isBetting: boolean;
  isMyTurn: boolean;
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  callAmount: number;
  effectiveNextRaiseLevel: number | undefined;
  hasDevTools: boolean;
  isDevRejoining: boolean;
  isDevFillingBots: boolean;
};

type RoomPageActions = {
  leaveRoom: () => Promise<void>;
  back: () => Promise<void>;
  toggleReady: () => Promise<void>;
  check: () => Promise<void>;
  call: () => Promise<void>;
  raise: () => Promise<void>;
  fold: () => Promise<void>;
  devRejoinRoom?: () => Promise<void>;
  devFillRoomWithBots?: () => Promise<void>;
};

type RoomPageMeta = {
  getPlayerName: (playerId: string) => string;
  getPlayerPersonality: (playerId: string) => string | null;
};

type RoomPageContextValue = {
  state: RoomPageState;
  actions: RoomPageActions;
  meta: RoomPageMeta;
};

const RoomPageContext = createContext<RoomPageContextValue | null>(null);

export function RoomPageProvider({
  value,
  children,
}: {
  value: RoomPageContextValue;
  children: ReactNode;
}) {
  return <RoomPageContext.Provider value={value}>{children}</RoomPageContext.Provider>;
}

export function useRoomPageContext() {
  const context = useContext(RoomPageContext);
  if (!context) {
    throw new Error("useRoomPageContext must be used inside RoomPageProvider.");
  }
  return context;
}

export type { RoomPageContextValue, RoomPageState, RoomPageActions, RoomPageMeta };
