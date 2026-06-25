/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import {
  getOrCreateWallet,
  getWalletBalance,
  findTransactionByOperationKey,
} from "../wallet/ledger";
import {
  buildOperationKey,
  OPERATION_NAMESPACES,
} from "../wallet/ledger";
import { DEV_BOT_AUTH_PREFIX } from "./gamesShared";

const HUMAN_1 = "human-user-1";
const HUMAN_2 = "human-user-2";
const BOT_USER = `${DEV_BOT_AUTH_PREFIX}bot:room:1`;

async function seedBalanceRoomWithGame(
  t: ReturnType<typeof convexTest>,
  players: Array<{
    authUserId: string;
    name: string;
    isBot?: boolean;
  }>,
  buyIn = 500,
) {
  const { roomId } = await t.mutation(async (ctx) => {
    const { createOpenRoom } = await import("../rooms/lifecycle");
    return await createOpenRoom(ctx, {
      title: "Lifecycle test room",
      economyMode: "balance",
      buyIn,
    });
  });

  const playerIds: string[] = [];
  const userIds: string[] = [];
  for (const [index, player] of players.entries()) {
    // For human players, create a real user record so that
    // `activeGameId` can be set/cleared via normalizeId. Bots don't need one.
    let authUserId = player.authUserId;
    if (!player.isBot) {
      const userId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("user", {
          name: player.name,
          email: `${player.authUserId}@test.com`,
          emailVerified: true,
          activeGameId: undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });
      authUserId = String(userId);
      userIds.push(String(userId));
    }

    const playerId = await t.mutation(async (ctx) => {
      return await ctx.db.insert("players", {
        roomId,
        authUserId,
        name: player.name,
        seatIndex: index,
        isHost: index === 0,
        status: "active",
        readyStatus: true,
        lastSeenAt: Date.now(),
      });
    });
    playerIds.push(String(playerId));
  }

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

  return { roomId, gameId, playerIds, userIds };
}

async function seedWallet(
  t: ReturnType<typeof convexTest>,
  authUserId: string,
  balance: number,
) {
  const wallet = await t.mutation(async (ctx) => {
    return await getOrCreateWallet(ctx, authUserId);
  });
  const target = balance - wallet.balance;
  if (target > 0) {
    await t.mutation(async (ctx) => {
      const { applyLedgerEntry } = await import("../wallet/ledger");
      return await applyLedgerEntry(ctx, {
        authUserId,
        amount: target,
        source: "playtest_deposit",
        operationKey: `test:seed:${authUserId}:${Date.now()}:dep`,
      });
    });
  } else if (target < 0) {
    await t.mutation(async (ctx) => {
      const { debitWallet } = await import("../wallet/ledger");
      return await debitWallet(ctx, {
        authUserId,
        amount: -target,
        source: "buy_in",
        operationKey: `test:seed:${authUserId}:${Date.now()}:deb`,
      });
    });
  }
}

async function getUserActiveGameId(
  t: ReturnType<typeof convexTest>,
  authUserId: string,
): Promise<string | null | undefined> {
  return await t.query(async (ctx) => {
    const normalized = ctx.db.normalizeId("user", authUserId);
    if (!normalized) return null;
    const user = await ctx.db.get(normalized);
    return user?.activeGameId;
  });
}

describe("game lifecycle integration (STO-233)", () => {
  test("redeal creates a waiting game without setting activeGameId", async () => {
    const t = convexTest(schema);

    const { roomId, gameId, playerIds, userIds } = await seedBalanceRoomWithGame(t, [
      { authUserId: HUMAN_1, name: "Human 1" },
      { authUserId: BOT_USER, name: "Bot", isBot: true },
    ]);

    await seedWallet(t, userIds[0]!, 1000);

    // Start + complete + settle the first game so a redeal is possible.
    const { internalStartGameHandler, internalRedealGameForRoomHandler } =
      await import("./gamesSetup");
    await t.mutation(async (ctx) => {
      return await internalStartGameHandler(ctx, { gameId });
    });

    // Verify activeGameId was set after start.
    const activeIdDuringGame = await getUserActiveGameId(t, userIds[0]!);
    expect(activeIdDuringGame).toBe(String(gameId));

    // Complete + settle the game, then clear activeGameId (mirrors the
    // production `settleAndClearActiveGame` wrapper).
    const { settleGameHandler } = await import("./gamesSettlement");
    const { clearSettledGameForParticipants } = await import("./gamesProgression");
    await t.mutation(async (ctx) => {
      const g = await ctx.db.get(gameId);
      if (!g) throw new Error("game not found");
      await ctx.db.patch(g._id, {
        status: "completed",
        winnerId: playerIds[0],
        pot: 0,
        updatedAt: Date.now(),
      });
    });
    await t.mutation(async (ctx) => {
      const result = await settleGameHandler(ctx, { gameId });
      if (result.ok) {
        await clearSettledGameForParticipants(ctx, roomId);
      }
    });

    // After settlement, activeGameId should be cleared.
    const activeIdAfterSettle = await getUserActiveGameId(t, userIds[0]!);
    expect(activeIdAfterSettle).toBeNull();

    // Redeal: creates a new waiting game.
    const redealResult = await t.mutation(async (ctx) => {
      return await internalRedealGameForRoomHandler(ctx, { roomId });
    });
    expect(redealResult.ok).toBe(true);
    if (!redealResult.ok) return;
    expect(redealResult.status).toBe("waiting");

    // The new waiting game must NOT set activeGameId on participants.
    const activeIdAfterRedeal = await getUserActiveGameId(t, userIds[0]!);
    expect(activeIdAfterRedeal).toBeNull();
  });

  test("waiting game does not block itself from starting", async () => {
    const t = convexTest(schema);

    const { gameId, userIds } = await seedBalanceRoomWithGame(t, [
      { authUserId: HUMAN_1, name: "Human 1" },
      { authUserId: BOT_USER, name: "Bot", isBot: true },
    ]);

    await seedWallet(t, userIds[0]!, 1000);

    // Stale activeGameId pointing at the very game being started. The
    // defensive `currentGameId` allowance in assertPlayersCanStartBalanceGame
    // must treat this as non-blocking.
    await t.mutation(async (ctx) => {
      const normalized = ctx.db.normalizeId("user", userIds[0]!);
      if (normalized) {
        await ctx.db.patch(normalized, { activeGameId: String(gameId) });
      }
    });

    const { internalStartGameHandler } = await import("./gamesSetup");
    const result = await t.mutation(async (ctx) => {
      return await internalStartGameHandler(ctx, { gameId });
    });

    expect(result.ok).toBe(true);

    // The game should now be active.
    const game = await t.query(async (ctx) => {
      return await ctx.db.get(gameId);
    });
    expect(game!.status).toBe("active");
  });

  test("validation failure leaves every wallet unchanged (assert before debit)", async () => {
    const t = convexTest(schema);

    // Two humans: HUMAN_1 has enough, HUMAN_2 does not.
    const { gameId, userIds } = await seedBalanceRoomWithGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
      ],
      500,
    );

    await seedWallet(t, userIds[0]!, 1000); // enough
    await seedWallet(t, userIds[1]!, 200); // not enough for 500 buy-in

    const balance1Before = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, userIds[0]!);
    });
    const balance2Before = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, userIds[1]!);
    });

    const { internalStartGameHandler } = await import("./gamesSetup");
    await expect(
      t.mutation(async (ctx) => {
        return await internalStartGameHandler(ctx, { gameId });
      }),
    ).rejects.toMatchObject({ data: { code: "INSUFFICIENT_FUNDS" } });

    // Neither wallet should be debited — the assert ran before any debit.
    const balance1After = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, userIds[0]!);
    });
    const balance2After = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, userIds[1]!);
    });
    expect(balance1After).toBe(balance1Before);
    expect(balance2After).toBe(balance2Before);

    // No buy-in transaction should exist for either player.
    const tx1 = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        buildOperationKey(OPERATION_NAMESPACES.buy_in, userIds[0]!, String(gameId)),
      );
    });
    const tx2 = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        buildOperationKey(OPERATION_NAMESPACES.buy_in, userIds[1]!, String(gameId)),
      );
    });
    expect(tx1).toBeNull();
    expect(tx2).toBeNull();
  });

  test("previous unsettled game blocks new balance-game start", async () => {
    const t = convexTest(schema);

    const { roomId, gameId: activeGameId, userIds } = await seedBalanceRoomWithGame(t, [
      { authUserId: HUMAN_1, name: "Human 1" },
      { authUserId: BOT_USER, name: "Bot", isBot: true },
    ]);

    await seedWallet(t, userIds[0]!, 2000);

    // Start the first game (it becomes active, not settled).
    const { internalStartGameHandler } = await import("./gamesSetup");
    await t.mutation(async (ctx) => {
      return await internalStartGameHandler(ctx, { gameId: activeGameId });
    });

    // Confirm activeGameId now points at the first game.
    const activeId = await getUserActiveGameId(t, userIds[0]!);
    expect(activeId).toBe(String(activeGameId));

    // Create a second waiting game in the same room.
    const secondGameId = await t.mutation(async (ctx) => {
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

    // Attempting to start the second game should fail with UNSETTLED_GAME
    // because HUMAN_1's activeGameId still points at the first (active,
    // unsettled) game.
    await expect(
      t.mutation(async (ctx) => {
        return await internalStartGameHandler(ctx, { gameId: secondGameId });
      }),
    ).rejects.toMatchObject({ data: { code: "UNSETTLED_GAME" } });
  });

  test("duplicate starts do not charge twice", async () => {
    const t = convexTest(schema);

    const { gameId, userIds } = await seedBalanceRoomWithGame(t, [
      { authUserId: HUMAN_1, name: "Human 1" },
      { authUserId: BOT_USER, name: "Bot", isBot: true },
    ]);

    await seedWallet(t, userIds[0]!, 1000);

    const { internalStartGameHandler } = await import("./gamesSetup");
    const r1 = await t.mutation(async (ctx) => {
      return await internalStartGameHandler(ctx, { gameId });
    });
    expect(r1.ok).toBe(true);

    // Second start — game is already active.
    const r2 = await t.mutation(async (ctx) => {
      return await internalStartGameHandler(ctx, { gameId });
    });
    expect(r2.ok).toBe(false);

    // Balance should reflect a single buy-in debit.
    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, userIds[0]!);
    });
    expect(balance).toBe(500); // 1000 - 500 buy-in, once
  });

  test("public and internal start paths produce the same result shape", async () => {
    const t = convexTest(schema);

    // Public path
    const { gameId: game1, userIds: userIds1 } = await seedBalanceRoomWithGame(t, [
      { authUserId: HUMAN_1, name: "Human 1" },
      { authUserId: BOT_USER, name: "Bot", isBot: true },
    ]);
    await seedWallet(t, userIds1[0]!, 1000);

    const { startGameHandler, internalStartGameHandler } = await import("./gamesSetup");
    const publicResult = await t.mutation(async (ctx) => {
      return await startGameHandler(ctx, { gameId: game1 });
    });
    expect(publicResult.ok).toBe(true);
    expect(publicResult.status).toBe("active");
    expect(publicResult.playersDealt).toBe(2);

    // Internal path
    const { gameId: game2, userIds: userIds2 } = await seedBalanceRoomWithGame(t, [
      { authUserId: HUMAN_2, name: "Human 2" },
      { authUserId: `${DEV_BOT_AUTH_PREFIX}bot:room:2`, name: "Bot 2", isBot: true },
    ]);
    await seedWallet(t, userIds2[0]!, 1000);

    const internalResult = await t.mutation(async (ctx) => {
      return await internalStartGameHandler(ctx, { gameId: game2 });
    });
    expect(internalResult.ok).toBe(true);
    if (internalResult.ok) {
      expect(internalResult.status).toBe("active");
    }

    // Both games should be active with the same config structure.
    const g1 = await t.query(async (ctx) => ctx.db.get(game1));
    const g2 = await t.query(async (ctx) => ctx.db.get(game2));
    expect(g1!.status).toBe("active");
    expect(g2!.status).toBe("active");
    expect(g1!.config?.startingChips).toBe(g2!.config?.startingChips);
  });
});
