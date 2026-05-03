import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  RoomGameProvider,
  RoomHandsBoardV2,
  RoomPageProvider,
  useRoomDetailsController,
} from "@/components/rooms";
import {
  LoadingOverlay,
  WORD_POKER_LOADING_TIPS,
} from "@/components/ui/loading-overlay";
import { api } from "../../convex/_generated/api";
import {
  ChatSidebar,
  ChatToggleButton,
} from "@/components/rooms/chat/ChatSidebar";
import { useChatSidebar } from "@/components/rooms/chat/useChatSidebar";
import { RoomTutorialPhaseSync } from "@/components/onboarding/RoomTutorialPhaseSync";
import { RoomTutorialLauncher } from "@/components/onboarding/RoomTutorialLauncher";
import { FIRST_BOT_GAME_TOUR } from "@/components/onboarding/wordPokerTours";
import {
  describeTutorialGuestIdForDebug,
  getTutorialGuestId,
  logTutorialDebug,
} from "@/lib/tutorial-guest";

type RoomSearch = {
  tutorial?: "intro" | "restart";
};

export const Route = createFileRoute("/rooms/$code")({
  validateSearch: (search: Record<string, unknown>): RoomSearch => ({
    tutorial:
      search.tutorial === "intro" || search.tutorial === "restart"
        ? search.tutorial
        : undefined,
  }),
  head: ({ params }) => {
    const roomCode = params.code.toUpperCase();
    const title = `Room ${roomCode} | Word Poker`;
    const description = `Join Room ${roomCode} in Word Poker and play a live word-building poker hand.`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: RoomDetailsPage,
});

function RoomDetailsPage() {
  const navigate = useNavigate();
  const { code } = Route.useParams();
  const search = Route.useSearch();
  const forcedTutorialReplay =
    search.tutorial === "intro" || search.tutorial === "restart";
  const [isDesktopChatVisible, setIsDesktopChatVisible] = useState(false);
  const [isRestartingTutorial, setIsRestartingTutorial] = useState(false);
  const [tutorialGuestAuthUserId] = useState(() => getTutorialGuestId());
  const restartTutorialRoom = useMutation(
    api.rooms.restartTutorialRoom,
  );
  const {
    session,
    isAuthPending,
    roomData,
    game,
    myPlayer,
    currentTurnPlayerId,
    displayHands,
    bottomPlayerId,
    getPlayerName,
    getPlayerAvatar,
    getPlayerPersonality,
    roomGameContextValue,
    roomPageContextValue,
    isDevRejoining,
    isDevFillingBots,
    onDevRejoinRoom,
    onDevFillRoomWithBots,
  } = useRoomDetailsController(code, {
    allowGuestTutorial: forcedTutorialReplay,
  });
  const preferences = useQuery(
    api.userPreferences.getMyPreferences,
    session?.user ? {} : "skip",
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1441px)");
    const syncDesktopChatVisibility = () => {
      setIsDesktopChatVisible(mediaQuery.matches);
    };

    syncDesktopChatVisibility();
    mediaQuery.addEventListener("change", syncDesktopChatVisibility);

    return () => {
      mediaQuery.removeEventListener("change", syncDesktopChatVisibility);
    };
  }, []);

  const tutorialId = roomData?.room.tutorialId ?? null;
  const isTutorialRoom = tutorialId === FIRST_BOT_GAME_TOUR;
  const chat = useChatSidebar(
    isTutorialRoom ? undefined : roomData?.room._id,
    isDesktopChatVisible,
  );
  const activePlayerId = myPlayer?._id ? String(myPlayer._id) : undefined;
  const activePlayerHand = activePlayerId
    ? displayHands.find((hand) => hand.playerId === activePlayerId)
    : undefined;
  const activePlayerHasFolded =
    activePlayerHand !== undefined &&
    "hasFolded" in activePlayerHand &&
    activePlayerHand.hasFolded;
  const helperTipsEnabled =
    !isTutorialRoom &&
    preferences?.showInGameHelper === true &&
    !activePlayerHasFolded;

  useEffect(() => {
    logTutorialDebug("room:state", {
      code,
      searchTutorial: search.tutorial ?? null,
      forcedTutorialReplay,
      hasSessionUser: Boolean(session?.user),
      isAuthPending,
      roomDataState:
        roomData === undefined
          ? "loading"
          : roomData === null
            ? "null"
            : "ready",
      roomTutorialId: roomData?.room.tutorialId ?? null,
      roomStatus: roomData?.room.status ?? null,
      myPlayerId: myPlayer?._id ?? null,
      gameStatus: game?.status ?? null,
      gameStage: game?.stage ?? null,
      guest: describeTutorialGuestIdForDebug(tutorialGuestAuthUserId),
    });
  }, [
    code,
    forcedTutorialReplay,
    game?.stage,
    game?.status,
    isAuthPending,
    myPlayer?._id,
    roomData,
    search.tutorial,
    session?.user,
    tutorialGuestAuthUserId,
  ]);

  if (isAuthPending) {
    return (
      <LoadingOverlay
        message={
          forcedTutorialReplay ? "Opening your guided table..." : "Loading..."
        }
        subtitles={WORD_POKER_LOADING_TIPS}
      />
    );
  }

  if (
    !session?.user &&
    !forcedTutorialReplay &&
    roomData !== undefined &&
    roomData?.room.tutorialId !== FIRST_BOT_GAME_TOUR
  ) {
    logTutorialDebug("room:render:login-overlay", {
      code,
      forcedTutorialReplay,
      roomDataState:
        roomData === undefined
          ? "loading"
          : roomData === null
            ? "null"
            : "ready",
      roomTutorialId: roomData?.room.tutorialId ?? null,
      searchTutorial: search.tutorial ?? null,
    });
    return <LoadingOverlay message="Redirecting to login..." />;
  }

  if (roomData === undefined) {
    return (
      <LoadingOverlay
        message={
          forcedTutorialReplay
            ? "Joining your first room..."
            : "Joining room..."
        }
        subtitles={WORD_POKER_LOADING_TIPS}
      />
    );
  }

  if (roomData === null) {
    return (
      <LoadingOverlay
        message="Room not found."
        spinning={false}
        actionLabel="Go home"
        onAction={() => {
          void navigate({ to: "/" });
        }}
      />
    );
  }

  if (roomData.room.status === "closed") {
    return (
      <LoadingOverlay
        message="This room has been closed."
        spinning={false}
        actionLabel="Go home"
        onAction={() => {
          void navigate({ to: "/" });
        }}
      />
    );
  }

  if (!game || displayHands.length === 0) {
    return (
      <LoadingOverlay
        message={
          forcedTutorialReplay
            ? "Dealing your first hand..."
            : "Preparing table..."
        }
        subtitles={WORD_POKER_LOADING_TIPS}
      />
    );
  }

  const replayTutorialButton = isTutorialRoom ? (
    <button
      type="button"
      onClick={() => {
        if (isRestartingTutorial) return;
        void (async () => {
          setIsRestartingTutorial(true);
          try {
            await restartTutorialRoom({
              code,
              guestAuthUserId: session?.user
                ? undefined
                : (tutorialGuestAuthUserId ?? undefined),
            });
            await navigate({
              to: "/rooms/$code",
              params: { code },
              search: { tutorial: "restart" },
            });
          } finally {
            setIsRestartingTutorial(false);
          }
        })();
      }}
      disabled={isRestartingTutorial}
      className="rounded-full border border-[#d7b45e]/30 bg-[#120f07]/90 px-4 py-2 text-sm font-medium text-[#f4d99d] shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur transition-colors hover:border-[#d7b45e]/55 hover:text-[#fff0cb]"
    >
      {isRestartingTutorial ? "Resetting tutorial..." : "Replay tutorial"}
    </button>
  ) : null;

  return (
    <RoomPageProvider value={roomPageContextValue}>
      <RoomTutorialLauncher
        tutorialName={tutorialId}
        roomCode={code}
        forceStart={forcedTutorialReplay}
      />
      <RoomTutorialPhaseSync
        gameStage={game.stage}
        roomCode={code}
        tutorialName={tutorialId}
        isTutorialBettingPaused={
          isTutorialRoom &&
          game.stage !== "showdown" &&
          game.stage !== "final" &&
          game.turnStartedAt === undefined
        }
      />
      <div
        className="relative [@media(min-width:1441px)]:pr-[400px]"
        data-testid="room-content"
      >
        <RoomGameProvider value={roomGameContextValue}>
          <RoomHandsBoardV2
            gameId={game._id}
            activePlayerId={activePlayerId}
            helperTipsEnabled={helperTipsEnabled}
            roomCode={code}
            currentTurnPlayerId={currentTurnPlayerId}
            gameStage={game.stage}
            communityTiles={game.communityTiles}
            hands={displayHands}
            bottomPlayerId={bottomPlayerId}
            pot={game.pot}
            dealerButtonIndex={game.dealerButtonIndex}
            smallBlindIndex={game.smallBlindIndex}
            bigBlindIndex={game.bigBlindIndex}
            getPlayerName={getPlayerName}
            getPlayerAvatar={getPlayerAvatar}
            getPlayerPersonality={getPlayerPersonality}
            chatDraft={chat.draftMessage}
            tutorialReplayControl={replayTutorialButton}
          />
        </RoomGameProvider>

        {/* Chat — hidden in tutorial rooms */}
        {!isTutorialRoom && (
          <>
            <div className="fixed bottom-6 right-6 z-30">
              <ChatToggleButton
                onClick={chat.toggleChat}
                unreadCount={chat.unreadCount}
              />
            </div>

            <ChatSidebar
              isOpen={chat.isOpen}
              onClose={chat.closeChat}
              messages={chat.messages}
              draftMessage={chat.draftMessage}
              onDraftMessageChange={chat.setDraftMessage}
              onSendMessage={chat.sendMessage}
            />
          </>
        )}
      </div>
    </RoomPageProvider>
  );
}
