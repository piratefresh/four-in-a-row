/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import {
  getOrCreateWallet,
  getWalletBalance,
  findTransactionByOperationKey,
} from "../wallet/ledger";
import { DEV_BOT_AUTH_PREFIX } from "./gamesShared";
import { settleGameHandler } from "./gamesSettlement";

const HUMAN_1 = "human-user-1";
const HUMAN_2 = "human-user-2";
const BOT_USER = `${DEV_BOT_AUTH_PREFIX}bot:room:1`;

type SeedOptions = {
  economyMode?: "balance" | "nonBalance";
  buyIn?: number;
  tutorialId?: "first-bot-game";
};

async function seedRoomAndGame(
  t: ReturnType<typeof convexTest>,
  players: Array<{
    authUserId: string;
    name: string;
    isBot?: boolean;
  }>,
  options: SeedOptions = {},
) {
  const { roomId } = await t.mutation(async (ctx) => {
    const { createOpenRoom } = await import("../rooms/lifecycle");
    return await createOpenRoom(ctx, {
      title: "Test room",
      economyMode: options.economyMode,
      buyIn: options.economyMode === "balance" ? options.buyIn : undefined,
      tutorialId: options.tutorialId,
    });
  });

  const playerIds: string[] = [];
  for (const [index, player] of players.entries()) {
    const playerId = await t.mutation(async (ctx) => {
      return await ctx.db.insert("players", {
        roomId,
        authUserId: player.authUserId,
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
      stage: "showdown",
      communityTiles: [],
      deck: [],
      pot: 0,
      currentBet: 0,
      currentPlayerIndex: 0,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  return { roomId, gameId, playerIds };
}

async function seedHands(
  t: ReturnType<typeof convexTest>,
  gameId: string,
  hands: Array<{
    playerId: string;
    chips: number;
    totalBet?: number;
    hasFolded?: boolean;
  }>,
) {
  await t.mutation(async (ctx) => {
    for (const [index, hand] of hands.entries()) {
      const now = Date.now() + index;
      await ctx.db.insert("playerHands", {
        gameId: ctx.db.normalizeId("games", gameId)!,
        playerId: hand.playerId,
        tiles: [],
        chips: hand.chips,
        betThisRound: 0,
        totalBet: hand.totalBet ?? 0,
        hasActed: true,
        hasFolded: hand.hasFolded ?? false,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
}

async function seedSubmission(
  t: ReturnType<typeof convexTest>,
  gameId: string,
  playerId: string,
  score: number,
  wordLength: number,
  highestTileValue: number,
) {
  await t.mutation(async (ctx) => {
    const tiles = Array.from({ length: wordLength }, (_, i) => ({
      letter: String.fromCharCode(65 + i),
      baseValue: i === 0 ? highestTileValue : 1,
      source: "hand" as const,
    }));
    await ctx.db.insert("wordSubmissions", {
      gameId: ctx.db.normalizeId("games", gameId)!,
      playerId,
      stage: "showdown",
      word: tiles.map((t) => t.letter).join("").toLowerCase(),
      tiles,
      score,
      scoreBreakdown: {
        basePoints: score,
        multiplierBonus: 0,
        fullRackBonus: 0,
      },
      createdAt: Date.now(),
    });
  });
}

async function completeGame(
  t: ReturnType<typeof convexTest>,
  gameId: string,
  winnerId?: string,
  pot?: number,
) {
  await t.mutation(async (ctx) => {
    await ctx.db.patch(ctx.db.normalizeId("games", gameId)!, {
      status: "completed",
      winnerId,
      pot: pot ?? 0,
      updatedAt: Date.now(),
    });
  });
}

async function getGameDoc(
  t: ReturnType<typeof convexTest>,
  gameId: string,
) {
  return await t.query(async (ctx) => {
    return await ctx.db.get(ctx.db.normalizeId("games", gameId)!);
  });
}

describe("settleGameHandler", () => {
  test("winner receives remaining chips plus the full pot", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN_1);
      await getOrCreateWallet(ctx, HUMAN_2);
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 300, totalBet: 200 },
      { playerId: playerIds[1]!, chips: 100, totalBet: 400 },
    ]);

    await completeGame(t, gameId, playerIds[0], 600);

    const result = await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("settled");

    const bal1 = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_1);
    });
    const bal2 = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_2);
    });

    expect(bal1).toBe(2025); // 1000 + 900 payout + 125 rewards
    expect(bal2).toBe(1105); // 1000 + 100 payout + 5 showdown

    const tx1 = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        `payout:${HUMAN_1}:${ctx.db.normalizeId("games", gameId)}`,
      );
    });
    expect(tx1).not.toBeNull();
    expect(tx1!.amount).toBe(900);
    expect(tx1!.source).toBe("payout");

    const tx2 = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        `payout:${HUMAN_2}:${ctx.db.normalizeId("games", gameId)}`,
      );
    });
    expect(tx2).not.toBeNull();
    expect(tx2!.amount).toBe(100);
  });

  test("human losers receive their remaining table chips", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN_1);
      await getOrCreateWallet(ctx, HUMAN_2);
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 450, totalBet: 50 },
      { playerId: playerIds[1]!, chips: 200, totalBet: 300 },
    ]);

    await completeGame(t, gameId, playerIds[0], 350);

    await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    const bal2 = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_2);
    });

    expect(bal2).toBe(1205); // 1000 + 200 payout + 5 showdown
  });

  test("bot chips disappear after settlement", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: BOT_USER, name: "Bot", isBot: true },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN_1);
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 300, totalBet: 200 },
      { playerId: playerIds[1]!, chips: 400, totalBet: 100 },
    ]);

    await completeGame(t, gameId, playerIds[0], 300);

    await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    const botTx = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        `payout:${BOT_USER}:${ctx.db.normalizeId("games", gameId)}`,
      );
    });
    expect(botTx).toBeNull();

    const humanBalance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_1);
    });
    expect(humanBalance).toBe(1725); // 1000 + 600 payout + 125 rewards
  });

  test("duplicate settlement calls are duplicate-safe", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN_1);
      await getOrCreateWallet(ctx, HUMAN_2);
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 300, totalBet: 200 },
      { playerId: playerIds[1]!, chips: 100, totalBet: 400 },
    ]);

    await completeGame(t, gameId, playerIds[0], 600);

    await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    const secondResult = await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    expect(secondResult.ok).toBe(true);
    expect(secondResult.status).toBe("already_settled");

    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_1);
    });
    expect(balance).toBe(2025); // 1000 + 900 payout + 125 rewards, not doubled
  });

  test("tied winners split the pot equally", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN_1);
      await getOrCreateWallet(ctx, HUMAN_2);
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 200, totalBet: 300 },
      { playerId: playerIds[1]!, chips: 200, totalBet: 300 },
    ]);

    await seedSubmission(t, gameId, playerIds[0]!, 50, 3, 10);
    await seedSubmission(t, gameId, playerIds[1]!, 50, 3, 10);

    await completeGame(t, gameId, playerIds[0], 600);

    await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    const bal1 = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_1);
    });
    const bal2 = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_2);
    });

    expect(bal1).toBe(1700); // 1000 + 500 payout + 125 rewards + 75 heavy_hitter
    expect(bal2).toBe(1700);
  });

  test("split-pot remainders use deterministic seat order", async () => {
    const t = convexTest(schema);

    const HUMAN_3 = "human-user-3";

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
        { authUserId: HUMAN_3, name: "Human 3" },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN_1);
      await getOrCreateWallet(ctx, HUMAN_2);
      await getOrCreateWallet(ctx, HUMAN_3);
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 0, totalBet: 500 },
      { playerId: playerIds[1]!, chips: 0, totalBet: 500 },
      { playerId: playerIds[2]!, chips: 0, totalBet: 500 },
    ]);

    await seedSubmission(t, gameId, playerIds[0]!, 50, 3, 10);
    await seedSubmission(t, gameId, playerIds[1]!, 50, 3, 10);
    await seedSubmission(t, gameId, playerIds[2]!, 50, 3, 10);

    await completeGame(t, gameId, playerIds[0], 1502);

    await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    const bal1 = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_1);
    });
    const bal2 = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_2);
    });
    const bal3 = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_3);
    });

    expect(bal1).toBe(1701); // 1000 + 501 payout + 125 rewards + 75 heavy_hitter
    expect(bal2).toBe(1701);
    expect(bal3).toBe(1700); // 1000 + 500 payout + 125 rewards + 75 heavy_hitter
  });

  test("no winner: refund remaining chips and split pot among humans", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN_1);
      await getOrCreateWallet(ctx, HUMAN_2);
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 300, totalBet: 200 },
      { playerId: playerIds[1]!, chips: 200, totalBet: 300 },
    ]);

    await completeGame(t, gameId, undefined, 500);

    await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    const bal1 = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_1);
    });
    const bal2 = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_2);
    });

    expect(bal1).toBe(1555); // 1000 + 550 payout + 5 showdown
    expect(bal2).toBe(1455); // 1000 + 450 payout + 5 showdown
  });

  test("non-balance game marks settled without wallet transactions", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
      ],
      { economyMode: "nonBalance" },
    );

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 800, totalBet: 200 },
      { playerId: playerIds[1]!, chips: 500, totalBet: 500 },
    ]);

    await completeGame(t, gameId, playerIds[0], 700);

    const result = await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("settled");
    if (result.status === "settled") {
      expect(result.economyMode).toBe("nonBalance");
    }

    const game = await getGameDoc(t, gameId);
    expect(game!.settlementState).toBe("settled");
    expect(game!.settledAt).toBeDefined();

    const tx = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        `payout:${HUMAN_1}:${ctx.db.normalizeId("games", gameId)}`,
      );
    });
    expect(tx).toBeNull();
  });

  test("completed games record their settlement state", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [{ authUserId: HUMAN_1, name: "Human 1" }],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN_1);
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 500, totalBet: 0 },
    ]);

    await completeGame(t, gameId, playerIds[0], 0);

    const gameBefore = await getGameDoc(t, gameId);
    expect(gameBefore!.settlementState).toBeUndefined();

    await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    const gameAfter = await getGameDoc(t, gameId);
    expect(gameAfter!.settlementState).toBe("settled");
    expect(gameAfter!.settledAt).toBeGreaterThan(0);
  });

  test("tutorial game marks settled, awards tutorial reward, no payout tx", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: BOT_USER, name: "Bot", isBot: true },
      ],
      { economyMode: "nonBalance", tutorialId: "first-bot-game" },
    );

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 500, totalBet: 0 },
      { playerId: playerIds[1]!, chips: 500, totalBet: 0 },
    ]);

    await completeGame(t, gameId, playerIds[0], 0);

    const result = await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("settled");

    const tx = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        `payout:${HUMAN_1}:${ctx.db.normalizeId("games", gameId)}`,
      );
    });
    expect(tx).toBeNull();
  });

  test("settlement fails on non-completed game", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [{ authUserId: HUMAN_1, name: "Human 1" }],
      { economyMode: "balance", buyIn: 500 },
    );

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 500 },
    ]);

    const result = await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("not_completed");
  });

  test("fold win settlement: winner gets pot via completion path", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN_1);
      await getOrCreateWallet(ctx, HUMAN_2);
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 400, totalBet: 100 },
      { playerId: playerIds[1]!, chips: 0, totalBet: 500, hasFolded: true },
    ]);

    await t.mutation(async (ctx) => {
      const game = await ctx.db.get(ctx.db.normalizeId("games", gameId)!);
      if (!game) throw new Error("game not found");
      await ctx.db.patch(game._id, {
        status: "completed",
        winnerId: playerIds[0],
        pot: 600,
        updatedAt: Date.now(),
      });
    });

    await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
        foldWin: true,
      });
    });

    const winnerBalance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, HUMAN_1);
    });
    expect(winnerBalance).toBe(2120); // 2000 payout + 120 (hand_win + daily_first_win, no hand_complete)

    const loserTx = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        `payout:${HUMAN_2}:${ctx.db.normalizeId("games", gameId)}`,
      );
    });
    expect(loserTx).toBeNull();
  });

  test("every human with positive payout receives a separate transaction", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: "human-user-2", name: "Human 2" },
        { authUserId: "human-user-3", name: "Human 3" },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN_1);
      await getOrCreateWallet(ctx, "human-user-2");
      await getOrCreateWallet(ctx, "human-user-3");
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 300, totalBet: 200 },
      { playerId: playerIds[1]!, chips: 150, totalBet: 350 },
      { playerId: playerIds[2]!, chips: 50, totalBet: 450 },
    ]);

    await completeGame(t, gameId, playerIds[0], 1000);

    const result = await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("settled");
    if (result.status !== "settled") return;

    const payouts = result.payouts.filter((p) => !p.isBot);
    expect(payouts.length).toBe(3);
    expect(payouts.every((p) => p.amount > 0)).toBe(true);

    for (const authUserId of [HUMAN_1, "human-user-2", "human-user-3"]) {
      const tx = await t.query(async (ctx) => {
        return await findTransactionByOperationKey(
          ctx,
          `payout:${authUserId}:${ctx.db.normalizeId("games", gameId)}`,
        );
      });
      expect(tx).not.toBeNull();
      expect(tx!.source).toBe("payout");
    }
  });

  test("player with zero chips and no pot share gets no transaction", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN_1);
      await getOrCreateWallet(ctx, HUMAN_2);
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 500, totalBet: 0 },
      { playerId: playerIds[1]!, chips: 0, totalBet: 500, hasFolded: true },
    ]);

    await completeGame(t, gameId, playerIds[0], 500);

    const result = await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    expect(result.status).toBe("settled");
    if (result.status !== "settled") return;

    const loserPayout = result.payouts.find(
      (p) => p.playerId === playerIds[1],
    );
    expect(loserPayout).toBeUndefined();
  });
});
