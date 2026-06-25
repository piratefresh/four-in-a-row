import { defineConfig, devices } from "@playwright/test";

const E2E_FRONTEND_URL = "http://localhost:3000";
const E2E_CONVEX_URL = "http://127.0.0.1:3210";
const E2E_CONVEX_SITE_URL = "http://127.0.0.1:3211";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: E2E_FRONTEND_URL,
    trace: "on",
    video: "on",
    screenshot: "on",
    storageState: ".auth/e2e-user.json",
  },
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  webServer: {
    command: "bun run dev",
    url: E2E_FRONTEND_URL,
    reuseExistingServer: true,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      VITE_CONVEX_URL: E2E_CONVEX_URL,
      VITE_CONVEX_SITE_URL: E2E_CONVEX_SITE_URL,
      E2E_TESTING: "true",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
