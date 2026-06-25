import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("leaderboard page", () => {
  test("leaderboard page loads for authenticated user", async ({ page }) => {
    await signIn(page);

    await page.goto("/leaderboard", { waitUntil: "domcontentloaded" });

    // Verify the leaderboard heading is visible
    await expect(
      page.getByRole("heading", { name: "Leaderboard" }),
    ).toBeVisible({ timeout: 15_000 });

    // Verify no loading or error state
    await expect(page.getByText("Loading...")).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test("leaderboard page redirects for unauthenticated user", async ({
    browser,
  }) => {
    const unauthCtx = await browser.newContext({ storageState: undefined });
    const unauthPage = await unauthCtx.newPage();
    await unauthPage.goto("/leaderboard", { waitUntil: "domcontentloaded" });

    // Should redirect to login
    await expect(unauthPage).toHaveURL("/login", { timeout: 15_000 });
    await unauthCtx.close();
  });
});

test.describe("settings page", () => {
  test("settings page loads for authenticated user", async ({ page }) => {
    await signIn(page);

    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    // Verify the Account heading is visible
    await expect(
      page.getByRole("heading", { name: "Account" }),
    ).toBeVisible({ timeout: 15_000 });

    // Verify the name input label is visible (input has no stable id)
    await expect(page.getByLabel("Name")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("friends page", () => {
  test("friends page loads for authenticated user", async ({ page }) => {
    await signIn(page);

    await page.goto("/friends", { waitUntil: "domcontentloaded" });

    // Verify the Friends heading is visible
    await expect(
      page.getByRole("heading", { name: "Friends" }),
    ).toBeVisible({ timeout: 15_000 });

    // Verify no loading state is stuck
    await expect(page.getByText("Loading...")).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe("river run page", () => {
  test("river run landing page loads for authenticated user", async ({
    page,
  }) => {
    await signIn(page);

    await page.goto("/river-run", { waitUntil: "domcontentloaded" });

    // Verify the Start Run button is visible
    await expect(
      page.getByRole("button", { name: /start run/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
