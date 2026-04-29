import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV ?? "test", process.cwd(), "");
for (const [key, value] of Object.entries(env)) {
  process.env[key] ??= value;
}

// When CONVEX_TEST_URL (preview deployment) is set, make the frontend also
// connect to that deployment instead of the dev deployment.
if (process.env.CONVEX_TEST_URL) {
  process.env.VITE_CONVEX_URL = process.env.CONVEX_TEST_URL;
}
if (process.env.CONVEX_TEST_SITE_URL) {
  process.env.VITE_CONVEX_SITE_URL = process.env.CONVEX_TEST_SITE_URL;
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    storageState: ".auth/e2e-user.json",
    // Propagate Convex URL so convex.setup.ts can reach preview deployments
    env: {
      CONVEX_TEST_URL: process.env.CONVEX_TEST_URL ?? "",
      CONVEX_TEST_SITE_URL: process.env.CONVEX_TEST_SITE_URL ?? "",
      VITE_CONVEX_URL: process.env.VITE_CONVEX_URL ?? "",
    },
  },
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    // When testing against a preview deployment, we need a fresh server
    // with the correct VITE_CONVEX_URL/VITE_CONVEX_SITE_URL env vars.
    // Don't reuse an existing server that might be connected to the dev deployment.
    reuseExistingServer: !process.env.CONVEX_TEST_URL,
    stdout: "pipe",
    env: {
      VITE_CONVEX_URL: process.env.VITE_CONVEX_URL ?? "",
      VITE_CONVEX_SITE_URL: process.env.VITE_CONVEX_SITE_URL ?? "",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
