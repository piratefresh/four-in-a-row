/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import type { Id } from "../_generated/dataModel";
import { getOrCreateWallet, getWalletBalance } from "../wallet/ledger";
import {
  openTableSession,
  rebuyTableSession,
  cashOutTableSession,
  syncSeatStack,
  awardPotToStack,
} from "./tableSession";
import { AI_DEALER_PLAYER_ID, DEV_BOT_AUTH_PREFIX } from "./gamesShared";

const HUMAN = "human-user-1";
const BOT = `${DEV_BOT_AUTH_PREFIX}bot:room:1`;

async function seedRoom(t: ReturnType<typeof convexTest>) {
  return await t.mutation(async (ctx) => {
    const { createOpenRoom } = await import("../rooms/lifecycle");
    const { roomId } = await createOpenRoom(ctx, {
      title: "Session test room",
      economyMode: "balance",
      buyIn: 500,
    });
    return roomId;
  });
}

async function seedSeat(
  t: ReturnType<typeof convexTest>,
  roomId: Id<"rooms">,
  authUserId: string,
  fields: Record<string, unknown> = {},
) {
  return await t.mutation(async (ctx) => {
    return await ctx.db.insert("players", {
      roomId,
      authUserId,
      name: authUserId,
      seatIndex: 0,
      isHost: true,
      status: "active",
      readyStatus: false,
      lastSeenAt: Date.now(),
      ...fields,
    });
  });
}

async function getSeat(t: ReturnType<typeof convexTest>, playerId: Id<"players">) {
  return await t.query(async (ctx) => ctx.db.get(playerId));
}

describe("openTableSession", () => {
  test("debits the buy-in and seeds a v1 session", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const playerId = await seedSeat(t, roomId, HUMAN);
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN));

    await t.mutation(async (ctx) =>
      openTableSession(ctx, { playerId, authUserId: HUMAN, buyIn: 500 }),
    );

    const balance = await t.query(async (ctx) => getWalletBalance(ctx, HUMAN));
    expect(balance).toBe(500); // 1000 - 500

    const seat = await getSeat(t, playerId);
    expect(seat?.tableStack).toBe(500);
    expect(seat?.tableSessionVersion).toBe(1);
    expect(seat?.rebuyCount).toBe(0);
  });

  test("bots are seeded with no wallet debit", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const playerId = await seedSeat(t, roomId, BOT, { isHost: false });

    await t.mutation(async (ctx) =>
      openTableSession(ctx, {
        playerId,
        authUserId: BOT,
        buyIn: 500,
        isBot: true,
      }),
    );

    expect(await t.query(async (ctx) => getWalletBalance(ctx, BOT))).toBeNull();
    const seat = await getSeat(t, playerId);
    expect(seat?.tableStack).toBe(500);
  });

  test("reactivation increments the session version", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const playerId = await seedSeat(t, roomId, HUMAN, {
      tableSessionVersion: 1,
    });
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN));

    const { tableSessionVersion } = await t.mutation(async (ctx) =>
      openTableSession(ctx, {
        playerId,
        authUserId: HUMAN,
        buyIn: 500,
        previousSessionVersion: 1,
      }),
    );

    expect(tableSessionVersion).toBe(2);
    expect((await getSeat(t, playerId))?.tableSessionVersion).toBe(2);
  });
});

describe("rebuyTableSession", () => {
  test("rejects a re-buy while the stack is non-zero", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const playerId = await seedSeat(t, roomId, HUMAN, {
      tableStack: 200,
      tableSessionVersion: 1,
      rebuyCount: 0,
    });
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN));

    await expect(
      t.mutation(async (ctx) => {
        const player = (await ctx.db.get(playerId))!;
        return await rebuyTableSession(ctx, {
          player,
          authUserId: HUMAN,
          buyIn: 500,
        });
      }),
    ).rejects.toMatchObject({ data: { code: "REBUY_NOT_ALLOWED" } });
  });

  test("debits the buy-in, resets the stack, and bumps rebuyCount", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const playerId = await seedSeat(t, roomId, HUMAN, {
      tableStack: 0,
      tableSessionVersion: 1,
      rebuyCount: 0,
    });
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN));

    const result = await t.mutation(async (ctx) => {
      const player = (await ctx.db.get(playerId))!;
      return await rebuyTableSession(ctx, {
        player,
        authUserId: HUMAN,
        buyIn: 500,
      });
    });

    expect(result.rebuyCount).toBe(1);
    expect(result.tableStack).toBe(500);
    expect(await t.query(async (ctx) => getWalletBalance(ctx, HUMAN))).toBe(500);
    const seat = await getSeat(t, playerId);
    expect(seat?.tableStack).toBe(500);
    expect(seat?.rebuyCount).toBe(1);
  });

  test("is duplicate-safe: a replayed re-buy (same rebuyCount) debits once", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const playerId = await seedSeat(t, roomId, HUMAN, {
      tableStack: 0,
      tableSessionVersion: 1,
      rebuyCount: 0,
    });
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN));

    // Two calls with the SAME stale player doc both compute rebuyCount = 1 and
    // therefore the same wallet operation key → debited once.
    await t.mutation(async (ctx) => {
      const player = (await ctx.db.get(playerId))!;
      await rebuyTableSession(ctx, { player, authUserId: HUMAN, buyIn: 500 });
      await rebuyTableSession(ctx, { player, authUserId: HUMAN, buyIn: 500 });
    });

    expect(await t.query(async (ctx) => getWalletBalance(ctx, HUMAN))).toBe(500);
  });
});

describe("cashOutTableSession", () => {
  test("credits the uncommitted stack and zeroes it", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const playerId = await seedSeat(t, roomId, HUMAN, {
      tableStack: 300,
      tableSessionVersion: 1,
    });
    // Wallet at 500 (as if 1000 - 500 buy-in already happened).
    await t.mutation(async (ctx) => {
      await getOrCreateWallet(ctx, HUMAN);
      const { debitWallet } = await import("../wallet/ledger");
      await debitWallet(ctx, {
        authUserId: HUMAN,
        amount: 500,
        source: "buy_in",
        operationKey: "test:seed",
      });
    });

    const { creditedAmount } = await t.mutation(async (ctx) => {
      const player = (await ctx.db.get(playerId))!;
      return await cashOutTableSession(ctx, { player });
    });

    expect(creditedAmount).toBe(300);
    expect(await t.query(async (ctx) => getWalletBalance(ctx, HUMAN))).toBe(800);
    expect((await getSeat(t, playerId))?.tableStack).toBe(0);
  });

  test("is duplicate-safe: a second cash-out credits nothing", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const playerId = await seedSeat(t, roomId, HUMAN, {
      tableStack: 300,
      tableSessionVersion: 1,
    });
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN));

    await t.mutation(async (ctx) => {
      const player = (await ctx.db.get(playerId))!;
      return await cashOutTableSession(ctx, { player });
    });
    const second = await t.mutation(async (ctx) => {
      const player = (await ctx.db.get(playerId))!;
      return await cashOutTableSession(ctx, { player });
    });

    expect(second.creditedAmount).toBe(0);
    // 1000 starter + 300 cashed out, once.
    expect(await t.query(async (ctx) => getWalletBalance(ctx, HUMAN))).toBe(1300);
  });

  test("bots never touch a wallet", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const playerId = await seedSeat(t, roomId, BOT, {
      isHost: false,
      tableStack: 300,
      tableSessionVersion: 1,
    });

    const { creditedAmount } = await t.mutation(async (ctx) => {
      const player = (await ctx.db.get(playerId))!;
      return await cashOutTableSession(ctx, { player, isBot: true });
    });

    expect(creditedAmount).toBe(0);
    expect(await t.query(async (ctx) => getWalletBalance(ctx, BOT))).toBeNull();
    expect((await getSeat(t, playerId))?.tableStack).toBe(0);
  });
});

describe("syncSeatStack / awardPotToStack", () => {
  test("syncSeatStack mirrors chips to a real seat and no-ops for AI_DEALER", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const playerId = await seedSeat(t, roomId, HUMAN, { tableStack: 500 });

    await t.mutation(async (ctx) => syncSeatStack(ctx, String(playerId), 420));
    expect((await getSeat(t, playerId))?.tableStack).toBe(420);

    // Seatless participant is a safe no-op (does not throw).
    await t.mutation(async (ctx) => syncSeatStack(ctx, AI_DEALER_PLAYER_ID, 0));
  });

  test("awardPotToStack adds to the seat; AI_DEALER pot is burned", async () => {
    const t = convexTest(schema);
    const roomId = await seedRoom(t);
    const playerId = await seedSeat(t, roomId, HUMAN, { tableStack: 100 });

    await t.mutation(async (ctx) =>
      awardPotToStack(ctx, { playerId: String(playerId), amount: 250 }),
    );
    expect((await getSeat(t, playerId))?.tableStack).toBe(350);

    // House sink: no seat, no throw, nothing credited.
    await t.mutation(async (ctx) =>
      awardPotToStack(ctx, { playerId: AI_DEALER_PLAYER_ID, amount: 999 }),
    );
  });
});
