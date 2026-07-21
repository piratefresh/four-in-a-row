import { mutation } from "../../_generated/server";
import {
  isTutorialRoom,
  isPlayerInactive,
  getActivePlayersInRoom,
  isDisconnectLeaseExpired,
} from "../helpers";
import {
  reapInactivePlayersAcrossOpenRooms,
  closeStaleScoreboardRooms,
  closeIdleLobbyRooms,
} from "../lifecycle";
import { leavePlayer } from "../players";
import { getRoomEconomyMode } from "../../gameConfig";
import { STALE_ROOM_THRESHOLD_MS } from "../../constants";

export const runCronCleanup = mutation({
  args: {},
  handler: async (ctx) => {
    const inactiveCleanup = await reapInactivePlayersAcrossOpenRooms(ctx);
    const idleLobbyCleanup = await closeIdleLobbyRooms(ctx);
    await closeStaleScoreboardRooms(ctx);

    const now = Date.now();
    const staleBefore = now - STALE_ROOM_THRESHOLD_MS;
    const openRooms = await ctx.db.query("rooms").withIndex("status_lastActiveAt", (q) => q.eq("status", "open")).collect();

    let closed = 0;
    for (const room of openRooms) {
      if (isTutorialRoom(room)) continue;

      const activePlayers = (await getActivePlayersInRoom(ctx, room._id)).filter((player) => !isPlayerInactive(player, now));

      if (activePlayers.length === 0 && room.lastActiveAt < staleBefore) {
        await ctx.db.patch(room._id, { status: "closed", hostPlayerId: undefined, lastActiveAt: now });
        closed += 1;
      }
    }

    return {
      inactivePlayersRemoved:
        inactiveCleanup.stalePlayersRemoved +
        idleLobbyCleanup.playersRemoved,
      roomsClosed:
        inactiveCleanup.roomsClosed +
        idleLobbyCleanup.closed +
        closed,
    };
  },
});

/**
 * Disconnect-lease sweep (table-stakes epic M1.6). Runs frequently (every
 * minute) to cash out and remove balance-table seats whose disconnect grace
 * period has elapsed. `leavePlayer` forfeits any live hand and credits the
 * uncommitted stack back to the wallet.
 *
 * Stale-job guard: eligibility is re-derived from the seat's current
 * `lastSeenAt` at execution time, so a seat that reconnected (heartbeated)
 * before this ran is no longer lease-expired and is skipped.
 */
export const sweepDisconnectedLeases = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const openRooms = await ctx.db
      .query("rooms")
      .withIndex("status_lastActiveAt", (q) => q.eq("status", "open"))
      .collect();

    let leasesExpired = 0;
    for (const room of openRooms) {
      if (getRoomEconomyMode(room) !== "balance") continue;
      if (isTutorialRoom(room)) continue;

      const players = await getActivePlayersInRoom(ctx, room._id);
      for (const player of players) {
        if (isDisconnectLeaseExpired(player, now)) {
          await leavePlayer(ctx, player);
          leasesExpired += 1;
        }
      }
    }

    return { leasesExpired };
  },
});
