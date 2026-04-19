import {
  RoomCard,
  roomCardGridColumnsClassName,
} from "./RoomCard";

type RoomListItem = {
  _id: string;
  code: string;
  activePlayers: number;
  maxPlayers: number;
  lastActiveAt: number;
};

type RoomListProps = {
  rooms: RoomListItem[] | undefined;
  joiningRoomCode: string | null;
  onOpenRoom: (roomCode: string) => void;
};

export function RoomList({
  rooms,
  joiningRoomCode,
  onOpenRoom,
}: RoomListProps) {
  if (rooms === undefined) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        Loading rooms...
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No active games yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-transparent px-4">
        <div
          className={`grid ${roomCardGridColumnsClassName} gap-3 text-[11px] uppercase tracking-[0.22em] text-slate-500`}
        >
          <div>Room</div>
          <div>Status</div>
          <div className="text-right">Players</div>
          <div className="text-right">Next</div>
        </div>
      </div>

      <div className="space-y-2">
        {rooms.map((room) => {
          const isJoining = joiningRoomCode === room.code;
          const isFull = room.activePlayers >= room.maxPlayers;
          const disabled = isJoining || isFull;

          return (
            <RoomCard
              key={room._id}
              roomCode={room.code}
              activePlayers={room.activePlayers}
              maxPlayers={room.maxPlayers}
              lastActiveAt={room.lastActiveAt}
              isJoining={isJoining}
              onClick={() => onOpenRoom(room.code)}
              disabled={disabled}
            />
          );
        })}
      </div>
    </div>
  );
}
