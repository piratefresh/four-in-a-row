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
import {
  completeGame,
  findEligibleWinnerIds,
  splitPotBySeatOrder,
  buildPayouts,
} from "./gamesSettlement";
import { DEV_BOT_AUTH_PREFIX } from "./gamesShared";

const HUMAN_1 = "human-user-1";
const HUMAN_2 = "human-user-2";
const BOT_USER = `${DEV_BOT_AUTH_PREFIX}bot:room:1`;

// ---------------------------------------------------------------------------
// Pure function tests
// ---------------------------------------------------------------------------

describe("findEligibleWinnerIds", () => {
  const submissions = [
    { playerId: "p1", score: 50, word: "cat", tiles: [{ baseValue: 10 }, { baseValue: 5 }, { baseValue: 3 }], createdAt: 1 },
    { playerId: "p2", score: 50, word: "dog", tiles: [{ baseValue: 10 }, { baseValue: 5 }, { baseValue: 3 }], createdAt: 2 },
    { playerId: "p3", score: 40, word: "hi", tiles: [{ baseValue: 5 }, { baseValue: 3 }], createdAt: 3 },
  ];

  test("returns winner when only one submission matches the winning score", () => {
    const eligible = new Set(["p1", "p2", "p3"]);
    const result = findEligibleWinnerIds(submissions, "p3", eligible);
    expect(result).toEqual(["p3"]);
  });

  test("returns all tied submissions with the same score/length/tile", () => {
    const eligible = new Set(["p1", "p2", "p3"]);
    const result = findEligibleWinnerIds(submissions, "p1", eligible);
    expect(result.sort()).toEqual(["p1", "p2"]);
  });

  test("excludes folded (ineligible) players from tied winners", () => {
    // p2 has folded — should not be a tied winner even with the same score.
    const eligible = new Set(["p1", "p3"]);
    const result = findEligibleWinnerIds(submissions, "p1", eligible);
    expect(result).toEqual(["p1"]);
  });

  test("returns empty array when winnerId is undefined", () => {
    const eligible = new Set(["p1", "p2"]);
    expect(findEligibleWinnerIds(submissions, undefined, eligible)).toEqual([]);
  });

  test("returns empty array when winnerId is not in eligible set", () => {
    const eligible = new Set(["p1", "p3"]);
    expect(findEligibleWinnerIds(submissions, "p2", eligible)).toEqual([]);
  });
});

describe("splitPotBySeatOrder", () => {
  const seats = new Map([
    ["p1", 0],
    ["p2", 1],
    ["p3", 2],
  ]);

  test("splits evenly when pot divides cleanly", () => {
    const shares = splitPotBySeatOrder(600, ["p1", "p2"], seats);
    expect(shares.get("p1")).toBe(300);
    expect(shares.get("p2")).toBe(300);
  });

  test("distributes remainder to lower seat indices first", () => {
    const shares = splitPotBySeatOrder(601, ["p1", "p2"], seats);
    expect(shares.get("p1")).toBe(301);
    expect(shares.get("p2")).toBe(300);
  });

  test("three-way split with 2-coin remainder", () => {
    const shares = splitPotBySeatOrder(602, ["p1", "p2", "p3"], seats);
    expect(shares.get("p1")).toBe(201);
    expect(shares.get("p2")).toBe(201);
    expect(shares.get("p3")).toBe(200);
  });

  test("returns empty map for no winners", () => {
    expect(splitPotBySeatOrder(600, [], seats).size).toBe(0);
  });

  test("returns empty map for zero pot", () => {
    expect(splitPotBySeatOrder(0, ["p1"], seats).size).toBe(0);
  });
});

describe("buildPayouts", () => {
  const playerById = new Map([
    ["p1", { authUserId: "user-1", seatIndex: 0 }],
    ["p2", { authUserId: "user-2", seatIndex: 1 }],
    ["p3", { authUserId: `${DEV_BOT_AUTH_PREFIX}bot`, seatIndex: 2 }],
  ]);

  test("builds payouts for all hands with positive amounts", () => {
    const payouts = buildPayouts({
      hands: [
        { playerId: "p1", chips: 300, hasFolded: false },
        { playerId: "p2", chips: 100, hasFolded: false },
        { playerId: "p3", chips: 200, hasFolded: false },
      ],
      playerById,
      potShares: new Map([["p1", 500]]),
    });
    expect(payouts).toHaveLength(3);
    expect(payouts.find((p) => p.playerId === "p1")!.amount).toBe(800);
    expect(payouts.find((p) => p.playerId === "p2")!.amount).toBe(100);
    expect(payouts.find((p) => p.playerId === "p3")!.amount).toBe(200);
    expect(payouts.find((p) => p.playerId === "p3")!.isBot).toBe(true);
  });

  test("skips hands with zero or negative payout", () => {
    const payouts = buildPayouts({
      hands: [
        { playerId: "p1", chips: 500, hasFolded: false },
        { playerId: "p2", chips: 0, hasFolded: true },
      ],
      playerById,
      potShares: new Map([["p1", 100]]),
    });
    expect(payouts).toHaveLength(1);
    expect(payouts[0]!.playerId).toBe("p1");
  });

  test("folded players get remaining chips but no pot share", () => {
    const payouts = buildPayouts({
      hands: [
        { playerId: "p1", chips: 400, hasFolded: false },
        { playerId: "p2", chips: 200, hasFolded: true },
      ],
      playerById,
      potShares: new Map([["p1", 600]]),
    });
    const p1 = payouts.find((p) => p.playerId === "p1")!;
    const p2 = payouts.find((p) => p.playerId === "p2")!;
    expect(p1.amount).toBe(1000); // 400 chips + 600 pot
    expect(p2.amount).toBe(200); // 200 chips only, no pot share
  });
});

// ---------------------------------------------------------------------------
// completeGame integration tests
// ---------------------------------------------------------------------------

async function seedRoomAndGame(
  t: ReturnType<typeof convexTest>,
  players: Array<{
    authUserId: string;
    name: string;
    isBot?: boolean;
  }>,
  options: { economyMode?: "balance" | "nonBalance"; buyIn?: number } = {},
) {
  const { roomId } = await t.mutation(async (ctx) => {
    const { createOpenRoom } = await import("../rooms/lifecycle");
    return await createOpenRoom(ctx, {
      title: "Completion test room",
      economyMode: options.economyMode,
      buyIn: options.economyMode === "balance" ? options.buyIn : undefined,
    });
  });

  const playerIds: string[] = [];
  const userIds: string[] = [];
  for (const [index, player] of players.entries()) {
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

  return { roomId, gameId, playerIds, userIds };
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
  const totalPot = hands.reduce((sum, h) => sum + (h.totalBet ?? 0), 0);
  await t.mutation(async (ctx) => {
    // Set the game's pot to match total bets.
    await ctx.db.patch(ctx.db.normalizeId("games", gameId)!, {
      pot: totalPot,
    });
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
      scoreBreakdown: { basePoints: score, multiplierBonus: 0, fullRackBonus: 0 },
      createdAt: Date.now(),
    });
  });
}

describe("completeGame integration (STO-234)", () => {
  test("completeGame settles and clears activeGameId", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds, userIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, userIds[0]!);
      await getOrCreateWallet(ctx, userIds[1]!);
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 300, totalBet: 200 },
      { playerId: playerIds[1]!, chips: 100, totalBet: 400 },
    ]);

    // Set activeGameId so we can verify it's cleared.
    await t.mutation(async (ctx) => {
      const normalized = ctx.db.normalizeId("user", userIds[0]!);
      if (normalized) await ctx.db.patch(normalized, { activeGameId: String(gameId) });
    });

    const result = await t.mutation(async (ctx) => {
      return await completeGame(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
        winnerId: playerIds[0],
        reason: "test_completion",
      });
    });

    expect(result.ok).toBe(true);

    // activeGameId should be cleared.
    const activeId = await t.query(async (ctx) => {
      const normalized = ctx.db.normalizeId("user", userIds[0]!);
      if (!normalized) return null;
      const user = await ctx.db.get(normalized);
      return user?.activeGameId;
    });
    expect(activeId).toBeNull();

    // Game should be completed + settled.
    const game = await t.query(async (ctx) => {
      return await ctx.db.get(ctx.db.normalizeId("games", gameId)!);
    });
    expect(game!.status).toBe("completed");
    expect(game!.settlementState).toBe("settled");
    expect(game!.winnerId).toBe(playerIds[0]);
  });

  test("duplicate completeGame calls are duplicate-safe", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds, userIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, userIds[0]!);
      await getOrCreateWallet(ctx, userIds[1]!);
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 300, totalBet: 200 },
      { playerId: playerIds[1]!, chips: 100, totalBet: 400 },
    ]);

    const r1 = await t.mutation(async (ctx) => {
      return await completeGame(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
        winnerId: playerIds[0],
        reason: "first_completion",
      });
    });
    const r2 = await t.mutation(async (ctx) => {
      return await completeGame(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
        winnerId: playerIds[0],
        reason: "duplicate_completion",
      });
    });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);

    // Balance should not change from the duplicate call.
    const balance = await t.query(async (ctx) => {
      return await getWalletBalance(ctx, userIds[0]!);
    });
    expect(balance).toBe(2025); // 1000 starter + 900 payout + 125 rewards
  });

  test("submitted player who forfeits before settlement is not a tied winner", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds, userIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, userIds[0]!);
      await getOrCreateWallet(ctx, userIds[1]!);
    });

    // Both submit the same score, but p2 then folds.
    await seedSubmission(t, gameId, playerIds[0]!, 50, 3, 10);
    await seedSubmission(t, gameId, playerIds[1]!, 50, 3, 10);

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 200, totalBet: 300 },
      { playerId: playerIds[1]!, chips: 200, totalBet: 300, hasFolded: true },
    ]);

    await t.mutation(async (ctx) => {
      await completeGame(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
        winnerId: playerIds[0],
        reason: "forfeit_before_settlement",
      });
    });

    // p1 should get the full pot (600) + their chips (200) = 800.
    // p2 should get only their chips (200) — no pot share because they folded.
    const bal1 = await t.query(async (ctx) => getWalletBalance(ctx, userIds[0]!));
    const bal2 = await t.query(async (ctx) => getWalletBalance(ctx, userIds[1]!));
    expect(bal1).toBe(2000); // 1000 + 800 payout + 125 rewards + 75 heavy_hitter
    expect(bal2).toBe(1275); // 1000 + 200 chips + 75 heavy_hitter (valid word, folded)
  });

  test("all-forfeit / no-winner completion splits pot among humans", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds, userIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: HUMAN_2, name: "Human 2" },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, userIds[0]!);
      await getOrCreateWallet(ctx, userIds[1]!);
    });

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 300, totalBet: 200 },
      { playerId: playerIds[1]!, chips: 200, totalBet: 300 },
    ]);

    // No winner — all forfeited.
    await t.mutation(async (ctx) => {
      await completeGame(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
        reason: "all_forfeited",
      });
    });

    // Pot (500) is split among the two humans: 250 + 250 (even split).
    // p1: 300 chips + 250 pot = 550. p2: 200 chips + 250 pot = 450.
    const bal1 = await t.query(async (ctx) => getWalletBalance(ctx, userIds[0]!));
    const bal2 = await t.query(async (ctx) => getWalletBalance(ctx, userIds[1]!));
    expect(bal1).toBe(1555); // 1000 + 550 payout + 5 showdown
    expect(bal2).toBe(1455); // 1000 + 450 payout + 5 showdown
  });

  test("bot-held chips disappear after settlement", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [
        { authUserId: HUMAN_1, name: "Human 1" },
        { authUserId: BOT_USER, name: "Bot", isBot: true },
      ],
      { economyMode: "balance", buyIn: 500 },
    );

    // Don't create a wallet for the bot — bots don't receive payouts.

    // Seed hands: bot has chips that should disappear.
    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 300, totalBet: 200 },
      { playerId: playerIds[1]!, chips: 400, totalBet: 100 },
    ]);

    await t.mutation(async (ctx) => {
      await completeGame(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
        winnerId: playerIds[0],
        reason: "bot_chips_disappear",
      });
    });

    // No payout transaction for the bot.
    const botPayoutKey = buildOperationKey(
      OPERATION_NAMESPACES.payout,
      BOT_USER,
      gameId,
    );
    const botTx = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(ctx, botPayoutKey);
    });
    expect(botTx).toBeNull();
  });

  test("completeGame with extraPatch applies scenario-specific fields", async () => {
    const t = convexTest(schema);

    const { gameId, playerIds } = await seedRoomAndGame(
      t,
      [{ authUserId: HUMAN_1, name: "Human 1" }],
      { economyMode: "nonBalance" },
    );

    await seedHands(t, gameId, [
      { playerId: playerIds[0]!, chips: 500, totalBet: 0 },
    ]);

    await t.mutation(async (ctx) => {
      await completeGame(ctx, {
        gameId: ctx.db.normalizeId("games", gameId)!,
        winnerId: playerIds[0],
        reason: "fold_win",
        extraPatch: {
          stage: "showdown",
          communityTiles: [],
          currentBet: 0,
        },
      });
    });

    const game = await t.query(async (ctx) => {
      return await ctx.db.get(ctx.db.normalizeId("games", gameId)!);
    });
    expect(game!.status).toBe("completed");
    expect(game!.stage).toBe("showdown");
    expect(game!.winnerId).toBe(playerIds[0]);
    expect(game!.settlementState).toBe("settled");
  });
});
