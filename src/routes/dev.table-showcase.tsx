import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DndContext } from "@dnd-kit/core";
import { RoomBottomPanel } from "@/components/rooms/board/RoomBottomPanel";
import { RoomCommunityStrip } from "@/components/rooms/board/RoomCommunityStrip";
import {
  RoomOpponentLayer,
  getOpponentPosition,
} from "@/components/rooms/board/RoomOpponentLayer";
import { RoomTable } from "@/components/rooms/board/RoomTable";
import type {
  BuilderTile,
  PlayerHand,
  RoomHandsBoardProps,
  Tile,
} from "@/components/rooms/board/RoomHandsBoard.types";
import { ROOM_BOTTOM_BADGE_POSITION_CLASS } from "@/components/rooms/board/roomBoardLayout";
import { RoomActionControls } from "@/components/rooms/controls/RoomActionControls";
import {
  RoomGameProvider,
  type RoomGameContextValue,
} from "@/components/rooms/context/RoomGameContext";
import { useMediaQuery } from "@/components/rooms/hooks/useMediaQuery";
import { PhasePlayerBadge } from "@/components/rooms/phases/PhasePlayerBadge";
import {
  WordTile,
  type WordTileSize,
} from "@/components/rooms/table/word-tile-v2";

export const Route = createFileRoute("/dev/table-showcase")({
  component: DevTableShowcaseRoute,
  ssr: false,
});

type ShowcaseScenario = "lobby" | "preflop" | "turn" | "showdown";

const SCENARIOS: Array<{ id: ShowcaseScenario; label: string }> = [
  { id: "lobby", label: "Lobby" },
  { id: "preflop", label: "Preflop" },
  { id: "turn", label: "Action" },
  { id: "showdown", label: "Showdown" },
];

const BET_POSITION_CLASS: Record<"top" | "left" | "right" | "bottom", string> =
  {
    top: "left-[59%] top-[34%] -translate-x-1/2 -translate-y-1/2 sm:left-[58%] sm:top-[32%]",
    left: "left-[34%] top-[50%] -translate-x-1/2 -translate-y-1/2 sm:left-[35%]",
    right:
      "left-[66%] top-[50%] -translate-x-1/2 -translate-y-1/2 sm:left-[65%]",
    bottom:
      "left-[58%] top-[64%] -translate-x-1/2 -translate-y-1/2 sm:left-[57%] sm:top-[63%]",
  };

const PLAYERS = {
  you: { name: "Magnus", avatarUrl: null, personality: null },
  alex: { name: "Alex", avatarUrl: null, personality: "bold" },
  nova: { name: "Nova", avatarUrl: null, personality: "tricky" },
  sam: { name: "Sam", avatarUrl: null, personality: "steady" },
} as const;

const COMMUNITY_TILES: Tile[] = [
  { kind: "single", letter: "R", baseValue: 1, revealed: true },
  {
    kind: "choice",
    options: ["A", "E"],
    baseValues: [1, 1],
    revealed: true,
    multiplier: "2L",
  },
  { kind: "single", letter: "T", baseValue: 1, revealed: true },
  { kind: "single", letter: "S", baseValue: 1, revealed: true },
  {
    kind: "single",
    letter: "Y",
    baseValue: 4,
    revealed: true,
    multiplier: "3L",
  },
];

const HANDS: PlayerHand[] = [
  {
    _id: "hand-you",
    playerId: "you",
    chips: 860,
    betThisRound: 50,
    lastAction: "call",
    tiles: [
      { kind: "single", letter: "C", baseValue: 3, revealed: true },
      { kind: "single", letter: "L", baseValue: 1, revealed: true },
    ],
  },
  {
    _id: "hand-alex",
    playerId: "alex",
    chips: 720,
    betThisRound: 100,
    lastAction: "raise",
    tiles: [
      { kind: "single", letter: "M", baseValue: 3, revealed: true },
      { kind: "single", letter: "O", baseValue: 1, revealed: true },
    ],
  },
  {
    _id: "hand-nova",
    playerId: "nova",
    chips: 930,
    betThisRound: 50,
    lastAction: "call",
    tiles: [
      { kind: "single", letter: "P", baseValue: 3, revealed: true },
      { kind: "single", letter: "I", baseValue: 1, revealed: true },
    ],
  },
  {
    _id: "hand-sam",
    playerId: "sam",
    chips: 640,
    betThisRound: 0,
    lastAction: "check",
    tiles: [
      { kind: "single", letter: "N", baseValue: 1, revealed: true },
      { kind: "single", letter: "D", baseValue: 2, revealed: true },
    ],
  },
];

const OPPONENTS = HANDS.slice(1);

const BUILDER_TILES: BuilderTile[] = [
  { id: "tile-c", letter: "C", baseValue: 3, source: "hand", cardIndex: 0 },
  { id: "tile-l", letter: "L", baseValue: 1, source: "hand", cardIndex: 1 },
  { id: "tile-r", letter: "R", baseValue: 1, source: "community" },
  {
    id: "tile-choice",
    letters: ["A", "E"],
    baseValues: [1, 1],
    multiplier: "2L",
    source: "community",
    isChoice: true,
  },
  { id: "tile-t", letter: "T", baseValue: 1, source: "community" },
  { id: "tile-s", letter: "S", baseValue: 1, source: "community" },
  {
    id: "tile-y",
    letter: "Y",
    baseValue: 4,
    multiplier: "3L",
    source: "community",
  },
];

const SHOWDOWN_SUBMISSIONS = [
  {
    playerId: "alex",
    word: "moat",
    score: 6,
    tiles: [
      { letter: "M", baseValue: 3 },
      { letter: "O", baseValue: 1 },
      { letter: "A", baseValue: 1 },
      { letter: "T", baseValue: 1 },
    ],
  },
  {
    playerId: "nova",
    word: "pairs",
    score: 7,
    tiles: [
      { letter: "P", baseValue: 3 },
      { letter: "A", baseValue: 1 },
      { letter: "I", baseValue: 1 },
      { letter: "R", baseValue: 1 },
      { letter: "S", baseValue: 1 },
    ],
  },
];

function formatPlayerActionLabel(
  lastAction?: "check" | "call" | "raise" | "fold",
) {
  return lastAction?.toUpperCase();
}

function getPlayerName(playerId: string) {
  return PLAYERS[playerId as keyof typeof PLAYERS]?.name ?? playerId;
}

function getPlayerAvatar(playerId: string) {
  return PLAYERS[playerId as keyof typeof PLAYERS]?.avatarUrl ?? null;
}

function getPlayerPersonality(playerId: string) {
  return PLAYERS[playerId as keyof typeof PLAYERS]?.personality ?? null;
}

function getBlindPosition(
  playerId: string,
): "dealer" | "small" | "big" | undefined {
  if (playerId === "alex") return "dealer";
  if (playerId === "nova") return "small";
  if (playerId === "you") return "big";
  return undefined;
}

function renderBuilderTile(tile: BuilderTile, tileSize: WordTileSize) {
  const selectedLetter = tile.isChoice ? "A" : undefined;

  return (
    <div className="flex flex-col items-center gap-1">
      {tile.multiplier ? (
        <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
          {tile.multiplier === "2L" ? "2x" : "3x"}
        </div>
      ) : (
        <div className="text-[9px] leading-none opacity-0 sm:text-xs">-</div>
      )}
      <WordTile
        letter={tile.letter}
        letters={tile.letters}
        baseValue={tile.baseValue}
        baseValues={tile.baseValues}
        multiplier={tile.multiplier}
        isChoice={tile.isChoice}
        selectedLetter={selectedLetter}
        showValue={true}
        size={tileSize}
        variant={tile.source === "community" ? "community" : "default"}
      />
    </div>
  );
}

function DevTableShowcaseRoute() {
  const [scenario, setScenario] = useState<ShowcaseScenario>("turn");
  const isMediumViewport = useMediaQuery("(min-width: 768px)");
  const tileSize: WordTileSize = isMediumViewport ? "md" : "xs";

  const bottomHand = HANDS[0]!;
  const opponents = OPPONENTS;
  const gameStage: RoomHandsBoardProps["gameStage"] =
    scenario === "showdown"
      ? "showdown"
      : scenario === "preflop"
        ? "preflop"
        : "turn";
  const isLobby = scenario === "lobby";
  const isPhase1 = scenario === "preflop";
  const isShowdown = scenario === "showdown";
  const currentTurnPlayerId = scenario === "turn" ? "you" : "alex";
  const communityTiles = isPhase1
    ? COMMUNITY_TILES.map((tile) => ({ ...tile, revealed: false }))
    : COMMUNITY_TILES;

  const opponentBets = useMemo(
    () =>
      opponents
        .map((hand, opponentIndex) => ({
          id: hand._id,
          amount: isLobby ? 0 : (hand.betThisRound ?? 0),
          position: getOpponentPosition(opponentIndex, opponents.length),
          ownerName: getPlayerName(hand.playerId),
        }))
        .filter((bet) => bet.amount > 0),
    [isLobby, opponents],
  );

  const contextValue: RoomGameContextValue = {
    anteAmount: 25,
    raisesThisRound: 1,
    maxRaisesPerRound: 4,
    actionMessage: null,
    showBettingControls: !isLobby,
    showReadyButton: isLobby,
    onReady: () => {},
    isReady: false,
    isTogglingReady: false,
    lobbyInactivityTimeRemainingMs: isLobby ? 4 * 60 * 1000 + 23 * 1000 : null,
    readyCount: 2,
    totalPlayers: 4,
    allPlayersReady: false,
    isBetting: false,
    isMyTurn: scenario === "turn",
    canCheck: false,
    canCall: true,
    canRaise: true,
    canFold: true,
    currentTurnPlayerName: getPlayerName(currentTurnPlayerId),
    onCheck: () => {},
    onCall: () => {},
    onRaise: () => {},
    onFold: () => {},
    onRaiseAmountChange: () => {},
    onLeaveRoom: () => {},
    callLabel: "Call",
    callAmount: 50,
    raiseLabel: "Raise",
    raiseAmount: 150,
    raiseOptions: [100, 150, 200, 300],
    turnClockTimeRemaining: scenario === "turn" ? 22_000 : null,
    turnClockTargetName: scenario === "turn" ? getPlayerName("you") : null,
    isTurnClockTarget: scenario === "turn",
    showdownTimeRemaining: isShowdown ? 44_000 : null,
    turnTimeRemaining: scenario === "turn" ? 22_000 : null,
    isShowdownSubmissionOpen: isShowdown,
    isTutorialBettingPaused: false,
    isTutorialRoom: false,
  };

  return (
    <RoomGameProvider value={contextValue}>
      <DndContext>
        <div className="relative flex h-[calc(100dvh-4rem)] flex-col overflow-y-auto overflow-x-hidden bg-gradient-felt-table font-serif text-[#f1eee7] md:overflow-hidden">
          <div className="absolute left-3 top-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-wrap gap-1 sm:left-4 sm:top-4 sm:gap-2">
            {SCENARIOS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScenario(item.id)}
                className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-[0_6px_18px_rgba(0,0,0,0.28)] transition sm:px-3 sm:text-xs ${
                  scenario === item.id
                    ? "border-[#f4d37a] bg-[#f4d37a] text-[#23160d]"
                    : "border-white/15 bg-black/45 text-[#f1eee7] hover:border-[#f4d37a]/70"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <main className="flex min-h-0 flex-1 flex-col pt-16 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pt-16">
            <RoomCommunityStrip
              tiles={communityTiles}
              hidden={isLobby || isPhase1}
              tileSize={tileSize}
            />

            <div className="relative flex min-h-[220px] flex-1 flex-col justify-center md:min-h-0">
              <div className="relative z-10 flex items-center justify-center px-2 xs:px-4">
                <div
                  id="tutorial-room-table"
                  className="relative flex items-center justify-center"
                >
                  <RoomTable
                    isPhase1={isPhase1}
                    pot={isLobby ? 0 : 425}
                    communityTiles={communityTiles}
                    opponentBets={opponentBets}
                    bottomBet={isLobby ? 0 : (bottomHand.betThisRound ?? 0)}
                    bottomBetOwnerName={getPlayerName(bottomHand.playerId)}
                    betPositionClass={BET_POSITION_CLASS}
                    showCenterPot={!isLobby}
                  />
                  <RoomOpponentLayer
                    opponents={opponents}
                    currentTurnPlayerId={currentTurnPlayerId}
                    getPlayerName={getPlayerName}
                    getPlayerAvatar={getPlayerAvatar}
                    getPlayerPersonality={getPlayerPersonality}
                    getBlindPosition={getBlindPosition}
                    otherSubmissions={SHOWDOWN_SUBMISSIONS}
                    wordSubmissions={{ isCompleted: isShowdown }}
                    gameStage={gameStage}
                    currentPlayerHasSubmitted={isShowdown}
                    canRevealSubmittedWords={isShowdown}
                  />
                  <div className={ROOM_BOTTOM_BADGE_POSITION_CLASS}>
                    <PhasePlayerBadge
                      name={getPlayerName(bottomHand.playerId)}
                      avatarUrl={getPlayerAvatar(bottomHand.playerId)}
                      chips={bottomHand.chips ?? 0}
                      actionLabel={formatPlayerActionLabel(bottomHand.lastAction)}
                      chatBubbleMessage={
                        scenario === "turn" ? "Thinking through the raise." : null
                      }
                      isActiveTurn={currentTurnPlayerId === bottomHand.playerId}
                      isCurrentPlayer
                      blindPosition={getBlindPosition(bottomHand.playerId)}
                      avatarSizeClass="h-[52px] w-[52px] xs:h-[60px] xs:w-[60px] sm:h-24 sm:w-24"
                      initialsClass="text-[11px] xs:text-[12px] sm:text-[18px]"
                      infoCardClassName="min-w-[84px] px-2 py-1 xs:min-w-[92px] xs:px-2 xs:py-1 sm:min-w-[132px] sm:px-4 sm:py-2"
                      betClassName="left-auto right-0 translate-x-1/4"
                      mobileInfoPlacement="top"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 px-4 sm:gap-4 [@media(max-height:460px)]:pb-[max(0.25rem,env(safe-area-inset-bottom))]">
              <RoomBottomPanel
                isPhase1={isPhase1 || isLobby}
                mySubmission={
                  isShowdown
                    ? {
                        word: "cleats",
                        score: 22,
                        tiles: [
                          { letter: "C", baseValue: 3 },
                          { letter: "L", baseValue: 1 },
                          { letter: "E", baseValue: 1, multiplier: "2L" },
                          { letter: "A", baseValue: 1 },
                          { letter: "T", baseValue: 1 },
                          { letter: "S", baseValue: 1 },
                        ],
                      }
                    : null
                }
                canRevealSubmittedWords={isShowdown}
                showReveal={isShowdown}
                builderTiles={BUILDER_TILES}
                choiceSelections={{ "tile-choice": "A" }}
                handleChoiceSelect={() => {}}
                isValidating={false}
                hasUnresolvedChoices={false}
                validationError={null}
                wordPreview="CLEATS"
                wordScorePreview={{
                  basePoints: 12,
                  multiplierBonus: 6,
                  fullRackBonus: 0,
                  total: 18,
                }}
                shuffleTick={0}
                gameStage={gameStage}
                isShowdownSubmissionOpen={isShowdown}
                handleSubmitWord={() => {}}
                onShuffleTiles={!isLobby ? () => {} : undefined}
                tileSize={tileSize}
                renderBuilderTile={(tile) => renderBuilderTile(tile, tileSize)}
              />

              {isLobby ? (
                <RoomActionControls
                  ready={{
                    readyCount: 2,
                    totalPlayers: 4,
                    allPlayersReady: false,
                    isReady: false,
                    isTogglingReady: false,
                    lobbyInactivityTimeRemainingMs:
                      contextValue.lobbyInactivityTimeRemainingMs,
                    onReady: () => {},
                  }}
                />
              ) : (
                <RoomActionControls
                  betting={{
                    isBetting: false,
                    isMyTurn: scenario === "turn",
                    canCheck: false,
                    canCall: true,
                    canRaise: true,
                    canFold: true,
                    currentTurnPlayerName: getPlayerName(currentTurnPlayerId),
                    onCheck: () => {},
                    onCall: () => {},
                    onRaise: () => {},
                    onFold: () => {},
                    callLabel: "Call",
                    callAmount: 50,
                    raiseLabel: "Raise",
                    raiseAmount: 150,
                    raiseOptions: [100, 150, 200, 300],
                  }}
                  utility={{ onShuffleTiles: () => {}, disableShuffle: false }}
                />
              )}
            </div>
          </main>
        </div>
      </DndContext>
    </RoomGameProvider>
  );
}
