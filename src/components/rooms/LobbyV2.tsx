import { Header } from "./lobbyv2/Header";
import { LiveFeed } from "./lobbyv2/LiveFeed";
import { RoomList } from "./lobbyv2/RoomList";
import { StatStrip } from "./lobbyv2/StatStrip";

type RoomListItem = {
  _id: string;
  code: string;
  title?: string | null;
  config?: {
    showdownTimer?: number;
    bettingStructure?: string;
    choiceTileFrequency?: string;
    bonusStructure?: string;
  };
  economyMode?: string | null;
  buyIn?: number | null;
  activePlayers: number;
  maxPlayers: number;
  lastActiveAt: number;
  createdAt: number;
  playerInitials?: string[];
  pot?: number;
};

type LobbyV2Props = {
  activeRoomCode?: string | null;
  activeRoomTutorialId?: string | null;
  joinMessage: string | null;
  joiningRoomCode: string | null;
  isCreatingRoom: boolean;
  rooms: RoomListItem[] | undefined;
  stats:
    | {
        longestWord?: string;
        highestWordScore?: number;
        highestScoringWord?: string;
        biggestWinner?: string;
      }
    | undefined;
  onOpenRoom: (roomCode: string) => void;
  onCreateRoom: () => void;
  onResumeRoom?: () => void;
};

export function LobbyV2({
  activeRoomCode,
  activeRoomTutorialId,
  joinMessage,
  joiningRoomCode,
  isCreatingRoom,
  rooms,
  stats,
  onOpenRoom,
  onCreateRoom,
  onResumeRoom,
}: LobbyV2Props) {
  const canResumeActiveRoom = Boolean(activeRoomCode && !activeRoomTutorialId);

  const enrichedRooms = rooms?.map((room) => ({
    ...room,
    pot: room.pot ?? 0,
    isHot: room.activePlayers >= 3,
    playerInitials: room.playerInitials ?? [],
  }));

  const statItems = [
    {
      label: "Your chips",
      value: "$1,000",
      isPersonal: true,
    },
    {
      label: "Longest word",
      value: stats?.longestWord || "-",
      subtitle: stats?.longestWord
        ? `${stats.longestWord.length} letters`
        : undefined,
    },
    {
      label: "Most valuable",
      value: stats?.highestScoringWord || "-",
      subtitle:
        stats?.highestScoringWord && stats?.highestWordScore != null
          ? `${stats.highestScoringWord} / ${stats.highestWordScore}pts`
          : undefined,
    },
    {
      label: "Biggest winner",
      value: stats?.biggestWinner || "-",
    },
  ];

  return (
    <main className="flex h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] min-h-0 flex-1 flex-col overflow-hidden bg-gradient-felt-table text-cream">
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1.5fr_1fr]">
        <div className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
          <Header onCreateRoom={onCreateRoom} isCreating={isCreatingRoom} />

          {canResumeActiveRoom ? (
            <div className="px-6 pb-3">
              <button
                type="button"
                onClick={onResumeRoom}
                className="w-full rounded-lg border border-gold/30 bg-gold/[0.06] px-4 py-2.5 font-mono text-sm font-medium text-gold transition-colors hover:border-gold/50 hover:bg-gold/[0.12]"
              >
                Resume room {activeRoomCode}
              </button>
            </div>
          ) : null}

          <StatStrip stats={statItems} />

          {joinMessage ? (
            <div className="mx-6 mb-3 rounded-lg border border-gold/15 bg-felt-deep/40 px-4 py-2 text-center font-mono text-xs text-cream/80">
              {joinMessage}
            </div>
          ) : null}

          <div className="mt-3 pb-8">
            <RoomList
              rooms={enrichedRooms}
              joiningRoomCode={joiningRoomCode}
              onOpenRoom={onOpenRoom}
            />
          </div>
        </div>

        <div className="hidden min-h-0 min-w-0 overflow-hidden lg:block lg:h-full lg:max-h-full">
          <LiveFeed />
        </div>
      </div>
    </main>
  );
}
