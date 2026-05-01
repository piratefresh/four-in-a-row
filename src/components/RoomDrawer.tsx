import { useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { ANTE_AMOUNT } from "../../convex/gameState";
import { INITIAL_CHIPS } from "../../convex/games/gamesShared";
import { MATCH_JOIN_TIMEOUT_MS } from "../../convex/constants";
import { isRoomRejoinDismissed } from "@/lib/room-rejoin-dismissal";
import {
  PokerTable,
  formatStackLabel,
} from "@/components/rooms/table/PokerTable";
import { CountdownTimer } from "@/components/ui/countdown-timer";
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
  const [now, setNow] = useState(() => Date.now());
  const [joinPromptStartedAt, setJoinPromptStartedAt] = useState<number | null>(
    null,
  );

  const wasDrawerOpenRef = useRef(false);
  useEffect(() => {
    if (!roomCode) {
      wasDrawerOpenRef.current = false;
      return;
    }

    if (roomData === undefined) return;

    const isRoomAvailable =
      roomData !== null && roomData.room.status === "open";

    if (wasDrawerOpenRef.current && !isRoomAvailable) {
      toast.warning(`Room ${roomCode} is no longer available`, {
        description: "This room was closed due to inactivity.",
        duration: 4000,
      });
      onClose();
    }

    wasDrawerOpenRef.current = true;
  }, [roomCode, roomData, onClose]);

  useEffect(() => {
    if (!roomCode) {
      setJoinPromptStartedAt(null);
      return;
    }

    const startedAt = Date.now();
    setNow(startedAt);
    setJoinPromptStartedAt(startedAt);
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [roomCode]);

  const maxPlayers = roomData?.room.maxPlayers ?? 4;
  const title = roomData?.room.title || `Room ${roomCode}`;
  const configSummary = formatRoomConfig(roomData?.room.config);
  const members = roomData?.members ?? [];
  const hasOpenSeat = members.length < maxPlayers;
  const matchJoinTimeRemainingMs =
    roomCode && joinPromptStartedAt !== null
      ? Math.max(0, joinPromptStartedAt + MATCH_JOIN_TIMEOUT_MS - now)
      : null;

  useEffect(() => {
    if (!roomCode || matchJoinTimeRemainingMs !== 0) return;

    toast.warning("Join window expired", {
      description: "Choose a room from the lobby when you're ready.",
      duration: 4000,
    });
    onClose();
  }, [matchJoinTimeRemainingMs, onClose, roomCode]);
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
  const shouldShowDevRejoin =
    showDevTools &&
    Boolean(roomData?.viewerSeatPreview) &&
    Boolean(onDevRejoin);
  const joinButtonLabel = isJoining
    ? "Taking seat..."
    : hasOpenSeat
      ? `Join Now - Ante $${ANTE_AMOUNT}`
      : "Room full";

  return (
    <Drawer open={!!roomCode} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="border-white/10 bg-felt text-white">
        <DrawerHeader className="px-5 pb-0 pt-5 text-center sm:text-center">
          <DrawerTitle className="text-center font-serif text-[2.25rem] tracking-tight text-white sm:text-center">
            {title}
          </DrawerTitle>
          <DrawerDescription className="text-center text-sm text-white/60 sm:text-center">
            {configSummary} - {maxPlayers} seats - Tap an open seat to join
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6">
          <PokerTable
            players={previewPlayers}
            maxPlayers={maxPlayers}
            onOpenSeatClick={() => onJoinSeat()}
            isJoining={isJoining || !hasOpenSeat || matchJoinTimeRemainingMs === 0}
            className="!h-[296px] !max-w-[216px] xs:!h-[320px] xs:!max-w-[236px] sm:!h-[460px] sm:!max-w-[340px]"
          />

          {matchJoinTimeRemainingMs !== null ? (
            <div className="mt-4 flex justify-center">
              <CountdownTimer
                label="Join window"
                timeRemainingMs={matchJoinTimeRemainingMs}
              />
            </div>
          ) : null}

          <button
            type="button"
            onClick={onJoinSeat}
            disabled={isJoining || !hasOpenSeat || matchJoinTimeRemainingMs === 0}
            className="mx-auto mt-5 block w-full max-w-[272px] rounded-xl border border-[#f3d260]/45 bg-[linear-gradient(180deg,#ffd54d_0%,#b68c19_100%)] px-4 py-3 text-center text-base font-semibold text-[#1f1402] shadow-[0_10px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6 sm:max-w-[320px] sm:rounded-2xl sm:px-5 sm:py-4 sm:text-lg"
          >
            {joinButtonLabel}
          </button>

          {shouldShowDevRejoin ? (
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

function formatRoomConfig(config?: {
  showdownTimer?: number;
  bettingStructure?: string;
  choiceTileFrequency?: string;
  bonusStructure?: string;
}) {
  const seconds = Math.round((config?.showdownTimer ?? 30_000) / 1000);
  const betting =
    config?.bettingStructure === "potLimit"
      ? "Pot Limit"
      : config?.bettingStructure === "fixedLimit"
        ? "Fixed Limit"
        : "No Limit";
  const tiles =
    config?.choiceTileFrequency === "high"
      ? "2-3 two-letter tiles"
      : "0-1 two-letter tiles";
  return `${seconds}s rounds - ${betting} - ${tiles}`;
}
