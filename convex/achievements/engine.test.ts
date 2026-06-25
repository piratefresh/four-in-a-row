/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import {
  evaluateCondition,
  type AchievementGameFacts,
  type PlayerGameFacts,
  type AchievementAward,
  type AchievementResult,
} from "./engine";
import {
  getOrCreateWallet,
  getWalletBalance,
  findTransactionByOperationKey,
  buildOperationKey,
} from "../wallet/ledger";
import { DEV_BOT_AUTH_PREFIX } from "../games/gamesShared";

const HUMAN = "test-user-ach";
const WINNER = "winner-user";
const LOSER = "loser-user";

function makeFacts(overrides: Partial<AchievementGameFacts> = {}): AchievementGameFacts {
  return {
    playerFacts: new Map(),
    winnerIds: [],
    winningScore: null,
    winningWord: null,
    ...overrides,
  };
}

function makePlayerFacts(overrides: Partial<PlayerGameFacts> = {}): PlayerGameFacts {
  return {
    authUserId: HUMAN,
    submittedWord: null,
    wordScore: 0,
    wordLength: 0,
    isFullRack: false,
    usedTwoLetterTile: false,
    decidedByDoubledTile: false,
    wentAllIn: false,
    allInStage: null,
    raisedOnRiver: false,
    stackRatioAtHandStart: 1,
    reachedShowdown: false,
    wonHand: false,
    ...overrides,
  };
}

async function seedWallet(t: ReturnType<typeof convexTest>, authUserId: string) {
  await t.mutation(async (ctx) => {
    await getOrCreateWallet(ctx, authUserId);
  });
}

async function getBalance(t: ReturnType<typeof convexTest>, authUserId: string) {
  return await t.query(async (ctx) => {
    return await getWalletBalance(ctx as any, authUserId);
  });
}

async function getProgressDoc(
  t: ReturnType<typeof convexTest>,
  authUserId: string,
  achievementId: string,
) {
  return await t.query(async (ctx) => {
    const db = ctx.db as any;
    return await db
      .query("achievementProgress")
      .withIndex("by_authUserId_achievement", (q: any) =>
        q.eq("authUserId", authUserId).eq("achievementId", achievementId),
      )
      .first();
  });
}

// ============================================================================
// Unit: evaluateCondition
// ============================================================================

describe("evaluateCondition", () => {
  test("== with matching numbers", () => {
    expect(evaluateCondition(10, "==", 10)).toBe(true);
  });

  test("== with non-matching numbers", () => {
    expect(evaluateCondition(5, "==", 10)).toBe(false);
  });

  test(">= with number at threshold", () => {
    expect(evaluateCondition(25, ">=", 25)).toBe(true);
  });

  test(">= with number above threshold", () => {
    expect(evaluateCondition(30, ">=", 25)).toBe(true);
  });

  test(">= with number below threshold", () => {
    expect(evaluateCondition(10, ">=", 25)).toBe(false);
  });

  test("< with number below threshold", () => {
    expect(evaluateCondition(0.05, "<", 0.1)).toBe(true);
  });

  test("< with number at threshold", () => {
    expect(evaluateCondition(0.1, "<", 0.1)).toBe(false);
  });

  test("< with number above threshold", () => {
    expect(evaluateCondition(0.5, "<", 0.1)).toBe(false);
  });

  test("matches with regex", () => {
    expect(evaluateCondition("QI", "matches", "^Q(?!U).*")).toBe(true);
  });

  test("matches with regex negative", () => {
    expect(evaluateCondition("QUEEN", "matches", "^Q(?!U).*")).toBe(false);
  });

  test("matches with case insensitivity", () => {
    expect(evaluateCondition("qi", "matches", "^Q(?!U).*")).toBe(true);
  });

  test("== with booleans", () => {
    expect(evaluateCondition(true, "==", true)).toBe(true);
    expect(evaluateCondition(false, "==", true)).toBe(false);
  });

  test("null value returns false", () => {
    expect(evaluateCondition(null, "==", "anything")).toBe(false);
  });

  test("undefined value returns false", () => {
    expect(evaluateCondition(undefined as unknown as string, "==", "x")).toBe(false);
  });

  test("invalid regex returns false", () => {
    expect(evaluateCondition("test", "matches", "[invalid")).toBe(false);
  });
});

// ============================================================================
// Integration: instant achievements
// ============================================================================

describe("achievement engine — instant achievements", () => {
  test("heavy_hitter triggers with score >= 25", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    // Use a 4-letter word scoring 30 (avoids anticlimax which needs wordLength==2).
    const facts = makeFacts({
      winnerIds: [HUMAN],
      winningScore: 30,
    });
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      submittedWord: "JAZZ",
      wordScore: 30,
      wordLength: 4,
      wonHand: true,
      reachedShowdown: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, id, facts);
    });

    const balance = await getBalance(t, HUMAN);
    expect(balance).toBe(1075); // 1000 starter + 75 heavy_hitter

    const progress = await getProgressDoc(t, HUMAN, "heavy_hitter");
    expect(progress).not.toBeNull();
    expect(progress!.progress).toBe(1);
    expect(progress!.completedTiers).toEqual([0]);
  });

  test("heavy_hitter does not trigger with score < 25", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      submittedWord: "CAT",
      wordScore: 5,
      wordLength: 3,
      wonHand: true,
      reachedShowdown: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, id, facts);
    });

    const balance = await getBalance(t, HUMAN);
    expect(balance).toBe(1000);

    const progress = await getProgressDoc(t, HUMAN, "heavy_hitter");
    expect(progress).toBeNull();
  });

  test("invalid word (score 0) does not trigger word achievements", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      submittedWord: "INVALID",
      wordScore: 0,
      wordLength: 7,
      wonHand: false,
      reachedShowdown: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, id, facts);
    });

    const progress = await getProgressDoc(t, HUMAN, "heavy_hitter");
    expect(progress).toBeNull();
  });

  test("q_without_u triggers with Q word (no U)", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    // QI: 2-letter word (anticlimax also triggers). Score Q=10+I=1=11.
    // Q Without U: 120 coins. Anticlimax: 60 coins. Total extras: 180.
    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      submittedWord: "QI",
      wordScore: 12,
      wordLength: 2,
      wonHand: true,
      reachedShowdown: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, id, facts);
    });

    const balance = await getBalance(t, HUMAN);
    // Q without U (120) + Anticlimax (60, since wordLength==2 and wonHand)
    expect(balance).toBe(1180); // 1000 + 120 + 60

    const progress = await getProgressDoc(t, HUMAN, "q_without_u");
    expect(progress).not.toBeNull();
    expect(progress!.completedTiers).toEqual([0]);
  });

  test("q_without_u does not trigger with QUEEN", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      submittedWord: "QUEEN",
      wordScore: 14,
      wordLength: 5,
      wonHand: true,
      reachedShowdown: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, id, facts);
    });

    const progress = await getProgressDoc(t, HUMAN, "q_without_u");
    expect(progress).toBeNull();
  });

  test("comeback triggers with stack ratio < 0.1", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      wonHand: true,
      reachedShowdown: true,
      stackRatioAtHandStart: 0.05,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, id, facts);
    });

    const balance = await getBalance(t, HUMAN);
    expect(balance).toBe(1150); // 1000 + 150

    const progress = await getProgressDoc(t, HUMAN, "comeback");
    expect(progress).not.toBeNull();
    expect(progress!.completedTiers).toEqual([0]);
  });

  test("comeback does not trigger with stack ratio >= 0.1", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      wonHand: true,
      reachedShowdown: true,
      stackRatioAtHandStart: 0.5,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, id, facts);
    });

    const progress = await getProgressDoc(t, HUMAN, "comeback");
    expect(progress).toBeNull();
  });

  test("anticlimax triggers with 2-letter winning word", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    // Word with score < 25 to avoid heavy_hitter interference.
    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      submittedWord: "HI",
      wordScore: 6,
      wordLength: 2,
      wonHand: true,
      reachedShowdown: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, id, facts);
    });

    const balance = await getBalance(t, HUMAN);
    expect(balance).toBe(1060); // 1000 + 60

    const progress = await getProgressDoc(t, HUMAN, "anticlimax");
    expect(progress).not.toBeNull();
  });

  test("ice_cold triggers for preflop all-in win", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      wonHand: true,
      reachedShowdown: true,
      wentAllIn: true,
      allInStage: "preflop",
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, id, facts);
    });

    const balance = await getBalance(t, HUMAN);
    expect(balance).toBe(1080); // 1000 + 80

    const progress = await getProgressDoc(t, HUMAN, "ice_cold");
    expect(progress).not.toBeNull();
  });

  test("ice_cold does not trigger for turn all-in", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      wonHand: true,
      reachedShowdown: true,
      wentAllIn: true,
      allInStage: "turn",
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, id, facts);
    });

    const progress = await getProgressDoc(t, HUMAN, "ice_cold");
    expect(progress).toBeNull();
  });
});

// ============================================================================
// Integration: progress achievements
// ============================================================================

describe("achievement engine — progress achievements", () => {
  test("hands_played increments on reached showdown", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      reachedShowdown: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, id, facts);
    });

    const progress = await getProgressDoc(t, HUMAN, "hands_played");
    expect(progress).not.toBeNull();
    expect(progress!.progress).toBe(1);
    expect(progress!.completedTiers).toEqual([]);
  });

  test("hands_played tier 1 grants coins at 10 showdowns", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      for (let i = 0; i < 9; i++) {
        const gameId = await ctx.db.insert("games", {
          roomId: "",
          stage: "showdown",
          communityTiles: [],
          deck: [],
          pot: 0,
          currentBet: 0,
          currentPlayerIndex: 0,
          status: "active",
          createdAt: Date.now() + i,
          updatedAt: Date.now() + i,
        });
        const facts = makeFacts();
        facts.playerFacts.set(HUMAN, makePlayerFacts({ reachedShowdown: true }));
        await evaluateAchievements(ctx, gameId, facts);
      }
    });

    let balance = await getBalance(t, HUMAN);
    expect(balance).toBe(1000);

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const gameId = await ctx.db.insert("games", {
        roomId: "",
        stage: "showdown",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "active",
        createdAt: Date.now() + 100,
        updatedAt: Date.now() + 100,
      });
      const facts = makeFacts();
      facts.playerFacts.set(HUMAN, makePlayerFacts({ reachedShowdown: true }));
      await evaluateAchievements(ctx, gameId, facts);
    });

    balance = await getBalance(t, HUMAN);
    expect(balance).toBe(1025); // 1000 + 25 (tier 1)

    const progress = await getProgressDoc(t, HUMAN, "hands_played");
    expect(progress!.progress).toBe(10);
    expect(progress!.completedTiers).toEqual([0]);
  });

  test("folded player does not increment hands_played", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      reachedShowdown: false,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, id, facts);
    });

    const progress = await getProgressDoc(t, HUMAN, "hands_played");
    expect(progress).toBeNull();
  });

  test("vocabularian tracks unique words only", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");

      for (let i = 0; i < 2; i++) {
        const gameId = await ctx.db.insert("games", {
          roomId: "",
          stage: "showdown",
          communityTiles: [],
          deck: [],
          pot: 0,
          currentBet: 0,
          currentPlayerIndex: 0,
          status: "active",
          createdAt: Date.now() + i,
          updatedAt: Date.now() + i,
        });
        const facts = makeFacts();
        facts.playerFacts.set(HUMAN, makePlayerFacts({
          submittedWord: "HELLO",
          wordScore: 8,
          wordLength: 5,
          reachedShowdown: true,
        }));
        await evaluateAchievements(ctx, gameId, facts);
      }
    });

    const progress = await getProgressDoc(t, HUMAN, "vocabularian");
    expect(progress).not.toBeNull();
    expect(progress!.progress).toBe(1);
    expect(progress!.seenWords).toBeDefined();
    expect(progress!.seenWords!).toEqual(["hello"]);
  });

  test("brewmaster tracks specific target words", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");

      const gameId = await ctx.db.insert("games", {
        roomId: "",
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
      const facts = makeFacts();
      facts.playerFacts.set(HUMAN, makePlayerFacts({
        submittedWord: "ALE",
        wordScore: 4,
        wordLength: 3,
        reachedShowdown: true,
      }));
      await evaluateAchievements(ctx, gameId, facts);
    });

    const progress = await getProgressDoc(t, HUMAN, "brewmaster");
    expect(progress).not.toBeNull();
    expect(progress!.progress).toBe(1);
    expect(progress!.targetWordsSeen).toBeDefined();
    expect(progress!.targetWordsSeen!).toEqual(["ALE"]);
  });

  test("brewmaster non-target word does not increment", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");

      const gameId = await ctx.db.insert("games", {
        roomId: "",
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
      const facts = makeFacts();
      facts.playerFacts.set(HUMAN, makePlayerFacts({
        submittedWord: "RANDOM",
        wordScore: 10,
        wordLength: 6,
        reachedShowdown: true,
      }));
      await evaluateAchievements(ctx, gameId, facts);
    });

    const progress = await getProgressDoc(t, HUMAN, "brewmaster");
    // A progress record may be created with progress=0, or not at all.
    // The key assertion: no actual progress was recorded.
    if (progress) {
      expect(progress.progress).toBe(0);
      expect(progress.targetWordsSeen).toBeUndefined();
    }
  });
});

// ============================================================================
// Integration: tiers
// ============================================================================

describe("achievement engine — tier grants", () => {
  test("full_house tiers grant independently", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    // Use a word with score < 25 to avoid heavy_hitter triggering simultaneously.
    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const gameId = await ctx.db.insert("games", {
        roomId: "",
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
      const facts = makeFacts();
      facts.playerFacts.set(HUMAN, makePlayerFacts({
        wonHand: true,
        reachedShowdown: true,
        isFullRack: true,
        submittedWord: "ABCDEFG",
        wordScore: 20,
        wordLength: 7,
      }));
      await evaluateAchievements(ctx, gameId, facts);
    });

    const balanceAfter1 = await getBalance(t, HUMAN);
    // 1000 + 20 (tier 0). Top-level 200 is skipped because tiers exist.
    expect(balanceAfter1).toBe(1020);

    const progress = await getProgressDoc(t, HUMAN, "full_house");
    expect(progress!.progress).toBe(1);
    expect(progress!.completedTiers).toContain(0);
    expect(progress!.completedTiers).not.toContain(1);
  });

  test("top-level reward is ignored when tiers exist", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    // Score < 25 to avoid heavy_hitter.
    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const gameId = await ctx.db.insert("games", {
        roomId: "",
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
      const facts = makeFacts();
      facts.playerFacts.set(HUMAN, makePlayerFacts({
        wonHand: true,
        reachedShowdown: true,
        isFullRack: true,
        submittedWord: "ABCDEFG",
        wordScore: 20,
        wordLength: 7,
      }));
      await evaluateAchievements(ctx, gameId, facts);
    });

    const txn = await t.query(async (ctx) => {
      return await ctx.db
        .query("transactions")
        .withIndex("by_authUserId_createdAt", (q) => q.eq("authUserId", HUMAN))
        .collect();
    });

    const achievementTxns = txn.filter((t) => t.source === "achievement");
    expect(achievementTxns).toHaveLength(1);
    expect(achievementTxns[0]!.amount).toBe(20);
  });
});

// ============================================================================
// Integration: idempotency
// ============================================================================

describe("achievement engine — idempotency", () => {
  test("instant achievements are not granted twice", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      submittedWord: "JAZZ",
      wordScore: 30,
      wordLength: 4,
      wonHand: true,
      reachedShowdown: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const gameId = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, gameId, facts);
      await evaluateAchievements(ctx, gameId, facts);
    });

    const balance = await getBalance(t, HUMAN);
    expect(balance).toBe(1075); // 1000 + 75 heavy_hitter, not doubled
  });

  test("progress tiers are not granted twice for same game", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");

      for (let i = 0; i < 9; i++) {
        const id = await ctx.db.insert("games", {
          roomId: "",
          stage: "showdown",
          communityTiles: [],
          deck: [],
          pot: 0,
          currentBet: 0,
          currentPlayerIndex: 0,
          status: "active",
          createdAt: Date.now() + i,
          updatedAt: Date.now() + i,
        });
        const f = makeFacts();
        f.playerFacts.set(HUMAN, makePlayerFacts({ reachedShowdown: true }));
        await evaluateAchievements(ctx, id, f);
      }
    });

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
        stage: "showdown",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "active",
        createdAt: Date.now() + 100,
        updatedAt: Date.now() + 100,
      });
      const f = makeFacts();
      f.playerFacts.set(HUMAN, makePlayerFacts({ reachedShowdown: true }));
      await evaluateAchievements(ctx, id, f);
      await evaluateAchievements(ctx, id, f);
    });

    const balance = await getBalance(t, HUMAN);
    expect(balance).toBe(1025); // 1000 + 25 once
  });
});

// ============================================================================
// Integration: bots excluded
// ============================================================================

describe("achievement engine — bot exclusion", () => {
  test("evaluateAchievements does not crash on valid human facts", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    // Bot filtering happens upstream in extractGameFacts — this is verified
    // by the settlement integration tests (gamesSettlement.test.ts).
    // Here we confirm the basic processing path works with human players.
    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      submittedWord: "JAZZ",
      wordScore: 30,
      wordLength: 4,
      wonHand: true,
      reachedShowdown: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, id, facts);
    });

    const progress = await getProgressDoc(t, HUMAN, "heavy_hitter");
    expect(progress).not.toBeNull();
    expect(progress!.progress).toBe(1);
  });
});

// ============================================================================
// Integration: tournament achievements ignored
// ============================================================================

describe("achievement engine — tournament achievements", () => {
  test("tournament_regular is never evaluated", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      reachedShowdown: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const gameId = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, gameId, facts);
    });

    const progress = await getProgressDoc(t, HUMAN, "tournament_regular");
    expect(progress).toBeNull();
  });

  test("sng_winner is never evaluated", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      wonHand: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const gameId = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, gameId, facts);
    });

    const progress = await getProgressDoc(t, HUMAN, "sng_winner");
    expect(progress).toBeNull();
  });
});

// ============================================================================
// Integration: multiple achievements per game
// ============================================================================

describe("achievement engine — multiple achievements per game", () => {
  test("one game can unlock multiple achievements", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    // QI: triggers q_without_u (120) + anticlimax (60). Score 12 avoids heavy_hitter.
    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      submittedWord: "QI",
      wordScore: 12,
      wordLength: 2,
      wonHand: true,
      reachedShowdown: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const gameId = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, gameId, facts);
    });

    const balance = await getBalance(t, HUMAN);
    expect(balance).toBe(1180); // 1000 + 120 + 60

    const qwu = await getProgressDoc(t, HUMAN, "q_without_u");
    expect(qwu).not.toBeNull();

    const ac = await getProgressDoc(t, HUMAN, "anticlimax");
    expect(ac).not.toBeNull();
  });
});

// ============================================================================
// Integration: idempotent operation keys
// ============================================================================

describe("achievement engine — operation keys", () => {
  test("achievement grants use stable idempotency keys", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    let gameIdStr: string;

    const facts = makeFacts();
    facts.playerFacts.set(HUMAN, makePlayerFacts({
      submittedWord: "JAZZ",
      wordScore: 30,
      wordLength: 4,
      wonHand: true,
      reachedShowdown: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const id = await ctx.db.insert("games", {
        roomId: "",
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
      gameIdStr = String(id);
      await evaluateAchievements(ctx, id, facts);
    });

    const expectedKey = `achievement:${HUMAN}:heavy_hitter:unlocked:${gameIdStr!}`;

    const txn = await t.query(async (ctx) => {
      return await findTransactionByOperationKey(ctx, expectedKey);
    });

    expect(txn).not.toBeNull();
    expect(txn!.amount).toBe(75);
    expect(txn!.source).toBe("achievement");
  });
});

// ============================================================================
// Integration: progress not lost
// ============================================================================

describe("achievement engine — progress preservation", () => {
  test("existing progress persists through re-evaluation", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const gameId = await ctx.db.insert("games", {
        roomId: "",
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
      const f = makeFacts();
      f.playerFacts.set(HUMAN, makePlayerFacts({ reachedShowdown: true }));
      await evaluateAchievements(ctx, gameId, f);
    });

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const gameId = await ctx.db.insert("games", {
        roomId: "",
        stage: "showdown",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "active",
        createdAt: Date.now() + 1,
        updatedAt: Date.now() + 1,
      });
      const f = makeFacts();
      f.playerFacts.set(HUMAN, makePlayerFacts({ reachedShowdown: true }));
      await evaluateAchievements(ctx, gameId, f);
    });

    const progress = await getProgressDoc(t, HUMAN, "hands_played");
    expect(progress!.progress).toBe(2);
  });
});

// ============================================================================
// Integration: winner vs loser facts
// ============================================================================

describe("achievement engine — winner and loser separation", () => {
  test("winners get win-based achievements, losers do not", async () => {
    const t = convexTest(schema);
    await seedWallet(t, WINNER);
    await seedWallet(t, LOSER);

    const facts = makeFacts();
    facts.playerFacts.set(WINNER, makePlayerFacts({
      authUserId: WINNER,
      submittedWord: "JAZZ",
      wordScore: 30,
      wordLength: 4,
      wonHand: true,
      reachedShowdown: true,
    }));
    facts.playerFacts.set(LOSER, makePlayerFacts({
      authUserId: LOSER,
      submittedWord: "CAT",
      wordScore: 5,
      wordLength: 3,
      wonHand: false,
      reachedShowdown: true,
    }));

    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const gameId = await ctx.db.insert("games", {
        roomId: "",
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
      await evaluateAchievements(ctx, gameId, facts);
    });

    // Winner gets heavy_hitter
    const hhWinner = await getProgressDoc(t, WINNER, "heavy_hitter");
    expect(hhWinner).not.toBeNull();

    // Loser does not get heavy_hitter (score < 25)
    const hhLoser = await getProgressDoc(t, LOSER, "heavy_hitter");
    expect(hhLoser).toBeNull();

    // Both get hands_played (reached showdown)
    const hpWinner = await getProgressDoc(t, WINNER, "hands_played");
    expect(hpWinner).not.toBeNull();
    expect(hpWinner!.progress).toBe(1);

    const hpLoser = await getProgressDoc(t, LOSER, "hands_played");
    expect(hpLoser).not.toBeNull();
    expect(hpLoser!.progress).toBe(1);
  });
});

// ============================================================================
// Integration: definition changes preserve progress
// ============================================================================

describe("achievement engine — completed achievements are not regranted", () => {
  test("already-completed achievements are not re-evaluated", async () => {
    const t = convexTest(schema);
    await seedWallet(t, HUMAN);

    // First game: trigger heavy_hitter
    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const gameId = await ctx.db.insert("games", {
        roomId: "",
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
      const facts = makeFacts();
      facts.playerFacts.set(HUMAN, makePlayerFacts({
        submittedWord: "JAZZ",
        wordScore: 30,
        wordLength: 4,
        wonHand: true,
        reachedShowdown: true,
      }));
      await evaluateAchievements(ctx, gameId, facts);
    });

    const balanceAfterFirst = await getBalance(t, HUMAN);
    expect(balanceAfterFirst).toBe(1075); // 1000 + 75

    // Second game with same triggering conditions
    await t.mutation(async (ctx) => {
      const { evaluateAchievements } = await import("./engine");
      const gameId = await ctx.db.insert("games", {
        roomId: "",
        stage: "showdown",
        communityTiles: [],
        deck: [],
        pot: 0,
        currentBet: 0,
        currentPlayerIndex: 0,
        status: "active",
        createdAt: Date.now() + 1,
        updatedAt: Date.now() + 1,
      });
      const facts = makeFacts();
      facts.playerFacts.set(HUMAN, makePlayerFacts({
        submittedWord: "JAZZ",
        wordScore: 30,
        wordLength: 4,
        wonHand: true,
        reachedShowdown: true,
      }));
      await evaluateAchievements(ctx, gameId, facts);
    });

    // Balance should NOT increase again for heavy_hitter (instant, already completed)
    const balanceAfterSecond = await getBalance(t, HUMAN);
    // Only hands_played progress counts, no coin grant for heavy_hitter again
    expect(balanceAfterSecond).toBe(1075);

    const progress = await getProgressDoc(t, HUMAN, "heavy_hitter");
    expect(progress!.progress).toBe(1);
    expect(progress!.completedTiers).toEqual([0]);
  });
});
