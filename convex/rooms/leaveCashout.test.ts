/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import type { Id } from "../_generated/dataModel";
import { getOrCreateWallet, getWalletBalance } from "../wallet/ledger";
import { leavePlayer } from "./players";
import { DEV_BOT_AUTH_PREFIX } from "../games/gamesShared";

const HUMAN = "human-user-1";
const HUMAN_2 = "human-user-2";
const HUMAN_3 = "human-user-3";
const BOT = `${DEV_BOT_AUTH_PREFIX}bot:room:1`;

async function seedRoom(
  t: ReturnType<typeof convexTest>,
  economyMode: "balance" | "nonBalance" = "balance",
) {
  return await t.mutation(async (ctx) => {
    const { createOpenRoom } = await import("./lifecycle");
    const { roomId } = await createOpenRoom(ctx, {
      title: "Leave test room",
      economyMode,
      buyIn: economyMode === "balance" ? 500 : undefined,
    });
    return roomId;
  });
}

async function seedSeat(
  t: ReturnType<typeof convexTest>,
  roomId: Id<"rooms">,
  authUserId: string,
  seatIndex: number,
  fields: Record<string, unknown> = {},
) {
  return await t.mutation(async (ctx) => {
    return await ctx.db.insert("players", {
      roomId,
      authUserId,
      name: authUserId,
      seatIndex,
      isHost: seatIndex === 0,
      status: "active",
      readyStatus: false,
      lastSeenAt: Date.now(),
      ...fields,
    });
  });
}

async function getSeat(t: ReturnType<typeof convexTest>, id: Id<"players">) {
  return await t.query(async (ctx) => ctx.db.get(id));
}

async function leave(t: ReturnType<typeof convexTest>, playerId: Id<"players">) {
  return await t.mutation(async (ctx) => {
    const player = (await ctx.db.get(playerId))!;
    return await leavePlayer(ctx, player);
  });
}

describe("cash-out on leave (table stakes M1.5)", () => {
  test("manual leave with no active hand cashes out the uncommitted stack", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const p = await seedSeat(t, roomId, HUMAN, 0, {
      tableStack: 300,
      tableSessionVersion: 1,
    });
    await seedSeat(t, roomId, HUMAN_2, 1, { tableStack: 500, tableSessionVersion: 1 });
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN));

    const result = await leave(t, p);

    expect(result.cashedOut).toBe(300);
    expect(await t.query(async (ctx) => getWalletBalance(ctx, HUMAN))).toBe(1300);
    const seat = await getSeat(t, p);
    expect(seat?.status).toBe("left");
    expect(seat?.tableStack).toBe(0);
  });

  test("duplicate leave cashes out exactly once", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const p = await seedSeat(t, roomId, HUMAN, 0, {
      tableStack: 300,
      tableSessionVersion: 1,
    });
    await seedSeat(t, roomId, HUMAN_2, 1, { tableStack: 500, tableSessionVersion: 1 });
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN));

    await leave(t, p);
    const second = await leave(t, p);

    expect(second.wasAlreadyLeft).toBe(true);
    expect(await t.query(async (ctx) => getWalletBalance(ctx, HUMAN))).toBe(1300);
  });

  test("mid-hand leave forfeits the hand, leaves committed bets in the pot", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    // Three seats so the hand keeps going after one leaves.
    const leaver = await seedSeat(t, roomId, HUMAN, 0, {
      tableStack: 200,
      tableSessionVersion: 1,
    });
    await seedSeat(t, roomId, HUMAN_2, 1, { tableStack: 300, tableSessionVersion: 1 });
    await seedSeat(t, roomId, HUMAN_3, 2, { tableStack: 100, tableSessionVersion: 1 });
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN));

    const gameId = await t.mutation(async (ctx) => {
      return await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "flop",
        communityTiles: [],
        deck: [],
        pot: 900, // 300 + 200 + 400 committed
        currentBet: 400,
        currentPlayerIndex: 1, // seat 1's turn — leaver is NOT the current turn
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Insert the three hands (seat order).
    await t.mutation(async (ctx) => {
      const players = await ctx.db
        .query("players")
        .withIndex("roomId", (q) => q.eq("roomId", roomId))
        .collect();
      players.sort((a, b) => a.seatIndex - b.seatIndex);
      const chipsByStack = [200, 300, 100];
      const totalBets = [300, 200, 400];
      for (const [i, player] of players.entries()) {
        await ctx.db.insert("playerHands", {
          gameId: ctx.db.normalizeId("games", gameId)!,
          playerId: String(player._id),
          tiles: [],
          chips: chipsByStack[i]!,
          betThisRound: 0,
          totalBet: totalBets[i]!,
          hasActed: i !== 1, // seat 1 is up
          hasFolded: false,
          createdAt: Date.now() + i,
          updatedAt: Date.now() + i,
        });
      }
    });

    const result = await leave(t, leaver);

    // Only the uncommitted 200 is cashed out; the committed 300 stays in the pot.
    expect(result.cashedOut).toBe(200);
    expect(await t.query(async (ctx) => getWalletBalance(ctx, HUMAN))).toBe(1200);

    const state = await t.query(async (ctx) => {
      const game = await ctx.db.get(ctx.db.normalizeId("games", gameId)!);
      const hands = await ctx.db
        .query("playerHands")
        .withIndex("by_game", (q) =>
          q.eq("gameId", ctx.db.normalizeId("games", gameId)!),
        )
        .collect();
      return { game, hands };
    });

    // Game still active (two players remain), pot unchanged, leaver folded.
    expect(state.game?.status).toBe("active");
    expect(state.game?.pot).toBe(900);
    const leaverHand = state.hands.find((h) => h.playerId === String(leaver));
    expect(leaverHand?.hasFolded).toBe(true);
    expect(await getSeat(t, leaver).then((s) => s?.tableStack)).toBe(0);
  });

  test("mid-hand leave that leaves one player standing completes as a fold win", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const leaver = await seedSeat(t, roomId, HUMAN, 0, {
      tableStack: 200,
      tableSessionVersion: 1,
    });
    const winner = await seedSeat(t, roomId, HUMAN_2, 1, {
      tableStack: 400,
      tableSessionVersion: 1,
    });
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN));
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN_2));

    const gameId = await t.mutation(async (ctx) => {
      const gid = await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "flop",
        communityTiles: [],
        deck: [],
        pot: 400, // 300 (leaver) + 100 (winner)
        currentBet: 300,
        currentPlayerIndex: 1,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const seatPlayers = await ctx.db
        .query("players")
        .withIndex("roomId", (q) => q.eq("roomId", roomId))
        .collect();
      seatPlayers.sort((a, b) => a.seatIndex - b.seatIndex);
      const chips = [200, 400];
      const totalBets = [300, 100];
      for (const [i, player] of seatPlayers.entries()) {
        await ctx.db.insert("playerHands", {
          gameId: gid,
          playerId: String(player._id),
          tiles: [],
          chips: chips[i]!,
          betThisRound: 0,
          totalBet: totalBets[i]!,
          hasActed: true,
          hasFolded: false,
          createdAt: Date.now() + i,
          updatedAt: Date.now() + i,
        });
      }
      return gid;
    });

    const result = await leave(t, leaver);

    expect(result.cashedOut).toBe(200); // leaver's uncommitted chips

    const game = await t.query(async (ctx) =>
      ctx.db.get(ctx.db.normalizeId("games", gameId)!),
    );
    expect(game?.status).toBe("completed");
    // Winner receives the full 400 pot onto their stack: 400 + 400 = 800.
    expect(await getSeat(t, winner).then((s) => s?.tableStack)).toBe(800);
  });

  test("bot leave zeroes the stack and never touches a wallet", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    await seedSeat(t, roomId, HUMAN, 0, { tableStack: 500, tableSessionVersion: 1 });
    const bot = await seedSeat(t, roomId, BOT, 1, {
      tableStack: 400,
      tableSessionVersion: 1,
    });

    const result = await leave(t, bot);

    expect(result.cashedOut).toBe(0);
    expect(await t.query(async (ctx) => getWalletBalance(ctx, BOT))).toBeNull();
    expect(await getSeat(t, bot).then((s) => s?.tableStack)).toBe(0);
  });

  test("non-balance leave does not cash out", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t, "nonBalance");
    const p = await seedSeat(t, roomId, HUMAN, 0);
    await seedSeat(t, roomId, HUMAN_2, 1);
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN));

    const result = await leave(t, p);

    expect(result.cashedOut).toBe(0);
    expect(await t.query(async (ctx) => getWalletBalance(ctx, HUMAN))).toBe(1000);
  });
});
