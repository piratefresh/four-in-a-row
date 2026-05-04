import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { dismissRoomRejoin } from "@/lib/room-rejoin-dismissal";
import { ArrowLeft, ChevronDown, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "../../convex/_generated/api";

function getInitials(name: string | undefined) {
  const safe = name?.trim();
  if (!safe) return "U";
  return safe[0]?.toUpperCase() ?? "U";
}

export default function Header() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { data: session } = authClient.useSession();
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const displayName =
    session?.user?.name?.trim() || session?.user?.email || "User";
  const roomMatch = pathname.match(/^\/rooms\/([^/]+)$/);
  const resultsMatch = pathname.match(/^\/results\/([^/]+)$/);
  const roomCode = roomMatch?.[1]
    ? decodeURIComponent(roomMatch[1]).toUpperCase()
    : resultsMatch?.[1]
      ? decodeURIComponent(resultsMatch[1]).toUpperCase()
      : null;
  const leaveRoom = useMutation(api.rooms.leaveRoomByCode);
  const pendingNotifications = useQuery(api["friendships/notifications"].pendingNotificationCount);
  const roomData = useQuery(
    api.rooms.getRoomMembers,
    roomCode ? { code: roomCode } : "skip",
  );
  const game = useQuery(
    api.games.getGameByRoom,
    roomData?.room._id ? { roomId: roomData.room._id } : "skip",
  );
  const isRoomView = roomCode !== null;
  const isResultsView = resultsMatch !== null;
  const isOnlineRoomsView = pathname === "/rooms";
  const isTutorialRoom = roomData?.room.tutorialId === "first-bot-game";

  const eyebrow = isResultsView
    ? "PHASE 7 . RESULTS"
    : !game
      ? "JOINED ROOM"
      : game.status === "waiting"
        ? "PHASE 0 . ROOM SETUP"
        : game.stage === "preflop"
          ? "PHASE 1 . PRE-FLOP"
          : game.stage === "flop"
            ? "PHASE 2 . FLOP"
            : game.stage === "turn"
              ? "PHASE 3 . TURN"
              : game.stage === "river"
                ? "PHASE 4 . RIVER"
                : game.stage === "final"
                  ? "PHASE 5 . FINAL"
                  : "PHASE 6 . SHOWDOWN";

  const handleRoomBack = async () => {
    if (!roomCode || isLeavingRoom) return;

    setIsLeavingRoom(true);
    dismissRoomRejoin(roomCode);
    try {
      await leaveRoom({ code: roomCode });
    } catch {
      // Navigation back to the lobby should still work even if the room
      // membership has already been cleared elsewhere.
    } finally {
      await navigate({ to: "/" });
      setIsLeavingRoom(false);
    }
  };

  const handleHeaderBack = async () => {
    if (isRoomView || isResultsView) {
      await handleRoomBack();
      return;
    }

    if (isOnlineRoomsView) {
      await navigate({ to: "/" });
    }
  };

  return (
    <header
      className={`flex h-16 items-center justify-between px-4 text-white shadow-lg ${
        isRoomView || isResultsView || isOnlineRoomsView
          ? "border-b border-white/5 bg-felt-deep"
          : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {isRoomView || isResultsView || isOnlineRoomsView ? (
          <button
            type="button"
            onClick={() => {
              void handleHeaderBack();
            }}
            disabled={isLeavingRoom}
            aria-label={
              isOnlineRoomsView
                ? "Return to home menu"
                : "Leave room and return home"
            }
            className="grid h-8 w-8 flex-none place-items-center rounded-full bg-white/6 text-white transition-colors hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}

        <div className="min-w-0" id="tutorial-phase-title">
          <h1
            id="tutorial-phase-step"
            className={
              isRoomView || isResultsView || isOnlineRoomsView
                ? "truncate text-[10px] font-medium uppercase tracking-[0.22em] text-[#d4aa32]"
                : "font-serif text-xl font-semibold tracking-tight"
            }
          >
            {isRoomView || isResultsView ? (
              eyebrow
            ) : isOnlineRoomsView ? (
              "HOME . ONLINE ROOMS"
            ) : (
              <Link to="/">Word Poker</Link>
            )}
          </h1>
          <p
            className={
              isRoomView || isResultsView || isOnlineRoomsView
                ? "truncate text-[18px] font-medium leading-none text-white sm:text-[20px]"
                : "text-sm text-slate-100"
            }
          >
            {isRoomView || isResultsView ? `Room ${roomCode}` : null}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-white/5"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8 border border-white/15">
                    <AvatarImage
                      src={session.user.image ?? undefined}
                      alt={`${displayName} avatar`}
                    />
                    <AvatarFallback className="bg-neutral-200 text-xs font-semibold text-neutral-700">
                      {getInitials(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {pendingNotifications && (pendingNotifications.friendRequests + pendingNotifications.gameInvites) > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-felt-deep">
                      {pendingNotifications.friendRequests + pendingNotifications.gameInvites}
                    </span>
                  ) : null}
                </div>
                <div className="hidden items-center gap-1 sm:flex">
                  <p className="max-w-40 truncate text-sm sm:max-w-xs">
                    {displayName}
                  </p>
                  <ChevronDown className="h-4 w-4 text-white/60" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="max-w-48 truncate">
                {displayName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/friends" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Friends
                  {pendingNotifications && (pendingNotifications.friendRequests + pendingNotifications.gameInvites) > 0 ? (
                    <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {pendingNotifications.friendRequests + pendingNotifications.gameInvites}
                    </span>
                  ) : null}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  void authClient.signOut();
                }}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : isTutorialRoom ? (
          <span className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-medium text-white/70">
            Guest
          </span>
        ) : (
          <Link
            to="/login"
            className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/5"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
