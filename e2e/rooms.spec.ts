import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";
test.describe("room creation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("create tutorial game from home page", async ({ page }) => {
    await signIn(page);

    await expect(
      page.getByRole("heading", { name: /choose how to play/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /tutorial/i }).click();

    await expect(page).toHaveURL(/\/rooms\/[A-Z0-9]{6}\?tutorial=intro/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: /phase 0\/room setup/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("create offline bot game from home page", async ({ page }) => {
    await signIn(page);

    await expect(
      page.getByRole("heading", { name: /choose how to play/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /offline mode/i }).click();

    await expect(
      page.getByRole("button", { name: /start offline room/i }),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /start offline room/i }).click();

    await expect(page).toHaveURL(/\/rooms\/[A-Z0-9]{6}/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: /phase 0\/room setup/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("create online room from lobby", async ({ page }) => {
    await signIn(page);

    await expect(
      page.getByRole("heading", { name: /choose how to play/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /online mode/i }).click();

    await expect(page).toHaveURL("/rooms", { timeout: 20_000 });

    await page.getByRole("button", { name: /new room/i }).click();

    await expect(
      page.getByRole("button", { name: /create room/i }),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /create room/i }).click();

    await expect(page).toHaveURL(/\/rooms\/[A-Z0-9]{6}/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: /joined room/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
