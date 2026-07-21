/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import {
  getOrCreateWallet,
  getWalletBalance,
  findTransactionByOperationKey,
} from "../wallet/ledger";
import { DEV_BOT_AUTH_PREFIX, AI_DEALER_PLAYER_ID } from "./gamesShared";
import { settleGameHandler } from "./gamesSettlement";

const HUMAN_1 = "human-user-1";
const HUMAN_2 = "human-user-2";
const BOT_USER = `${DEV_BOT_AUTH_PREFIX}bot:room:1`;
const AI_DEALER = AI_DEALER_PLAYER_ID;

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
      // Mirror the seat-lifecycle invariant: after betting, a seat's
      // persistent table stack equals its uncommitted hand chips. Settlement
      // then adds the pot share on top of this.
      const seatId = ctx.db.normalizeId("players", hand.playerId);
      if (seatId) await ctx.db.patch(seatId, { tableStack: hand.chips });
    }
  });
}

async function getStack(
  t: ReturnType<typeof convexTest>,
  playerId: string,
): Promise<number | undefined> {
  return await t.query(async (ctx) => {
    const seatId = ctx.db.normalizeId("players", playerId);
    if (!seatId) return undefined;
    const seat = await ctx.db.get(seatId);
    return seat?.tableStack;
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

    // Pot now stays on the seat's table stack; the wallet only receives the
    // separate gameplay rewards (not the pot).
    expect(bal1).toBe(1125); // 1000 + 125 rewards (no wallet payout)
    expect(bal2).toBe(1005); // 1000 + 5 showdown reward

    // Winner's stack = uncommitted chips (300) + full pot (600); loser keeps
    // their uncommitted 100.
    expect(await getStack(t, playerIds[0]!)).toBe(900);
    expect(await getStack(t, playerIds[1]!)).toBe(100);

    // No wallet payout transactions are written in the seat-lifecycle model.
    const tx1 = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        `payout:${HUMAN_1}:${ctx.db.normalizeId("games", gameId)}`,
      );
    });
    expect(tx1).toBeNull();
  });

  test("scored (non-fold) win credits the word bonus to the wallet", async () => {
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
    await seedSubmission(t, gameId, playerIds[0]!, 50, 3, 10);

    // Complete WITH a winning score so the production word-bonus path runs:
    // wordBonus = min(floor(50 * 0.5), 50) = 25.
    await t.mutation(async (ctx) => {
      await ctx.db.patch(ctx.db.normalizeId("games", gameId)!, {
        status: "completed",
        winnerId: playerIds[0],
        winningScore: 50,
        pot: 600,
        updatedAt: Date.now(),
      });
    });

    await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });

    const bal1 = await t.query(async (ctx) => getWalletBalance(ctx, HUMAN_1));
    // 1000 + 125 base + 75 heavy_hitter (score-50 word) + 25 word bonus.
    // The word bonus (min(floor(50*0.5), 50) = 25) is the production path this
    // test exists to cover. Pot stays on the stack.
    expect(bal1).toBe(1225);
    expect(await getStack(t, playerIds[0]!)).toBe(900); // 300 chips + 600 pot
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

    // Loser's uncommitted chips stay on the seat, not the wallet.
    expect(bal2).toBe(1005); // 1000 + 5 showdown reward
    expect(await getStack(t, playerIds[1]!)).toBe(200); // uncommitted chips
    expect(await getStack(t, playerIds[0]!)).toBe(800); // 450 chips + 350 pot
  });

  test("bot seats keep chips on their stack, never touch a wallet", async () => {
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
    // Human winner: wallet gets rewards only; the 300 pot goes to the stack.
    expect(humanBalance).toBe(1125); // 1000 + 125 rewards
    expect(await getStack(t, playerIds[0]!)).toBe(600); // 300 chips + 300 pot
    // Bot's uncommitted chips persist on its seat (no wallet involved).
    expect(await getStack(t, playerIds[1]!)).toBe(400);
  });

  test("AI_DEALER pot is an intentional house sink (chips burned, no seat)", async () => {
    // The synthetic AI_DEALER participant has no seat row, so a pot it wins is
    // burned by awardPotToStack rather than paid out. This documents that
    // deliberate behavior: conservation holds across real seats + wallets, not
    // across every hand. Do NOT "fix" this into a credit without a decision.
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [{ authUserId: HUMAN_1, name: "Human 1" }],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN_1);
    });

    // Human folds; the seatless AI_DEALER is the sole remaining "winner".
    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 200, totalBet: 300, hasFolded: true },
      { playerId: AI_DEALER, chips: 0, totalBet: 300 },
    ]);

    await completeGame(t, gameId, AI_DEALER, 600);

    const result = await t.mutation(async (ctx) => {
      return await settleGameHandler(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
      });
    });
    expect(result.ok).toBe(true);

    // The human keeps only their uncommitted stack; the AI_DEALER's 600 pot is
    // burned (no seat to receive it) and no wallet is credited the pot.
    expect(await getStack(t, playerIds[0]!)).toBe(200);
    const bal = await t.query(async (ctx) => getWalletBalance(ctx, HUMAN_1));
    expect(bal).toBe(1000); // starter only — folded human earns no rewards here
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
    expect(balance).toBe(1125); // 1000 + 125 rewards, not doubled
    // Stack keeps the single pot award (not doubled by the second settle).
    expect(await getStack(t, playerIds[0]!)).toBe(900);
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

    expect(bal1).toBe(1200); // 1000 + 125 rewards + 75 heavy_hitter (no payout)
    expect(bal2).toBe(1200);
    // Each tied winner: uncommitted 200 + half the 600 pot.
    expect(await getStack(t, playerIds[0]!)).toBe(500);
    expect(await getStack(t, playerIds[1]!)).toBe(500);
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

    // Wallet gets rewards only; the pot (with its remainder) lands on stacks.
    expect(bal1).toBe(1200); // 1000 + 125 rewards + 75 heavy_hitter
    expect(bal2).toBe(1200);
    expect(bal3).toBe(1200);
    // Remainder follows deterministic seat order: seats 0 and 1 get the extra.
    expect(await getStack(t, playerIds[0]!)).toBe(501);
    expect(await getStack(t, playerIds[1]!)).toBe(501);
    expect(await getStack(t, playerIds[2]!)).toBe(500);
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

    // No winner: pot is split among humans onto their stacks; wallet gets
    // only the showdown reward.
    expect(bal1).toBe(1005); // 1000 + 5 showdown reward
    expect(bal2).toBe(1005); // 1000 + 5 showdown reward
    expect(await getStack(t, playerIds[0]!)).toBe(550); // 300 chips + 250 pot
    expect(await getStack(t, playerIds[1]!)).toBe(450); // 200 chips + 250 pot
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
    // Wallet gets rewards only (hand_win + daily_first_win); the pot goes to
    // the winner's stack.
    expect(winnerBalance).toBe(1120); // 1000 + 120 rewards
    expect(await getStack(t, playerIds[0]!)).toBe(1000); // 400 chips + 600 pot

    const loserTx = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(
        ctx,
        `payout:${HUMAN_2}:${ctx.db.normalizeId("games", gameId)}`,
      );
    });
    expect(loserTx).toBeNull();
  });

  test("every seat with chips keeps a positive stack; no wallet payout tx", async () => {
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

    // Winner's stack = 300 chips + 1000 pot; losers keep their uncommitted
    // chips (150 / 50). None of this touches the wallet.
    expect(await getStack(t, playerIds[0]!)).toBe(1300);
    expect(await getStack(t, playerIds[1]!)).toBe(150);
    expect(await getStack(t, playerIds[2]!)).toBe(50);

    for (const authUserId of [HUMAN_1, "human-user-2", "human-user-3"]) {
      const tx = await t.query(async (ctx) => {
        return await findTransactionByOperationKey(
          ctx,
          `payout:${authUserId}:${ctx.db.normalizeId("games", gameId)}`,
        );
      });
      expect(tx).toBeNull();
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
