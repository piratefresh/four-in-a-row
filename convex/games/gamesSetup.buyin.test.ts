/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import {
  getOrCreateWallet,
  getWalletBalance,
  findTransactionByOperationKey,
} from "../wallet/ledger";
import { DEV_BOT_AUTH_PREFIX } from "../games/gamesShared";
import { joinAuthenticatedUserToRoom } from "../rooms/players";

const HUMAN_USER = "human-user-1";
const BOT_USER = `${DEV_BOT_AUTH_PREFIX}bot:room:1`;

async function seedRoomAndGame(
  t: ReturnType<typeof convexTest>,
  economyMode?: "balance" | "nonBalance",
  buyIn?: number,
) {
  const { roomId } = await t.mutation(async (ctx) => {
    const { createOpenRoom } = await import("../rooms/lifecycle");
    return await createOpenRoom(ctx, {
      title: "Test room",
      economyMode,
      buyIn: economyMode === "balance" ? buyIn : undefined,
    });
  });

  // In the seat-lifecycle economy the buy-in is charged on join, seeding the
  // seat's table stack. These tests seed players directly, so mirror that so
  // balance hands have eligible, chipped seats to deal.
  const seatStackFields =
    economyMode === "balance" && buyIn
      ? { tableStack: buyIn, tableSessionVersion: 1, rebuyCount: 0 }
      : {};

  const playerId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("players", {
      roomId,
      authUserId: HUMAN_USER,
      name: "Human",
      seatIndex: 0,
      isHost: true,
      status: "active",
      readyStatus: true,
      lastSeenAt: Date.now(),
      ...seatStackFields,
    });
  });

  // Add a bot player
  const botPlayerId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("players", {
      roomId,
      authUserId: BOT_USER,
      name: "Bot",
      seatIndex: 1,
      isHost: false,
      status: "active",
      readyStatus: true,
      lastSeenAt: Date.now(),
      ...seatStackFields,
    });
  });

  const gameId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("games", {
      roomId: String(roomId),
      stage: "preflop",
      communityTiles: [],
      deck: [],
      pot: 0,
      currentBet: 0,
      currentPlayerIndex: 0,
      status: "waiting",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  return { roomId, playerId, botPlayerId, gameId };
}

describe("seat-lifecycle economy — hand start (table stakes M1)", () => {
  test("does not debit any wallet at hand start (buy-in happens on join)", async () => {
    const t = convexTest(schema);

    const { gameId } = await seedRoomAndGame(t, "balance", 500);

    // Wallet already spent its buy-in on join; the seat holds the chips.
    await t.mutation(async (ctx) => {
      return await getOrCreateWallet(ctx, HUMAN_USER);
    });

    const balanceBefore = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_USER);
    });
    expect(balanceBefore).toBe(1000); // starter grant

    const result = await t.mutation(async (ctx) => {
      const { internalStartGameHandler } = await import("../games/gamesSetup");
      return await internalStartGameHandler(ctx, { gameId });
    });

    expect(result.ok).toBe(true);

    const balanceAfter = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_USER);
    });
    expect(balanceAfter).toBe(1000); // unchanged — no buy-in at hand start

    // No buy-in transaction keyed to the game is written at start.
    const tx = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        `buy_in:${HUMAN_USER}:${gameId}`,
      );
    });
    expect(tx).toBeNull();
  });

  test("does not debit bot wallets on balance game start", async () => {
    const t = convexTest(schema);

    const { gameId } = await seedRoomAndGame(t, "balance", 500);

    await t.mutation(async (ctx) => {
      return await getOrCreateWallet(ctx, HUMAN_USER);
    });

    const result = await t.mutation(async (ctx) => {
      const { internalStartGameHandler } = await import("../games/gamesSetup");
      return await internalStartGameHandler(ctx, { gameId });
    });

    expect(result.ok).toBe(true);

    // Bot should have no buy_in transaction
    const botTx = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        `buy_in:${BOT_USER}:${gameId}`,
      );
    });
    expect(botTx).toBeNull();
  });

  test("non-balance game does not debit anyone", async () => {
    const t = convexTest(schema);

    const { gameId } = await seedRoomAndGame(t, "nonBalance");

    await t.mutation(async (ctx) => {
      return await getOrCreateWallet(ctx, HUMAN_USER);
    });

    const balanceBefore = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_USER);
    });

    const result = await t.mutation(async (ctx) => {
      const { internalStartGameHandler } = await import("../games/gamesSetup");
      return await internalStartGameHandler(ctx, { gameId });
    });

    expect(result.ok).toBe(true);

    const balanceAfter = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_USER);
    });
    expect(balanceAfter).toBe(balanceBefore);

    const tx = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        `buy_in:${HUMAN_USER}:${gameId}`,
      );
    });
    expect(tx).toBeNull();
  });

  test("sets startingChips to buyIn amount in balance games", async () => {
    const t = convexTest(schema);

    const { gameId } = await seedRoomAndGame(t, "balance", 2000);

    await t.mutation(async (ctx) => {
      return await getOrCreateWallet(ctx, HUMAN_USER);
    });

    await t.mutation(async (ctx) => {
      // Add enough funds for 2000 buy-in
      const { applyLedgerEntry } = await import("../wallet/ledger");
      return await applyLedgerEntry(ctx, {
        authUserId: HUMAN_USER,
        amount: 1000, // 1000 starter + 1000 deposit = 2000
        source: "playtest_deposit",
        operationKey: "test:seed:2000",
      });
    });

    const result = await t.mutation(async (ctx) => {
      const { internalStartGameHandler } = await import("../games/gamesSetup");
      return await internalStartGameHandler(ctx, { gameId });
    });

    expect(result.ok).toBe(true);

    // Check game config has correct startingChips
    const game = await t.query(async (ctx) => {
      return await ctx.db.get(gameId);
    });
    expect(game!.config?.startingChips).toBe(2000);
  });

  test("deals full stacks and starts betting with no forced bets", async () => {
    const t = convexTest(schema);
    const { gameId } = await seedRoomAndGame(t, "balance", 500);

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN_USER);
      const { internalStartGameHandler } = await import("../games/gamesSetup");
      await internalStartGameHandler(ctx, { gameId });
    });

    const state = await t.query(async (ctx) => {
      const game = await ctx.db.get(gameId);
      const hands = await ctx.db
        .query("playerHands")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .collect();
      return { game, hands };
    });

    expect(state.game).toMatchObject({
      pot: 0,
      currentBet: 0,
      dealerButtonIndex: 0,
      currentPlayerIndex: 1,
    });
    expect(state.game?.smallBlindIndex).toBeUndefined();
    expect(state.game?.bigBlindIndex).toBeUndefined();
    expect(state.hands).toHaveLength(2);
    for (const hand of state.hands) {
      expect(hand.chips).toBe(500);
      expect(hand.betThisRound).toBe(0);
      expect(hand.totalBet).toBe(0);
    }
  });

  test("non-balance games use default startingChips", async () => {
    const t = convexTest(schema);

    const { gameId } = await seedRoomAndGame(t, "nonBalance");

    const result = await t.mutation(async (ctx) => {
      const { internalStartGameHandler } = await import("../games/gamesSetup");
      return await internalStartGameHandler(ctx, { gameId });
    });

    expect(result.ok).toBe(true);

    const game = await t.query(async (ctx) => {
      return await ctx.db.get(gameId);
    });
    expect(game!.config?.startingChips).toBe(1000); // default
  });

  test("duplicate-safe: starting same game twice does not double-charge", async () => {
    const t = convexTest(schema);

    const { gameId } = await seedRoomAndGame(t, "balance", 500);

    // First start fails because game status changed
    // Actually, internalStartGameHandler checks game.status === "waiting",
    // so after a successful start, a second call returns { ok: false }
    // But we should test that duplicate charges don't happen during the
    // same mutation (e.g., if somehow debit is called twice)
    // The operation key handles this via findTransactionByOperationKey

    await t.mutation(async (ctx) => {
      return await getOrCreateWallet(ctx, HUMAN_USER);
    });

    // First start
    const r1 = await t.mutation(async (ctx) => {
      const { internalStartGameHandler } = await import("../games/gamesSetup");
      return await internalStartGameHandler(ctx, { gameId });
    });
    expect(r1.ok).toBe(true);

    // Second start — game is already active, should return ok: false
    const r2 = await t.mutation(async (ctx) => {
      const { internalStartGameHandler } = await import("../games/gamesSetup");
      return await internalStartGameHandler(ctx, { gameId });
    });
    expect(r2.ok).toBe(false);
    expect(r2.reason).toBe("Game not in waiting state");

    // The wallet is never debited at start, so repeated starts leave it
    // untouched (buy-in was charged once, on join).
    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_USER);
    });
    expect(balance).toBe(1000);
  });

  test("blocks start when player has an unsettled game via activeGameId", async () => {
    const t = convexTest(schema);

    const { roomId, gameId, playerId } = await seedRoomAndGame(t, "balance", 500);

    // Seed wallet
    await t.mutation(async (ctx) => {
      return await getOrCreateWallet(ctx, HUMAN_USER);
    });

    // Insert a user record and use its ID as the player's authUserId
    const userId = await t.mutation(async (ctx) => {
      const newUserId = await ctx.db.insert("user", {
        name: "Human Test",
        email: "human@test.com",
        emailVerified: true,
        activeGameId: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      // Patch the player to use the real user ID so normalizeId works
      await ctx.db.patch(playerId, { authUserId: newUserId });
      return newUserId;
    });

    // Set activeGameId to an unsettled game
    await t.mutation(async (ctx) => {
      const unsettledGameId = await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "preflop",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.patch(userId, { activeGameId: unsettledGameId });
      // Also seed wallet for the new user ID
      const { applyLedgerEntry } = await import("../wallet/ledger");
      await applyLedgerEntry(ctx, {
        authUserId: userId,
        amount: 2000,
        source: "playtest_deposit",
        operationKey: `test:seed:${userId}`,
      });
    });

    await expect(
      t.mutation(async (ctx) => {
        const { internalStartGameHandler } = await import("../games/gamesSetup");
        return await internalStartGameHandler(ctx, { gameId });
      }),
    ).rejects.toMatchObject({ data: { code: "UNSETTLED_GAME" } });
  });

  test("allows start when activeGameId references a completed game", async () => {
    const t = convexTest(schema);

    const { roomId, gameId, playerId } = await seedRoomAndGame(t, "balance", 500);

    // Seed wallet
    await t.mutation(async (ctx) => {
      return await getOrCreateWallet(ctx, HUMAN_USER);
    });

    // Insert a user record and use its ID as the player's authUserId
    const userId = await t.mutation(async (ctx) => {
      const newUserId = await ctx.db.insert("user", {
        name: "Human Test",
        email: "human@test.com",
        emailVerified: true,
        activeGameId: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.patch(playerId, { authUserId: newUserId });
      return newUserId;
    });

    // Set activeGameId to a completed game
    await t.mutation(async (ctx) => {
      const completedGameId = await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "showdown",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "completed",
        settlementState: "settled",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.patch(userId, { activeGameId: completedGameId });
      const { applyLedgerEntry } = await import("../wallet/ledger");
      await applyLedgerEntry(ctx, {
        authUserId: userId,
        amount: 2000,
        source: "playtest_deposit",
        operationKey: `test:seed:${userId}`,
      });
    });

    const result = await t.mutation(async (ctx) => {
      const { internalStartGameHandler } = await import("../games/gamesSetup");
      return await internalStartGameHandler(ctx, { gameId });
    });

    expect(result.ok).toBe(true);
  });
});

describe("seat-lifecycle economy — buy-in on join (table stakes M1)", () => {
  async function createBalanceRoom(
    t: ReturnType<typeof convexTest>,
    buyIn: number,
  ) {
    return await t.mutation(async (ctx) => {
      const { createOpenRoom } = await import("../rooms/lifecycle");
      const { roomId } = await createOpenRoom(ctx, {
        title: "Join test room",
        economyMode: "balance",
        buyIn,
      });
      return roomId;
    });
  }

  test("charges the buy-in once on join and seeds the seat stack", async () => {
    const t = convexTest(schema);
    const roomId = await createBalanceRoom(t, 500);

    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN_USER));

    const { playerId } = await t.mutation(async (ctx) => {
      const room = await ctx.db.get(roomId);
      return await joinAuthenticatedUserToRoom(ctx, room!, HUMAN_USER, "Human");
    });

    // Wallet debited exactly once.
    const balance = await t.query(async (ctx) => getWalletBalance(ctx, HUMAN_USER));
    expect(balance).toBe(500); // 1000 - 500 buy-in

    // Seat stack seeded to the buy-in; session opened at v1.
    const seat = await t.query(async (ctx) => ctx.db.get(playerId));
    expect(seat?.tableStack).toBe(500);
    expect(seat?.tableSessionVersion).toBe(1);
    expect(seat?.rebuyCount).toBe(0);

    // A buy-in transaction keyed to (player, session v1, rebuy 0) exists.
    const tx = await t.query(async (ctx) =>
      findTransactionByOperationKey(
        ctx,
        `buy_in:${HUMAN_USER}:${playerId}:v1:r0`,
      ),
    );
    expect(tx).not.toBeNull();
    expect(tx!.amount).toBe(-500);
  });

  test("reconnecting to the same active seat does not charge again", async () => {
    const t = convexTest(schema);
    const roomId = await createBalanceRoom(t, 500);

    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN_USER));

    await t.mutation(async (ctx) => {
      const room = await ctx.db.get(roomId);
      return await joinAuthenticatedUserToRoom(ctx, room!, HUMAN_USER, "Human");
    });
    // Second join to the same room = reconnect to the preserved active seat.
    await t.mutation(async (ctx) => {
      const room = await ctx.db.get(roomId);
      return await joinAuthenticatedUserToRoom(ctx, room!, HUMAN_USER, "Human");
    });

    const balance = await t.query(async (ctx) => getWalletBalance(ctx, HUMAN_USER));
    expect(balance).toBe(500); // charged once, not twice
  });

  test("rejects the join with INSUFFICIENT_FUNDS and seats nobody", async () => {
    const t = convexTest(schema);
    const roomId = await createBalanceRoom(t, 5000);

    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN_USER)); // 1000

    await expect(
      t.mutation(async (ctx) => {
        const room = await ctx.db.get(roomId);
        return await joinAuthenticatedUserToRoom(ctx, room!, HUMAN_USER, "Human");
      }),
    ).rejects.toMatchObject({ data: { code: "INSUFFICIENT_FUNDS" } });

    // The whole transaction rolled back: no seat, no debit.
    const balance = await t.query(async (ctx) => getWalletBalance(ctx, HUMAN_USER));
    expect(balance).toBe(1000);
    const seats = await t.query(async (ctx) =>
      ctx.db
        .query("players")
        .withIndex("roomId_status", (q) =>
          q.eq("roomId", roomId).eq("status", "active"),
        )
        .collect(),
    );
    expect(seats).toHaveLength(0);
  });

  test("non-balance join does not debit the wallet", async () => {
    const t = convexTest(schema);
    const roomId = await t.mutation(async (ctx) => {
      const { createOpenRoom } = await import("../rooms/lifecycle");
      const { roomId } = await createOpenRoom(ctx, {
        title: "Non-balance room",
        economyMode: "nonBalance",
      });
      return roomId;
    });

    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN_USER));

    const { playerId } = await t.mutation(async (ctx) => {
      const room = await ctx.db.get(roomId);
      return await joinAuthenticatedUserToRoom(ctx, room!, HUMAN_USER, "Human");
    });

    const balance = await t.query(async (ctx) => getWalletBalance(ctx, HUMAN_USER));
    expect(balance).toBe(1000); // unchanged

    const seat = await t.query(async (ctx) => ctx.db.get(playerId));
    expect(seat?.tableStack).toBeUndefined();
  });
});

describe("seat-tied dealer button rotation (table stakes M1)", () => {
  test("button advances by real seat when eligibility changes (bust)", async () => {
    // Regression for index-based rotation: dealer at seat 1 of [0,1,2]; seat 0
    // busts to [1,2]. Index rotation would give (1+1)%2 = 0 → seat 1 again.
    // Seat-tied rotation must advance clockwise past seat 1 → seat 2.
    const t = convexTest(schema);

    const roomId = await t.mutation(async (ctx) => {
      const { createOpenRoom } = await import("../rooms/lifecycle");
      const { roomId } = await createOpenRoom(ctx, {
        title: "Dealer rotation room",
        economyMode: "balance",
        buyIn: 500,
      });
      return roomId;
    });

    // Three seats, all chipped (buy-in already done on join).
    const seatIds = await t.mutation(async (ctx) => {
      const ids: string[] = [];
      for (let seatIndex = 0; seatIndex < 3; seatIndex++) {
        const id = await ctx.db.insert("players", {
          roomId,
          authUserId: `human-seat-${seatIndex}`,
          name: `Seat ${seatIndex}`,
          seatIndex,
          isHost: seatIndex === 0,
          status: "active",
          readyStatus: true,
          lastSeenAt: Date.now(),
          tableStack: 500,
          tableSessionVersion: 1,
          rebuyCount: 0,
        });
        ids.push(String(id));
      }
      return ids;
    });

    // A previous completed hand whose dealer button sat on seat 1.
    await t.mutation(async (ctx) => {
      await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "showdown",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        dealerButtonIndex: 1,
        dealerSeatIndex: 1,
        status: "completed",
        settlementState: "settled",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      // Seat 0 busts out — excluded from the next hand.
      await ctx.db.patch(ctx.db.normalizeId("players", seatIds[0]!)!, {
        tableStack: 0,
      });
    });

    const nextGameId = await t.mutation(async (ctx) => {
      return await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "preflop",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "waiting",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.mutation(async (ctx) => {
      const { internalStartGameHandler } = await import("../games/gamesSetup");
      return await internalStartGameHandler(ctx, { gameId: nextGameId });
    });
    expect(result.ok).toBe(true);

    // The participant sitting on the button must be seat 2, not seat 1.
    const dealerPlayerId = await t.query(async (ctx) => {
      const game = await ctx.db.get(nextGameId);
      const hands = await ctx.db
        .query("playerHands")
        .withIndex("by_game", (q) => q.eq("gameId", nextGameId))
        .collect();
      const ordered = [...hands].sort((a, b) =>
        a.createdAt !== b.createdAt
          ? a.createdAt - b.createdAt
          : a.playerId.localeCompare(b.playerId),
      );
      return ordered[game!.dealerButtonIndex ?? 0]?.playerId;
    });

    expect(dealerPlayerId).toBe(seatIds[2]);
  });

  test("rotation uses the persisted dealer seat, not a re-seated player", async () => {
    // Previous dealer was on seat 1. That player later left and rejoined into
    // seat 3. Rotation must advance clockwise from the HISTORICAL seat 1
    // (→ seat 2), independent of where the old dealer sits now. Reconstructing
    // the dealer from the mutable player record would wrongly rotate from
    // seat 3 and wrap to seat 0.
    const t = convexTest(schema);

    const roomId = await t.mutation(async (ctx) => {
      const { createOpenRoom } = await import("../rooms/lifecycle");
      const { roomId } = await createOpenRoom(ctx, {
        title: "Reseat rotation room",
        economyMode: "balance",
        buyIn: 500,
      });
      return roomId;
    });

    // Current occupied seats: 0, 2, and 3 (seat 1 now empty; the former
    // seat-1 dealer has rejoined into seat 3).
    const seatIndexById = new Map<number, string>();
    await t.mutation(async (ctx) => {
      for (const seatIndex of [0, 2, 3]) {
        const id = await ctx.db.insert("players", {
          roomId,
          authUserId: `human-seat-${seatIndex}`,
          name: `Seat ${seatIndex}`,
          seatIndex,
          isHost: seatIndex === 0,
          status: "active",
          readyStatus: true,
          lastSeenAt: Date.now(),
          tableStack: 500,
          tableSessionVersion: 1,
          rebuyCount: 0,
        });
        seatIndexById.set(seatIndex, String(id));
      }
    });

    // Previous completed hand recorded the dealer on seat 1.
    await t.mutation(async (ctx) => {
      await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "showdown",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        dealerButtonIndex: 0,
        dealerSeatIndex: 1,
        status: "completed",
        settlementState: "settled",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const nextGameId = await t.mutation(async (ctx) => {
      return await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "preflop",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "waiting",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.mutation(async (ctx) => {
      const { internalStartGameHandler } = await import("../games/gamesSetup");
      return await internalStartGameHandler(ctx, { gameId: nextGameId });
    });
    expect(result.ok).toBe(true);

    const game = await t.query(async (ctx) => ctx.db.get(nextGameId));
    // Clockwise from historical seat 1 → seat 2.
    expect(game!.dealerSeatIndex).toBe(2);
  });
});

describe("busted-seat start handling (table stakes M1.4)", () => {
  test("start throws REBUY_REQUIRED when occupied seats are out of chips", async () => {
    // Two occupied seats, but only one has chips — the other must re-buy. This
    // is distinct from NOT_ENOUGH_PLAYERS so the UI can prompt a re-buy.
    const t = convexTest(schema);

    const roomId = await t.mutation(async (ctx) => {
      const { createOpenRoom } = await import("../rooms/lifecycle");
      const { roomId } = await createOpenRoom(ctx, {
        title: "Busted seat room",
        economyMode: "balance",
        buyIn: 500,
      });
      return roomId;
    });

    await t.mutation(async (ctx) => {
      await ctx.db.insert("players", {
        roomId,
        authUserId: "human-a",
        name: "A",
        seatIndex: 0,
        isHost: true,
        status: "active",
        readyStatus: true,
        lastSeenAt: Date.now(),
        tableStack: 500, // chipped
        tableSessionVersion: 1,
        rebuyCount: 0,
      });
      await ctx.db.insert("players", {
        roomId,
        authUserId: "human-b",
        name: "B",
        seatIndex: 1,
        isHost: false,
        status: "active",
        readyStatus: false,
        lastSeenAt: Date.now(),
        tableStack: 0, // busted — must re-buy
        tableSessionVersion: 1,
        rebuyCount: 0,
      });
    });

    const gameId = await t.mutation(async (ctx) => {
      return await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "preflop",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "waiting",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await expect(
      t.mutation(async (ctx) => {
        const { internalStartGameHandler } = await import("../games/gamesSetup");
        return await internalStartGameHandler(ctx, { gameId });
      }),
    ).rejects.toMatchObject({ data: { code: "REBUY_REQUIRED" } });
  });
});
