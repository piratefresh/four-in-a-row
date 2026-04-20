import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { ANTE_AMOUNT } from "../../convex/gameState";
import { INITIAL_CHIPS } from "../../convex/games/gamesShared";
import { isRoomRejoinDismissed } from "@/lib/room-rejoin-dismissal";
import {
  PokerTable,
  formatStackLabel,
} from "@/components/rooms/table/PokerTable";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";

interface RoomDrawerProps {
  roomCode: string | null;
  onClose: () => void;
  onJoinSeat: () => void;
  isJoining: boolean;
  onDevRejoin?: () => void;
  isDevRejoining?: boolean;
  showDevTools?: boolean;
}

export function RoomDrawer({
  roomCode,
  onClose,
  onJoinSeat,
  isJoining,
  onDevRejoin,
  isDevRejoining = false,
  showDevTools = false,
}: RoomDrawerProps) {
  const roomData = useQuery(
    api.rooms.getRoomMembers,
    roomCode ? { code: roomCode } : "skip",
  );

  const maxPlayers = roomData?.room.maxPlayers ?? 4;
  const members = roomData?.members ?? [];
  const hasOpenSeat = members.length < maxPlayers;
  const shouldShowRejoinPreview = useMemo(() => {
    if (!roomCode || !roomData?.viewerSeatPreview) {
      return false;
    }

    return !isRoomRejoinDismissed(roomCode);
  }, [roomCode, roomData?.viewerSeatPreview]);
  const previewPlayers = [
    ...members.map((member) => ({
      seatIndex: member.seatIndex,
      name: member.name,
      meta: formatStackLabel(INITIAL_CHIPS),
    })),
    ...(shouldShowRejoinPreview && roomData?.viewerSeatPreview
      ? [
          {
            seatIndex: roomData.viewerSeatPreview.seatIndex,
            name: roomData.viewerSeatPreview.name,
            meta: "Rejoin",
          },
        ]
      : []),
  ];
  const joinButtonLabel = isJoining
    ? "Taking seat..."
    : hasOpenSeat
      ? `Take a seat • Ante $${ANTE_AMOUNT}`
      : "Room full";

  return (
    <Drawer open={!!roomCode} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="border-white/10 bg-[#050505] text-white">
        <DrawerHeader className="px-5 pb-0 pt-5 text-left">
          <DrawerTitle className="font-serif text-[2.25rem] tracking-tight text-white">
            Room {roomCode}
          </DrawerTitle>
          <DrawerDescription className="text-sm text-white/60">
            Ante ${ANTE_AMOUNT} • {maxPlayers} seats • Tap an open seat to join
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6">
          <PokerTable
            players={previewPlayers}
            maxPlayers={maxPlayers}
            onOpenSeatClick={() => onJoinSeat()}
            isJoining={isJoining || !hasOpenSeat}
          />

          <button
            type="button"
            onClick={onJoinSeat}
            disabled={isJoining || !hasOpenSeat}
            className="mt-6 w-full rounded-2xl border border-[#f3d260]/45 bg-[linear-gradient(180deg,#ffd54d_0%,#b68c19_100%)] px-5 py-4 text-center text-lg font-semibold text-[#1f1402] shadow-[0_10px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {joinButtonLabel}
          </button>

          {showDevTools ? (
            <div className="mx-auto mt-6 flex max-w-[320px] flex-col gap-3">
              <button
                type="button"
                onClick={() => onDevRejoin?.()}
                disabled={isDevRejoining}
                className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-600"
              >
                {isDevRejoining ? "Rejoining..." : "Rejoin room"}
              </button>
              <p className="text-center text-xs text-slate-400">
                Development tool for reclaiming your seat quickly.
              </p>
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
