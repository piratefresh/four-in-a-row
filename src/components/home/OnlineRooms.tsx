import { RoomList } from "@/components/rooms/lobby/RoomList";
import { StatCard } from "@/components/rooms/lobby/StatCard";

type RoomListItem = {
  _id: string;
  code: string;
  activePlayers: number;
  maxPlayers: number;
  lastActiveAt: number;
};

type OnlineRoomsProps = {
  activeRoomCode?: string | null;
  joinMessage: string | null;
  joiningRoomCode: string | null;
  isRefreshingRooms: boolean;
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
  onRefreshRooms: () => void;
  onResumeRoom?: () => void;
};

export function OnlineRooms({
  activeRoomCode,
  joinMessage,
  joiningRoomCode,
  isRefreshingRooms,
  rooms,
  stats,
  onOpenRoom,
  onRefreshRooms,
  onResumeRoom,
}: OnlineRoomsProps) {
  return (
    <main className="min-h-screen bg-[#040505] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {activeRoomCode ? (
            <button
              type="button"
              onClick={onResumeRoom}
              className="rounded-full border border-[#d7b45e]/30 bg-[#1a1509] px-4 py-2 text-sm font-medium text-[#f4d99d] transition-colors hover:border-[#d7b45e]/50 hover:text-[#fff0cb]"
            >
              Resume room {activeRoomCode}
            </button>
          ) : null}
        </div>

        <section className="rounded-[2rem] border border-white/8 bg-[linear-gradient(160deg,rgba(17,22,17,0.98),rgba(5,6,5,0.96))] px-5 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.42)] sm:px-7">
          <p className="text-[11px] uppercase tracking-[0.34em] text-[#d2ae56]">
            Online Rooms
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h1 className="font-serif text-4xl tracking-tight text-[#fbf6ea] sm:text-5xl">
                Pick an open room.
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#c8c4b8] sm:text-base">
                Join a live table, grab an open seat, and play against whoever
                is already waiting.
              </p>
            </div>

            <button
              type="button"
              onClick={onRefreshRooms}
              disabled={isRefreshingRooms}
              className="rounded-full border border-[#d7b45e]/35 bg-[linear-gradient(180deg,#ffd861_0%,#b88a1b_100%)] px-5 py-3 text-sm font-semibold text-[#261701] shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshingRooms ? "Creating..." : "Create room code"}
            </button>
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto">
          <StatCard title="Your chips" subtitle="$1,500" />
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

        <section className="flex-1 rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(11,12,11,0.98),rgba(5,5,5,0.96))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.42)] sm:p-6">
          <RoomList
            rooms={rooms}
            joiningRoomCode={joiningRoomCode}
            onOpenRoom={onOpenRoom}
          />
        </section>
      </div>
    </main>
  );
}
