import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import {
  normalizeRoomCode,
  getAuthenticatedUserId,
  getAuthenticatedOrGuestTutorialUserId,
  getAnyActiveAuthedPlayer,
  getActiveAuthedPlayerInRoom,
  isTutorialRoom,
} from "../helpers";
import { internalStartGameHandler } from "../../games/gamesSetup";
import { requireVerifiedUser } from "../../verifyUser";
import { getRoomEconomyMode } from "../../gameConfig";
import { rebuyTableSession } from "../../games/tableSession";
import { getWalletBalance } from "../../wallet/ledger";

export const heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "Authentication required." });
    }

    const player = await getAnyActiveAuthedPlayer(ctx, authUserId);
    if (!player) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You are not an active member of a room.",
      });
    }

    if (player.status === "left") {
      throw new ConvexError({ code: "PLAYER_LEFT", message: "Player already left the room." });
    }

    const now = Date.now();
    await ctx.db.patch(player._id, { lastSeenAt: now });

    return { ok: true, roomId: player.roomId, playerId: player._id, lastSeenAt: now };
  },
});

export const heartbeatByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = normalizeRoomCode(args.code);
    const authUserId = await getAuthenticatedUserId(ctx);
    if (!authUserId) {
      throw new ConvexError({ code: "UNAUTHORIZED", message: "Authentication required." });
    }

    const room = await ctx.db.query("rooms").withIndex("code", (q) => q.eq("code", code)).unique();
    if (!room) {
      throw new ConvexError({ code: "ROOM_NOT_FOUND", message: "Room does not exist." });
    }

    const player = await getActiveAuthedPlayerInRoom(ctx, room._id, authUserId);
    if (!player) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You are not an active member of this room.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(player._id, { lastSeenAt: now });

    return { ok: true, roomId: room._id, playerId: player._id, lastSeenAt: now };
  },
});

export const toggleReady = mutation({
  args: { code: v.string(), guestAuthUserId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const code = normalizeRoomCode(args.code);

    const room = await ctx.db.query("rooms").withIndex("code", (q) => q.eq("code", code)).unique();
    if (!room) {
      throw new ConvexError({ code: "ROOM_NOT_FOUND", message: "Room not found." });
    }

    const authUserId = isTutorialRoom(room)
      ? await getAuthenticatedOrGuestTutorialUserId(ctx, args.guestAuthUserId)
      : (await requireVerifiedUser(ctx)).authUserId;

    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication or a tutorial guest session is required.",
      });
    }

    const waitingGame = await ctx.db
      .query("games")
      .withIndex("by_room_status", (q) => q.eq("roomId", String(room._id)).eq("status", "waiting"))
      .unique();

    if (!waitingGame) {
      const activeGame = await ctx.db
        .query("games")
        .withIndex("by_room_status", (q) => q.eq("roomId", String(room._id)).eq("status", "active"))
        .unique();

      throw new ConvexError({
        code: activeGame ? "GAME_ALREADY_ACTIVE" : "NO_WAITING_GAME",
        message: activeGame ? "The next hand already started." : "There is no next hand waiting for ready checks.",
      });
    }

    const player = await ctx.db
      .query("players")
      .withIndex("roomId_status", (q) => q.eq("roomId", room._id).eq("status", "active"))
      .filter((q) => q.eq(q.field("authUserId"), authUserId))
      .unique();

    if (!player) {
      throw new ConvexError({ code: "PLAYER_NOT_FOUND", message: "You are not a member of this room." });
    }

    const isBalance = getRoomEconomyMode(room) === "balance";
    const newReadyStatus = !player.readyStatus;

    // A busted seat cannot ready up until it re-buys (table-stakes epic M1.4).
    if (newReadyStatus && isBalance && (player.tableStack ?? 0) === 0) {
      throw new ConvexError({
        code: "REBUY_REQUIRED",
        message: "You are out of chips. Re-buy to keep playing.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(player._id, { readyStatus: newReadyStatus });
    await ctx.db.patch(room._id, { lastActiveAt: now });

    const allPlayers = await ctx.db
      .query("players")
      .withIndex("roomId_status", (q) => q.eq("roomId", room._id).eq("status", "active"))
      .collect();

    // Busted seats sit out, so the ready gate only counts seats with chips.
    // Non-balance tables count every active seat as before.
    const readyGatePlayers = isBalance
      ? allPlayers.filter((p) => (p.tableStack ?? 0) > 0)
      : allPlayers;
    const allReady =
      readyGatePlayers.length >= 2 && readyGatePlayers.every((p) => p.readyStatus);

    if (allReady && newReadyStatus) {
      const game = await ctx.db
        .query("games")
        .withIndex("by_room_status", (q) => q.eq("roomId", String(room._id)).eq("status", "waiting"))
        .unique();

      if (game) {
        await internalStartGameHandler(ctx, { gameId: game._id });
      }
    }

    return { readyStatus: newReadyStatus };
  },
});

/**
 * Re-buy the fixed buy-in on a balance table (table-stakes epic M1.4). Only a
 * busted, actively-seated player, between hands, with a wallet that can cover
 * the full buy-in. The amount is always `room.buyIn` — never a client value.
 */
export const rebuy = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = normalizeRoomCode(args.code);

    const room = await ctx.db
      .query("rooms")
      .withIndex("code", (q) => q.eq("code", code))
      .unique();
    if (!room) {
      throw new ConvexError({ code: "ROOM_NOT_FOUND", message: "Room not found." });
    }

    if (getRoomEconomyMode(room) !== "balance" || !room.buyIn) {
      throw new ConvexError({
        code: "REBUY_NOT_SUPPORTED",
        message: "Re-buy is only available on balance tables.",
      });
    }
    const buyIn = room.buyIn;

    const authUserId = (await requireVerifiedUser(ctx)).authUserId;
    if (!authUserId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const player = await getActiveAuthedPlayerInRoom(ctx, room._id, authUserId);
    if (!player) {
      throw new ConvexError({
        code: "PLAYER_NOT_FOUND",
        message: "You are not a member of this room.",
      });
    }

    // Re-buy is only allowed between hands — never mid-hand.
    const activeGame = await ctx.db
      .query("games")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", String(room._id)).eq("status", "active"),
      )
      .unique();
    if (activeGame) {
      throw new ConvexError({
        code: "REBUY_DURING_HAND",
        message: "You can only re-buy between hands.",
      });
    }

    if ((player.tableStack ?? 0) !== 0) {
      throw new ConvexError({
        code: "REBUY_NOT_ALLOWED",
        message: "Re-buy is only available when you are out of chips.",
      });
    }

    const balance = await getWalletBalance(ctx, authUserId);
    if (balance === null || balance < buyIn) {
      throw new ConvexError({
        code: "INSUFFICIENT_FUNDS",
        message: `You need ${buyIn} coins to re-buy.`,
      });
    }

    const result = await rebuyTableSession(ctx, { player, authUserId, buyIn });
    await ctx.db.patch(room._id, { lastActiveAt: Date.now() });

    return {
      ok: true,
      tableStack: result.tableStack,
      rebuyCount: result.rebuyCount,
    };
  },
});
