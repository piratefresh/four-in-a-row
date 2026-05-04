import { createContext, useContext, type ReactNode } from "react";

export interface TutorialAdapter {
  onReadyClick: () => void;
  onBettingAction: () => void;
  onMyTurn: () => void;
  onShuffleTiles: () => void;
  onWordBuilt: (builtWord: string) => void;
  isTutorialRoom: boolean;
  isTutorialBettingPaused: boolean;
  launcher: ReactNode;
  phaseSync: ReactNode;
  replayButton: ReactNode | null;
}

const noop = () => {};

const noopWord = (_word: string) => {};

export const NOOP_TUTORIAL_ADAPTER: TutorialAdapter = {
  onReadyClick: noop,
  onBettingAction: noop,
  onMyTurn: noop,
  onShuffleTiles: noop,
  onWordBuilt: noopWord,
  isTutorialRoom: false,
  isTutorialBettingPaused: false,
  launcher: null,
  phaseSync: null,
  replayButton: null,
};

const TutorialAdapterContext = createContext<TutorialAdapter>(
  NOOP_TUTORIAL_ADAPTER,
);

export function TutorialAdapterProvider({
  value,
  children,
}: {
  value: TutorialAdapter;
  children: ReactNode;
}) {
  return (
    <TutorialAdapterContext.Provider value={value}>
      {children}
    </TutorialAdapterContext.Provider>
  );
}

export function useTutorialAdapterContext() {
  return useContext(TutorialAdapterContext);
}
