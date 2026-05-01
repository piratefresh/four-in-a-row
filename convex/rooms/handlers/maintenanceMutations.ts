import { mutation } from "../../_generated/server";
import { isTutorialRoom, isPlayerInactive, getActivePlayersInRoom } from "../helpers";
import {
  reapInactivePlayersAcrossOpenRooms,
  closeStaleScoreboardRooms,
  closeIdleLobbyRooms,
} from "../lifecycle";
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
