import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface RoomDrawerProps {
  roomCode: string | null;
  onClose: () => void;
  onJoinSeat: (seatIndex: number) => void;
  isJoining: boolean;
}

export function RoomDrawer({
  roomCode,
  onClose,
  onJoinSeat,
  isJoining,
}: RoomDrawerProps) {
  const roomData = useQuery(
    api.rooms.getRoomMembers,
    roomCode ? { code: roomCode } : "skip",
  );

  const maxPlayers = roomData?.room.maxPlayers ?? 4;
  const members = roomData?.members ?? [];

  // Map members to seats
  const seats = Array.from({ length: maxPlayers }, (_, index) => {
    const member = members.find((m) => m.seatIndex === index);
    return {
      seatIndex: index,
      player: member || null,
    };
  });

  return (
    <Drawer open={!!roomCode} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-[#252525] border-slate-700">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center text-white">
            Poker game {roomCode}
          </DrawerTitle>
        </DrawerHeader>

        {/* Content */}
        <div className="px-6 pb-8 pt-6">
          {/* Poker Table */}
          <div className="relative mx-auto flex h-[261px] w-[177px] items-center justify-center">
            {/* Table surface */}
            <div className="absolute inset-0 rounded-[90px] border-[6px] border-[#1D1D1D] bg-[#114D28] shadow-[inset_0_0_30px_rgba(0,0,0,0.3)]" />

            {/* Seats positioned around the table */}
            {seats.map((seat, index) => (
              <Seat
                key={seat.seatIndex}
                seatIndex={seat.seatIndex}
                player={seat.player}
                position={getSeatPosition(index, maxPlayers)}
                onJoin={() => onJoinSeat(seat.seatIndex)}
                isJoining={isJoining}
              />
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

interface SeatProps {
  seatIndex: number;
  player: { name: string; _id: Id<"players"> } | null;
  position: { top?: string; bottom?: string; left?: string; right?: string };
  onJoin: () => void;
  isJoining: boolean;
}

function Seat({ seatIndex, player, position, onJoin, isJoining }: SeatProps) {
  const isEmpty = !player;

  return (
    <div className="absolute" style={position}>
      {isEmpty ? (
        <button
          onClick={onJoin}
          disabled={isJoining}
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-slate-600 text-white shadow-lg ring-2 ring-slate-500/50 transition-all hover:scale-110 hover:bg-green-600 hover:ring-green-400 active:bg-green-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:ring-0"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 shadow-lg">
          <div className="text-center">
            <div className="text-xs font-medium text-white">
              {player.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Position seats around the table
function getSeatPosition(
  index: number,
  totalSeats: number,
): { top?: string; bottom?: string; left?: string; right?: string } {
  if (totalSeats === 4) {
    const positions = [
      { top: "0%", left: "50%", transform: "translate(-50%, -50%)" }, // Top
      { top: "50%", right: "0%", transform: "translate(50%, -50%)" }, // Right
      { bottom: "0%", left: "50%", transform: "translate(-50%, 50%)" }, // Bottom
      { top: "50%", left: "0%", transform: "translate(-50%, -50%)" }, // Left
    ];
    return positions[index] || positions[0];
  }

  // For other seat counts, distribute evenly around the ellipse
  const angle = (index / totalSeats) * 2 * Math.PI - Math.PI / 2;
  const radiusX = 45; // Horizontal radius percentage
  const radiusY = 38; // Vertical radius percentage
  const x = 50 + radiusX * Math.cos(angle);
  const y = 50 + radiusY * Math.sin(angle);

  return {
    top: `${y}%`,
    left: `${x}%`,
    transform: "translate(-50%, -50%)",
  };
}
