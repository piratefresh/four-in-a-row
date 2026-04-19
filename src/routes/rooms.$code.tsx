import { createFileRoute } from "@tanstack/react-router";
import {
  RoomDevTools,
  RoomGameProvider,
  RoomHandsBoardV2,
  RoomPageProvider,
  useRoomDetailsController,
} from "@/components/rooms";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

export const Route = createFileRoute("/rooms/$code")({
  component: RoomDetailsPage,
});

function StatusScreen({ message }: { message: string }) {
  return (
    <div className="relative min-h-screen bg-[#252525]">
      <LoadingOverlay message={message} />
    </div>
  );
}

function RoomDetailsPage() {
  const { code } = Route.useParams();
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

  if (isAuthPending) {
    return <StatusScreen message="Loading..." />;
  }

  if (!session?.user) {
    return <StatusScreen message="Redirecting to login..." />;
  }

  // Show loading overlay while initial data is loading
  if (roomData === undefined) {
    return <StatusScreen message="Joining room..." />;
  }

  if (roomData === null) {
    return <StatusScreen message="Room not found." />;
  }

  if (!game || displayHands.length === 0) {
    return <StatusScreen message="Preparing table..." />;
  }

  return (
    <RoomPageProvider value={roomPageContextValue}>
      <>
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
      </>
    </RoomPageProvider>
  );
}
