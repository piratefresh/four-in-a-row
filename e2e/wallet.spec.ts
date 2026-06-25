import { expect, test } from "@playwright/test";
import { convexMutation, convexQuery, signIn, CONVEX_URL } from "./helpers";
test.describe("wallet creation and starter grant", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("wallet page shows a numeric balance", async ({ page }) => {
    await signIn(page);
    await page.goto("/wallet", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator("p").filter({ hasText: "Balance" }),
    ).toBeVisible({ timeout: 15_000 });
    // Verify a numeric balance is displayed (any positive number with commas)
    const balanceText = page.locator("p.font-serif.text-4xl");
    await expect(balanceText).toBeVisible({ timeout: 10_000 });
    const text = await balanceText.textContent();
    expect(text).toMatch(/[\d,]+/);
  });

  test("ensureMyWallet returns a balance without errors", async ({
    request,
  }) => {
    const result = await convexMutation(request, "wallet:ensureMyWallet", {});
    expect(typeof result.balance).toBe("number");
    expect(result.balance).toBeGreaterThanOrEqual(0);
  });

  test("refresh does not create duplicate starter grants", async ({
    page,
    request,
  }) => {
    await signIn(page);
    await convexMutation(request, "wallet:ensureMyWallet", {});
    const count1 = (
      await convexQuery(request, "wallet:getMyTransactions", {
        paginationOpts: { numItems: 50, cursor: null },
      })
    ).page.filter((t: { source: string }) => t.source === "starter_grant")
      .length;
    await page.goto("/wallet", { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    const count2 = (
      await convexQuery(request, "wallet:getMyTransactions", {
        paginationOpts: { numItems: 50, cursor: null },
      })
    ).page.filter((t: { source: string }) => t.source === "starter_grant")
      .length;
    expect(count2).toBe(count1);
  });
});

test.describe("playtest deposits", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("deposit via UI creates a playtest_deposit transaction", async ({
    page,
    request,
  }) => {
    await signIn(page);
    await convexMutation(request, "wallet:ensureMyWallet", {});

    await page.goto("/wallet", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator("p").filter({ hasText: "Balance" }),
    ).toBeVisible({ timeout: 15_000 });

    const depositInput = page
      .locator("input[type=number], input[inputmode=numeric]")
      .first();
    await depositInput.waitFor({ state: "visible", timeout: 10_000 });
    await depositInput.fill("500");
    await page.getByRole("button", { name: "Deposit" }).click();

    // Wait for the success toast or balance update
    await page.waitForTimeout(2000);

    // Verify a playtest_deposit transaction exists
    const txnRes = await convexQuery(request, "wallet:getMyTransactions", {
      paginationOpts: { numItems: 10, cursor: null },
    });
    const deposits = (txnRes?.page ?? []).filter(
      (t: { source: string }) => t.source === "playtest_deposit",
    );
    expect(deposits.length).toBeGreaterThanOrEqual(1);
    expect(deposits[0].amount).toBeGreaterThan(0);
  });

  test("deposit creates balance and is repeatable", async ({
    request,
  }) => {
    await convexMutation(request, "wallet:ensureMyWallet", {});

    const first = await convexMutation(request, "wallet:depositPlaytestCoins", {
      amount: 300,
    });
    expect(first.status === "applied" || first.balance !== undefined).toBe(true);

    // Repeating deposit without operation id creates a new deposit each time
    const second = await convexMutation(request, "wallet:depositPlaytestCoins", {
      amount: 300,
    });
    expect(second.status === "applied" || second.balance !== undefined).toBe(true);
  });

  test("over-limit deposit shows validation error", async ({
    page,
    request,
  }) => {
    await signIn(page);
    await convexMutation(request, "wallet:ensureMyWallet", {});

    await page.goto("/wallet", { waitUntil: "domcontentloaded" });
    const depositInput = page
      .locator("input[type=number], input[inputmode=numeric]")
      .first();
    await depositInput.waitFor({ state: "visible", timeout: 10_000 });
    await depositInput.fill("100001");
    await expect(
      page.getByText(/whole number between 1 and 100,000/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("deposit over 100,000 via direct API returns error", async ({
    request,
  }) => {
    const res = await request.post(`${CONVEX_URL}/api/mutation`, {
      data: {
        path: "wallet:depositPlaytestCoins",
        args: { amount: 100_001 },
      },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body?.errorMessage || body?.status === "error").toBeTruthy();
  });
});

test.describe("transaction history", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("transaction history shows newest-first ordering", async ({
    request,
  }) => {
    await convexMutation(request, "wallet:ensureMyWallet", {});
    const txnRes = await convexQuery(request, "wallet:getMyTransactions", {
      paginationOpts: { numItems: 50, cursor: null },
    });
    const transactions = txnRes?.page ?? [];
    if (transactions.length >= 2) {
      for (let i = 0; i < transactions.length - 1; i++) {
        expect(transactions[i].createdAt).toBeGreaterThanOrEqual(
          transactions[i + 1].createdAt,
        );
      }
    }
  });

  test("transaction history section is visible on wallet page", async ({
    page,
    request,
  }) => {
    await signIn(page);
    await convexMutation(request, "wallet:ensureMyWallet", {});

    await page.goto("/wallet", { waitUntil: "networkidle" });
    // The "Transaction History" heading should be visible
    await expect(page.getByText("Transaction History")).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("auth gate", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated access to /wallet redirects to /login", async ({
    page,
  }) => {
    await page.goto("/wallet", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
