/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { awardTutorialCompletionReward } from "./tutorialReward";
import {
  getOrCreateWallet,
  getWalletBalance,
  findTransactionByOperationKey,
  buildOperationKey,
  OPERATION_NAMESPACES,
} from "./wallet/ledger";
import { DEV_BOT_AUTH_PREFIX } from "./games/gamesShared";
import { FIRST_BOT_GAME_TUTORIAL_ID } from "./rooms/helpers";

const HUMAN = "test-tutorial-human";
const BOT = `${DEV_BOT_AUTH_PREFIX}tutorial-bot`;

async function seedWallet(
  t: ReturnType<typeof convexTest>,
  authUserId: string,
) {
  await t.mutation(async (ctx) => {
    await getOrCreateWallet(ctx, authUserId);
  });
}

async function getBalance(
  t: ReturnType<typeof convexTest>,
  authUserId: string,
) {
  return await t.query(async (ctx) => {
    return await getWalletBalance(ctx as any, authUserId);
  });
}

describe("awardTutorialCompletionReward", () => {
  test("non-tutorial room returns no rewards", async () => {
    const t = convexTest(schema);
    const result = await t.mutation(async (ctx) => {
      const roomId = await ctx.db.insert("rooms", {
        code: "TEST01",
        status: "open",
        maxPlayers: 4,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      });
      const gameId = await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "showdown",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "completed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const playerId = await ctx.db.insert("players", {
        roomId,
        authUserId: HUMAN,
        name: "Human",
        seatIndex: 0,
        isHost: false,
        status: "active",
        lastSeenAt: Date.now(),
      });

      const player = await ctx.db.get(playerId);
      return await awardTutorialCompletionReward(ctx, {
        room: { tutorialId: undefined } as any,
        gameId,
        hands: [{ playerId: String(playerId), hasFolded: false }],
        playerById: new Map([[String(playerId), player!]]),
      });
    });
    expect(result).toEqual([]);
  });

  test("tutorial room awards 100 coins", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    const result = await t.mutation(async (ctx) => {
      const roomId = await ctx.db.insert("rooms", {
        code: "TUTOR1",
        status: "open",
        maxPlayers: 4,
        tutorialId: FIRST_BOT_GAME_TUTORIAL_ID,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      });
      const gameId = await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "showdown",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "completed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const playerId = await ctx.db.insert("players", {
        roomId,
        authUserId: HUMAN,
        name: "Human",
        seatIndex: 0,
        isHost: false,
        status: "active",
        lastSeenAt: Date.now(),
      });

      const room = await ctx.db.get(roomId);
      const player = await ctx.db.get(playerId);
      return await awardTutorialCompletionReward(ctx, {
        room,
        gameId,
        hands: [{ playerId: String(playerId), hasFolded: false }],
        playerById: new Map([[String(playerId), player!]]),
      });
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.amount).toBe(100);
    expect(result[0]!.authUserId).toBe(HUMAN);

    // Verify wallet balance increased by 1000 (starter) + 100 (tutorial) = 1100.
    const balance = await getBalance(t, HUMAN);
    expect(balance).toBe(1100);
  });

  test("idempotent: second call returns no reward", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    let gameId: string;
    let roomDoc: any;
    let playerDoc: any;
    let roomId: string;

    await t.mutation(async (ctx) => {
      roomId = (await ctx.db.insert("rooms", {
        code: "TUTOR2",
        status: "open",
        maxPlayers: 4,
        tutorialId: FIRST_BOT_GAME_TUTORIAL_ID,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      })) as string;
      gameId = (await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "showdown",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "completed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })) as string;
      const pid = await ctx.db.insert("players", {
        roomId: roomId as any,
        authUserId: HUMAN,
        name: "Human",
        seatIndex: 0,
        isHost: false,
        status: "active",
        lastSeenAt: Date.now(),
      });
      roomDoc = await ctx.db.get(roomId as any);
      playerDoc = await ctx.db.get(pid);
    });

    // First call.
    const r1 = await t.mutation(async (ctx) => {
      return await awardTutorialCompletionReward(ctx, {
        room: roomDoc,
        gameId: ctx.db.normalizeId("games", gameId!)!,
        hands: [{ playerId: String(playerDoc!._id), hasFolded: false }],
        playerById: new Map([[String(playerDoc!._id), playerDoc]]),
      });
    });
    expect(r1).toHaveLength(1);

    // Second call — idempotent.
    const r2 = await t.mutation(async (ctx) => {
      return await awardTutorialCompletionReward(ctx, {
        room: roomDoc,
        gameId: ctx.db.normalizeId("games", gameId!)!,
        hands: [{ playerId: String(playerDoc!._id), hasFolded: false }],
        playerById: new Map([[String(playerDoc!._id), playerDoc]]),
      });
    });
    expect(r2).toEqual([]);

    const balance = await getBalance(t, HUMAN);
    expect(balance).toBe(1100);
  });

  test("bots do not receive tutorial reward", async () => {
    const t = convexTest(schema);

    const result = await t.mutation(async (ctx) => {
      const roomId = await ctx.db.insert("rooms", {
        code: "TUTOR3",
        status: "open",
        maxPlayers: 4,
        tutorialId: FIRST_BOT_GAME_TUTORIAL_ID,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      });
      const gameId = await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "showdown",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "completed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const botPlayerId = await ctx.db.insert("players", {
        roomId,
        authUserId: BOT,
        name: "Bot",
        seatIndex: 0,
        isHost: false,
        status: "active",
        lastSeenAt: Date.now(),
      });

      const room = await ctx.db.get(roomId);
      const botPlayer = await ctx.db.get(botPlayerId);
      return await awardTutorialCompletionReward(ctx, {
        room,
        gameId,
        hands: [{ playerId: String(botPlayerId), hasFolded: false }],
        playerById: new Map([[String(botPlayerId), botPlayer!]]),
      });
    });

    expect(result).toEqual([]);
  });

  test("null room returns no rewards", async () => {
    const t = convexTest(schema);

    const result = await t.mutation(async (ctx) => {
      return await awardTutorialCompletionReward(ctx, {
        room: null,
        gameId: "ignored" as any,
        hands: [],
        playerById: new Map(),
      });
    });
    expect(result).toEqual([]);
  });

  test("operation key follows the specified format", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    await t.mutation(async (ctx) => {
      const roomId = await ctx.db.insert("rooms", {
        code: "TUTOR4",
        status: "open",
        maxPlayers: 4,
        tutorialId: FIRST_BOT_GAME_TUTORIAL_ID,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      });
      const gameId = await ctx.db.insert("games", {
        roomId: String(roomId),
        stage: "showdown",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "completed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const playerId = await ctx.db.insert("players", {
        roomId,
        authUserId: HUMAN,
        name: "Human",
        seatIndex: 0,
        isHost: false,
        status: "active",
        lastSeenAt: Date.now(),
      });

      const room = await ctx.db.get(roomId);
      const player = await ctx.db.get(playerId);
      await awardTutorialCompletionReward(ctx, {
        room,
        gameId,
        hands: [{ playerId: String(playerId), hasFolded: false }],
        playerById: new Map([[String(playerId), player!]]),
      });
    });

    const expectedKey = buildOperationKey(
      OPERATION_NAMESPACES.tutorial,
      HUMAN,
      FIRST_BOT_GAME_TUTORIAL_ID,
    );
    expect(expectedKey).toBe(`tutorial:${HUMAN}:first-bot-game`);

    const tx = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(ctx, expectedKey);
    });
    expect(tx).not.toBeNull();
    expect(tx!.amount).toBe(100);
    expect(tx!.source).toBe("tutorial");
  });
});
