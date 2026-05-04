import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { api } from "../../convex/_generated/api";

function getInitials(name: string | undefined) {
  const safe = name?.trim();
  if (!safe) return "?";
  return safe[0]?.toUpperCase() ?? "?";
}

function timeAgo(ts: number | null): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const pendingRequests = useQuery(api.friends.listPendingRequests);
  const friends = useQuery(api.friends.listFriends);
  const searchResults = useQuery(
    api.friends.searchUsers,
    debouncedQuery.length > 0 ? { query: debouncedQuery } : "skip",
  );

  const sendRequest = useMutation(api.friends.sendFriendRequest);
  const acceptRequest = useMutation(api.friends.acceptFriendRequest);
  const declineRequest = useMutation(api.friends.declineFriendRequest);
  const cancelRequest = useMutation(api.friends.cancelFriendRequest);
  const removeFriend = useMutation(api.friends.removeFriend);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isSearching = searchQuery.length > 0 && searchResults === undefined;

  const incoming = pendingRequests?.incoming ?? [];
  const outgoing = pendingRequests?.outgoing ?? [];

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white">Friends</h1>
          <p className="mt-1 text-sm text-slate-300">
            Search for players by name or email to add them as friends.
          </p>
        </div>

        {/* Search */}
        <section className="mb-8">
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-slate-600 bg-slate-800 text-white placeholder:text-slate-400 focus-visible:ring-amber-500"
          />
          <div className="mt-3 space-y-2">
            {isSearching ? (
              <p className="text-sm text-slate-400">Searching...</p>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-slate-600">
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback className="bg-slate-700 text-xs text-slate-300">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-white">{user.name}</span>
                  </div>
                  <div>
                    {user.relationshipStatus === "friend" ? (
                      <span className="text-xs text-emerald-400">Friends</span>
                    ) : user.relationshipStatus === "pending_sent" ? (
                      <span className="text-xs text-amber-400">Request Sent</span>
                    ) : user.relationshipStatus === "pending_received" && "pendingRequestId" in user ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          onClick={async () => {
                            await acceptRequest({ requestId: (user as any).pendingRequestId });
                            toast.success(`You are now friends with ${user.name}`);
                          }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="rounded-md bg-slate-600 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
                          onClick={async () => {
                            await declineRequest({ requestId: (user as any).pendingRequestId });
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                        onClick={async () => {
                          await sendRequest({ toUserId: user.userId });
                          toast.success(`Friend request sent to ${user.name}`);
                        }}
                      >
                        Send Request
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : searchResults && searchQuery.length > 0 ? (
              <p className="text-sm text-slate-400">No players found.</p>
            ) : null}
          </div>
        </section>

        {/* Pending Requests */}
        {(incoming.length > 0 || outgoing.length > 0) ? (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-white">Pending Requests</h2>
            <div className="space-y-2">
              {incoming.map((req) => (
                <div
                  key={String(req._id)}
                  className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-slate-600">
                      <AvatarImage src={req.image ?? undefined} />
                      <AvatarFallback className="bg-slate-700 text-xs text-slate-300">
                        {getInitials(req.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-sm font-medium text-white">{req.name}</span>
                      <span className="ml-2 text-xs text-amber-400">wants to be friends</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                      onClick={async () => {
                        await acceptRequest({ requestId: req._id });
                        toast.success(`You are now friends with ${req.name}`);
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-slate-600 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
                      onClick={async () => {
                        await declineRequest({ requestId: req._id });
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
              {outgoing.map((req) => (
                <div
                  key={String(req._id)}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-slate-600">
                      <AvatarImage src={req.image ?? undefined} />
                      <AvatarFallback className="bg-slate-700 text-xs text-slate-300">
                        {getInitials(req.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-sm font-medium text-white">{req.name}</span>
                      <span className="ml-2 text-xs text-slate-400">request sent</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-slate-600 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
                    onClick={async () => {
                      await cancelRequest({ requestId: req._id });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Friend List */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-white">
            Friends
            {friends !== undefined ? (
              <span className="ml-2 text-sm font-normal text-slate-400">({friends.length})</span>
            ) : null}
          </h2>
          {friends === undefined ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-slate-400">
              No friends yet. Search for players to add them.
            </p>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.userId}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-9 w-9 border border-slate-600">
                        <AvatarImage src={friend.image ?? undefined} />
                        <AvatarFallback className="bg-slate-700 text-xs text-slate-300">
                          {getInitials(friend.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${
                          friend.isOnline ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                      />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white">{friend.name}</span>
                      {friend.activeRoomCode ? (
                        <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                          In a room
                        </span>
                      ) : null}
                      <p className="text-xs text-slate-400">
                        {friend.isOnline ? "Online" : `Last seen ${timeAgo(friend.lastSeenAt)}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-slate-500 underline-offset-2 hover:text-rose-400 hover:underline"
                    onClick={async () => {
                      await removeFriend({ userId: friend.userId });
                      toast.success(`Removed ${friend.name} from friends`);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
