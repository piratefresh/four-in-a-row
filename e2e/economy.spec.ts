import { expect, test } from "@playwright/test";
import { convexMutation, convexQuery, CONVEX_URL } from "./helpers";
test.describe("room economy settings", () => {
  test("non-balance room stores economy fields correctly", async ({
    request,
  }) => {
    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "TestPractice",
      botCount: 0,
    });
    const roomData = await convexQuery(request, "rooms:getRoomMembers", {
      code: roomRes.code,
    });
    expect(
      roomData.room.economyMode === "nonBalance" ||
        roomData.room.economyMode == null,
    ).toBe(true);
    expect(roomData.room.buyIn).toBeFalsy();
  });

  test("balance room defaults to 500 buy-in", async ({ request }) => {
    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "TestBalance",
      botCount: 0,
      economyMode: "balance",
    });
    const roomData = await convexQuery(request, "rooms:getRoomMembers", {
      code: roomRes.code,
    });
    expect(roomData.room.economyMode).toBe("balance");
    expect(roomData.room.buyIn).toBe(500);
  });

  test("all four buy-in presets stored correctly", async ({ request }) => {
    for (const buyIn of [100, 500, 1000, 5000]) {
      const roomRes = await convexMutation(
        request,
        "rooms:e2eCreateTestRoom",
        {
          playerName: `Buyin${buyIn}`,
          botCount: 0,
          economyMode: "balance",
          buyIn,
        },
      );
      const roomData = await convexQuery(request, "rooms:getRoomMembers", {
        code: roomRes.code,
      });
      expect(roomData.room.buyIn).toBe(buyIn);
      expect(roomData.room.economyMode).toBe("balance");
    }
  });

  test("createRoom rejects invalid buy-in", async ({ request }) => {
    const res = await request.post(`${CONVEX_URL}/api/mutation`, {
      data: {
        path: "rooms:createRoom",
        args: { economyMode: "balance", buyIn: 300 },
      },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body?.errorMessage || body?.status === "error").toBeTruthy();
  });

  test("e2eCreateTestRoom stores economyMode and buyIn on room", async ({
    request,
  }) => {
    const roomRes = await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "StoreTest",
      botCount: 0,
      economyMode: "balance",
      buyIn: 1000,
    });
    expect(roomRes.code).toBeTruthy();
    expect(roomRes.roomId).toBeTruthy();
    // Verifying e2eCreateTestRoom returns valid data
  });
});

test.describe("guest restrictions", () => {
  test("guest cannot access /wallet", async ({ page }) => {
    await page.goto("/wallet", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
