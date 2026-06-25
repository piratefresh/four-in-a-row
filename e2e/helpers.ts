import { expect } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

export const CONVEX_URL = "http://127.0.0.1:3210";
export const E2E_USER_EMAIL = "e2e-test@wordpoker.app";
export const E2E_USER_PASSWORD = "E2eTest1234!";
export const E2E_USER_NAME = "E2E Test Player";

export async function convexMutation(
  request: APIRequestContext,
  path: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const res = await request.post(`${CONVEX_URL}/api/mutation`, {
    data: { path, args },
    headers: { "Content-Type": "application/json" },
  });
  const body = await res.json();
  if (body?.status === "error" || body?.errorMessage) {
    throw new Error(`Convex mutation ${path} failed: ${JSON.stringify(body)}`);
  }
  return body?.value ?? body;
}

export async function convexQuery(
  request: APIRequestContext,
  path: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const res = await request.post(`${CONVEX_URL}/api/query`, {
    data: { path, args },
    headers: { "Content-Type": "application/json" },
  });
  const body = await res.json();
  if (body?.status === "error" || body?.errorMessage) {
    throw new Error(`Convex query ${path} failed: ${JSON.stringify(body)}`);
  }
  return body?.value ?? body;
}

export async function signIn(page: Page): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const alreadyHeading = page.getByRole("heading", {
    name: /you're signed in/i,
  });
  if (await alreadyHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    return;
  }
  await page.fill("#email", E2E_USER_EMAIL);
  await page.fill("#password", E2E_USER_PASSWORD);
  await page.getByRole("button", { name: /sign in with email/i }).click();
  await expect(page).toHaveURL("/", { timeout: 20_000 });
  await expect(page.getByText(E2E_USER_NAME, { exact: true })).toBeVisible({
    timeout: 10_000,
  });
}

export async function ensureMinBalance(
  request: APIRequestContext,
  minBalance: number,
): Promise<void> {
  await convexMutation(request, "wallet:ensureMyWallet", {});
  const bal = (await convexQuery(request, "wallet:getMyBalance", {})) as {
    balance: number;
  };
  if (bal.balance < minBalance) {
    await convexMutation(request, "wallet:depositPlaytestCoins", {
      amount: minBalance - bal.balance,
    });
  }
}

export function parseBalanceText(text: string | null): number {
  if (!text) return 0;
  return Number(text.replace(/,/g, ""));
}
