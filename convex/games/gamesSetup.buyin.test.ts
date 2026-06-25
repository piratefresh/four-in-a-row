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

describe("balance game buy-in reservation", () => {
  test("debits human wallet on balance game start", async () => {
    const t = convexTest(schema);

    const { gameId } = await seedRoomAndGame(t, "balance", 500);

    // Seed wallet with enough funds
    await t.mutation(async (ctx) => {
      return await getOrCreateWallet(ctx, HUMAN_USER);
    });

    const balanceBefore = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_USER);
    });
    expect(balanceBefore).toBe(1000); // starter grant

    // Start the game
    const result = await t.mutation(async (ctx) => {
      const { internalStartGameHandler } = await import("../games/gamesSetup");
      return await internalStartGameHandler(ctx, { gameId });
    });

    expect(result.ok).toBe(true);

    const balanceAfter = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_USER);
    });
    expect(balanceAfter).toBe(500); // 1000 - 500 buy-in

    // Verify buy_in transaction exists
    const tx = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        `buy_in:${HUMAN_USER}:${gameId}`,
      );
    });
    expect(tx).not.toBeNull();
    expect(tx!.amount).toBe(-500);
    expect(tx!.source).toBe("buy_in");
    expect(tx!.balanceBefore).toBe(1000);
    expect(tx!.balanceAfter).toBe(500);
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

  test("fails with INSUFFICIENT_FUNDS when human lacks buy-in amount", async () => {
    const t = convexTest(schema);

    const { gameId } = await seedRoomAndGame(t, "balance", 5000);

    // Seed wallet with only starter grant (1000), not enough for 5000 buy-in
    await t.mutation(async (ctx) => {
      return await getOrCreateWallet(ctx, HUMAN_USER);
    });

    await expect(
      t.mutation(async (ctx) => {
        const { internalStartGameHandler } = await import("../games/gamesSetup");
        return await internalStartGameHandler(ctx, { gameId });
      }),
    ).rejects.toMatchObject({ data: { code: "INSUFFICIENT_FUNDS" } });

    // Balance should be unchanged (rolled back)
    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_USER);
    });
    expect(balance).toBe(1000);

    // No buy_in transaction should exist (rolled back)
    const tx = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        `buy_in:${HUMAN_USER}:${gameId}`,
      );
    });
    expect(tx).toBeNull();
  });

  test("fails with INSUFFICIENT_FUNDS when human has no wallet at all", async () => {
    const t = convexTest(schema);

    // Buy-in larger than starter grant so no wallet means insufficient funds
    const { gameId } = await seedRoomAndGame(t, "balance", 5000);

    await expect(
      t.mutation(async (ctx) => {
        const { internalStartGameHandler } = await import("../games/gamesSetup");
        return await internalStartGameHandler(ctx, { gameId });
      }),
    ).rejects.toMatchObject({ data: { code: "INSUFFICIENT_FUNDS" } });
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

    // Balance should only be deducted once
    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_USER);
    });
    expect(balance).toBe(500); // 1000 - 500, not 0
  });

  test("error message includes player names with insufficient funds", async () => {
    const t = convexTest(schema);

    const { roomId, gameId } = await seedRoomAndGame(t, "balance", 500);

    // Add a second human player
    await t.mutation(async (ctx) => {
      await ctx.db.insert("players", {
        roomId,
        authUserId: "human-user-2",
        name: "Alice",
        seatIndex: 2,
        isHost: false,
        status: "active",
        readyStatus: true,
        lastSeenAt: Date.now(),
      });
    });

    // Seed Human 1 with funds (auto 1000)
    await t.mutation(async (ctx) => {
      return await getOrCreateWallet(ctx, HUMAN_USER);
    });
    // Seed Alice with wallet then deplete to 100 (insufficient for 500)
    await t.mutation(async (ctx) => {
      const { debitWallet } = await import("../wallet/ledger");
      await getOrCreateWallet(ctx, "human-user-2");
      return await debitWallet(ctx, {
        authUserId: "human-user-2",
        amount: 900,
        source: "buy_in",
        operationKey: "test:deplete:alice",
      });
    });

    await expect(
      t.mutation(async (ctx) => {
        const { internalStartGameHandler } = await import("../games/gamesSetup");
        return await internalStartGameHandler(ctx, { gameId });
      }),
    ).rejects.toMatchObject({
      data: {
        code: "INSUFFICIENT_FUNDS",
        message: expect.stringContaining("Alice") as unknown,
      },
    });
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
