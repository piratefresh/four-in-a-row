import { RoomList } from "@/components/rooms/lobby/RoomList";
import { StatCard } from "@/components/rooms/lobby/StatCard";
import { Button } from "../ui/button";

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
  activePlayers: number;
  maxPlayers: number;
  lastActiveAt: number;
  createdAt: number;
};

type OnlineRoomsProps = {
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

export function OnlineRooms({
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
}: OnlineRoomsProps) {
  const canResumeActiveRoom = Boolean(activeRoomCode && !activeRoomTutorialId);

  return (
    <main className="min-h-screen bg-felt text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {canResumeActiveRoom ? (
            <button
              type="button"
              onClick={onResumeRoom}
              className="rounded-full border border-[#d7b45e]/30 bg-[#1a1509] px-4 py-2 text-sm font-medium text-[#f4d99d] transition-colors hover:border-[#d7b45e]/50 hover:text-[#fff0cb]"
            >
              Resume room {activeRoomCode}
            </button>
          ) : null}
        </div>

        <section className="">
          <Button
            type="button"
            onClick={onCreateRoom}
            disabled={isCreatingRoom}
            className="border-gold-bright bg-gold font-display font-bold text-black hover:bg-gold/70"
          >
            {isCreatingRoom ? "Creating..." : "Create new room"}
          </Button>
        </section>

        <div className="flex gap-2 overflow-x-auto">
          <StatCard title="Your chips" subtitle="$1000" />
          <StatCard
            title="Longest word"
            subtitle={stats?.longestWord || "Loading..."}
          />
          <StatCard
            title={`Most valuable (${stats?.highestWordScore || 0} pts)`}
            subtitle={stats?.highestScoringWord || "Loading..."}
          />
          <StatCard
            title="Biggest winner"
            subtitle={stats?.biggestWinner || "Loading..."}
          />
        </div>

        {joinMessage ? (
          <div className="rounded-2xl border border-cyan-500/15 bg-cyan-950/25 p-3 text-center text-sm text-cyan-200">
            {joinMessage}
          </div>
        ) : null}

        <div className="min-w-0 overflow-x-auto">
          <RoomList
            rooms={rooms}
            joiningRoomCode={joiningRoomCode}
            onOpenRoom={onOpenRoom}
          />
        </div>
      </div>
    </main>
  );
}
