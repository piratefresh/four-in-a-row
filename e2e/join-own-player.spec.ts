import { expect, test } from "@playwright/test";
import { convexMutation, convexQuery } from "./helpers";

const JOINER_PASSWORD = "E2eSeatJoiner1234!";
const JOINER_NAME = "Identity Joiner";

test.describe("authenticated seat ownership", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a user joining an occupied room becomes their own player", async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    const runId = Date.now();
    const joinerEmail = `e2e-seat-joiner-${runId}@wordpoker.app`;
    const roomTitle = `Identity Ownership ${runId}`;
    const signUp = await request.post("/api/auth/sign-up/email", {
      data: {
        email: joinerEmail,
        password: JOINER_PASSWORD,
        name: JOINER_NAME,
      },
    });
    expect(signUp.ok()).toBe(true);

    await convexMutation(request, "auth:e2eForceVerifyUserEmail", {
      email: joinerEmail,
    });

    const room = (await convexMutation(request, "rooms:e2eCreateTestRoom", {
      playerName: "Seat Zero Host",
      botCount: 1,
      roomTitle,
      isBotGame: false,
      economyMode: "nonBalance",
    })) as { code: string };

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", joinerEmail);
    await page.fill("#password", JOINER_PASSWORD);
    await page.getByRole("button", { name: /sign in with email/i }).click();
    await expect(page).toHaveURL("/", { timeout: 20_000 });

    await page.goto("/rooms", { waitUntil: "domcontentloaded" });
    await expect
      .poll(
        async () =>
          (await page.request.get("/api/auth/convex/token")).ok(),
        { message: "Better Auth should issue a Convex token" },
      )
      .toBe(true);
    await page.reload({ waitUntil: "domcontentloaded" });

    const roomRow = page.getByText(roomTitle, { exact: true });
    const joinButton = page.getByRole("button", { name: /join table/i });
    await expect(async () => {
      await roomRow.click();
      await expect(joinButton).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await joinButton.click();

    await expect(page).toHaveURL(`/rooms/${room.code}`, { timeout: 30_000 });
    await expect(page.getByText(JOINER_NAME, { exact: true })).toBeVisible();
    await expect(page.getByText(/Identity Joiner.*YOU/i)).toBeVisible();

    const roomState = (await convexQuery(request, "rooms:getRoomMembers", {
      code: room.code,
    })) as {
      members: Array<{
        name: string;
        seatIndex: number;
        authUserId: string;
      }>;
    };
    const host = roomState.members.find((member) => member.name === "Seat Zero Host");
    const joiner = roomState.members.find((member) => member.name === JOINER_NAME);

    expect(host?.seatIndex).toBe(0);
    expect(joiner?.seatIndex).toBeGreaterThan(0);
    expect(joiner?.authUserId).not.toBe(host?.authUserId);
  });
});
