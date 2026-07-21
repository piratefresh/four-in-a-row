/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import type { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";
import {
  isDisconnected,
  isDisconnectLeaseExpired,
  DISCONNECT_THRESHOLD_MS,
  DISCONNECT_LEASE_MS,
} from "./helpers";
import { getOrCreateWallet, getWalletBalance } from "../wallet/ledger";
import { DEV_BOT_AUTH_PREFIX } from "../games/gamesShared";

const HUMAN = "human-user-1";
const BOT = `${DEV_BOT_AUTH_PREFIX}bot:room:1`;

describe("disconnect predicates", () => {
  const now = 10_000_000;

  test("a fresh human is neither disconnected nor lease-expired", () => {
    const p = { authUserId: HUMAN, lastSeenAt: now };
    expect(isDisconnected(p, now)).toBe(false);
    expect(isDisconnectLeaseExpired(p, now)).toBe(false);
  });

  test("past the disconnect threshold but within grace: disconnected only", () => {
    const p = { authUserId: HUMAN, lastSeenAt: now - DISCONNECT_THRESHOLD_MS - 1 };
    expect(isDisconnected(p, now)).toBe(true);
    expect(isDisconnectLeaseExpired(p, now)).toBe(false);
  });

  test("past the grace period: both true", () => {
    const p = { authUserId: HUMAN, lastSeenAt: now - DISCONNECT_LEASE_MS - 1 };
    expect(isDisconnected(p, now)).toBe(true);
    expect(isDisconnectLeaseExpired(p, now)).toBe(true);
  });

  test("bots are never disconnected", () => {
    const p = { authUserId: BOT, lastSeenAt: now - DISCONNECT_LEASE_MS * 10 };
    expect(isDisconnected(p, now)).toBe(false);
    expect(isDisconnectLeaseExpired(p, now)).toBe(false);
  });
});

async function seedBalanceRoom(t: ReturnType<typeof convexTest>) {
  return await t.mutation(async (ctx) => {
    const { createOpenRoom } = await import("./lifecycle");
    const { roomId } = await createOpenRoom(ctx, {
      title: "Lease room",
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
  seatIndex: number,
  lastSeenAt: number,
  tableStack: number,
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
      lastSeenAt,
      tableStack,
      tableSessionVersion: 1,
      rebuyCount: 0,
    });
  });
}

describe("sweepDisconnectedLeases", () => {
  test("cashes out and removes a seat whose grace period has elapsed", async () => {
    const t = convexTest(schema);
    const roomId = await seedBalanceRoom(t);
    const now = Date.now();

    const stale = await seedSeat(t, roomId, HUMAN, 0, now - DISCONNECT_LEASE_MS - 5_000, 300);
    const fresh = await seedSeat(t, roomId, "human-user-2", 1, now, 500);
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN));

    const result = await t.mutation(api.rooms.sweepDisconnectedLeases, {});
    expect(result.leasesExpired).toBe(1);

    const staleSeat = await t.query(async (ctx) => ctx.db.get(stale));
    expect(staleSeat?.status).toBe("left");
    expect(staleSeat?.tableStack).toBe(0);
    expect(await t.query(async (ctx) => getWalletBalance(ctx, HUMAN))).toBe(1300);

    const freshSeat = await t.query(async (ctx) => ctx.db.get(fresh));
    expect(freshSeat?.status).toBe("active");
    expect(freshSeat?.tableStack).toBe(500);
  });

  test("does not sweep a seat that reconnected before the grace elapsed", async () => {
    const t = convexTest(schema);
    const roomId = await seedBalanceRoom(t);
    const now = Date.now();

    // Disconnected (past the short threshold) but still within the grace window.
    const recent = await seedSeat(
      t,
      roomId,
      HUMAN,
      0,
      now - DISCONNECT_THRESHOLD_MS - 5_000,
      300,
    );
    await seedSeat(t, roomId, "human-user-2", 1, now, 500);
    await t.mutation(async (ctx) => getOrCreateWallet(ctx, HUMAN));

    const result = await t.mutation(api.rooms.sweepDisconnectedLeases, {});
    expect(result.leasesExpired).toBe(0);

    const seat = await t.query(async (ctx) => ctx.db.get(recent));
    expect(seat?.status).toBe("active");
    expect(seat?.tableStack).toBe(300);
    expect(await t.query(async (ctx) => getWalletBalance(ctx, HUMAN))).toBe(1000);
  });
});
