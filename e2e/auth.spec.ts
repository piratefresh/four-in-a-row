import { expect, test } from "@playwright/test";
import { E2E_USER_EMAIL, E2E_USER_PASSWORD, E2E_USER_NAME } from "./helpers";
test.describe("unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login page shows sign-in form", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /welcome back/i }),
    ).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with email/i }),
    ).toBeVisible();
  });

  test("register page shows sign-up form", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /save your progress/i }),
    ).toBeVisible();
    await expect(page.locator("#signup-name")).toBeVisible();
    await expect(page.locator("#signup-email")).toBeVisible();
    await expect(page.locator("#signup-password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign up with email/i }),
    ).toBeVisible();
  });

  test("can sign in with valid credentials", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await page.fill("#email", E2E_USER_EMAIL);
    await page.fill("#password", E2E_USER_PASSWORD);
    await page.getByRole("button", { name: /sign in with email/i }).click();

    await expect(page).toHaveURL("/", { timeout: 20_000 });
    await expect(page.getByText(E2E_USER_NAME, { exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await page.fill("#email", E2E_USER_EMAIL);
    await page.fill("#password", "wrong-password-123!");
    await page.getByRole("button", { name: /sign in with email/i }).click();

    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("authenticated", () => {
  test("login page shows already signed-in message", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /you're signed in/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator("p").filter({ hasText: E2E_USER_EMAIL }).first(),
    ).toBeVisible();
  });

  test("can sign out from header dropdown", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByText(E2E_USER_NAME, { exact: true }).first().click();
    await page.getByRole("menuitem", { name: /logout/i }).click();

    await expect(page.getByRole("link", { name: /login/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
