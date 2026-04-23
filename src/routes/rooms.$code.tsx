import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import {
  RoomDevTools,
  RoomGameProvider,
  RoomHandsBoardV2,
  RoomPageProvider,
  useRoomDetailsController,
} from "@/components/rooms";
import { Spinner } from "@/components/ui/spinner";
import { api } from "../../convex/_generated/api";
import { ChatSidebar, ChatToggleButton } from "@/components/rooms/chat/ChatSidebar";
import { useChatSidebar } from "@/components/rooms/chat/useChatSidebar";
import { RoomTutorialPhaseSync } from "@/components/onboarding/RoomTutorialPhaseSync";
import { RoomTutorialLauncher } from "@/components/onboarding/RoomTutorialLauncher";
import { FIRST_BOT_GAME_TOUR } from "@/components/onboarding/wordPokerTours";

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

function StatusScreen({
  message,
  showSpinner = true,
  actionLabel,
  onAction,
}: {
  message: string;
  showSpinner?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 rounded-xl border border-slate-700 bg-slate-800/90 px-12 py-10 text-center shadow-2xl">
        {showSpinner ? <Spinner size="lg" className="text-slate-300" /> : null}
        <p className="text-xl font-semibold text-slate-200">{message}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-md bg-[#114D28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#176636]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RoomDetailsPage() {
  const navigate = useNavigate();
  const { code } = Route.useParams();
  const search = Route.useSearch();
  const [isDesktopChatVisible, setIsDesktopChatVisible] = useState(false);
  const [isRestartingTutorial, setIsRestartingTutorial] = useState(false);
  const restartTutorialRoom = useMutation((api as any).rooms.restartTutorialRoom);
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
  } = useRoomDetailsController(code);

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

  const chat = useChatSidebar(roomData?.room._id, isDesktopChatVisible);
  const forcedTutorialReplay =
    search.tutorial === "intro" || search.tutorial === "restart";
  const tutorialId = roomData?.room.tutorialId ?? null;
  const isTutorialRoom = tutorialId === FIRST_BOT_GAME_TOUR;

  if (isAuthPending) {
    return (
      <StatusScreen
        message={forcedTutorialReplay ? "Opening your guided table..." : "Loading..."}
      />
    );
  }

  if (!session?.user) {
    return <StatusScreen message="Redirecting to login..." />;
  }

  if (roomData === undefined) {
    return (
      <StatusScreen
        message={forcedTutorialReplay ? "Joining your first room..." : "Joining room..."}
      />
    );
  }

  if (roomData === null) {
    return (
      <StatusScreen
        message="Room not found."
        showSpinner={false}
        actionLabel="Go home"
        onAction={() => {
          void navigate({ to: "/" });
        }}
      />
    );
  }

  if (!game || displayHands.length === 0) {
    return (
      <StatusScreen
        message={forcedTutorialReplay ? "Dealing your first hand..." : "Preparing table..."}
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
            await restartTutorialRoom({ code });
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
      <RoomTutorialPhaseSync gameStage={game.stage} roomCode={code} />
      <div className="relative [@media(min-width:1441px)]:pr-[400px]">
        <RoomGameProvider value={roomGameContextValue}>
          <RoomHandsBoardV2
            gameId={game._id}
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

        {import.meta.env.DEV && !myPlayer && roomData ? (
          <RoomDevTools
            isDevRejoining={isDevRejoining}
            isDevFillingBots={isDevFillingBots}
            isRoomFull={roomData.members.length >= 3}
            onRejoin={() => {
              void onDevRejoinRoom();
            }}
            onFillBots={() => {
              void onDevFillRoomWithBots();
            }}
          />
        ) : null}

        {/* Chat toggle button */}
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
      </div>
    </RoomPageProvider>
  );
}
