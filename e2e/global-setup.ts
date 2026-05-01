import { request as pwRequest } from "@playwright/test";
import { loadEnv } from "vite";
import fs from "node:fs";
import path from "node:path";

const env = loadEnv("test", process.cwd(), "");
for (const [key, value] of Object.entries(env)) {
  process.env[key] ??= value;
}
if (process.env.CONVEX_TEST_URL) {
  process.env.VITE_CONVEX_URL = process.env.CONVEX_TEST_URL;
}
if (process.env.CONVEX_TEST_SITE_URL) {
  process.env.VITE_CONVEX_SITE_URL = process.env.CONVEX_TEST_SITE_URL;
}

const E2E_PORT = process.env.E2E_PORT ?? "3000";
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${E2E_PORT}`;

const E2E_USER_EMAIL = "e2e-test@wordpoker.app";
const E2E_USER_PASSWORD = "E2eTest1234!";
const E2E_USER_NAME = "E2E Test Player";

const AUTH_STATE_DIR = ".auth";
const AUTH_STATE_PATH = path.join(AUTH_STATE_DIR, "e2e-user.json");

async function globalSetup() {
  fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });

  const ctx = await pwRequest.newContext({ baseURL: BASE_URL });

  const signUpRes = await ctx.post("/api/auth/sign-up/email", {
    data: {
      email: E2E_USER_EMAIL,
      password: E2E_USER_PASSWORD,
      name: E2E_USER_NAME,
    },
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
    },
  });

  if (!signUpRes.ok()) {
    const body = await signUpRes.text();
    console.log(`[e2e auth] Sign-up response (${signUpRes.status()}): ${body}`);
  }

  const signInRes = await ctx.post("/api/auth/sign-in/email", {
    data: {
      email: E2E_USER_EMAIL,
      password: E2E_USER_PASSWORD,
    },
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
    },
  });

  if (!signInRes.ok()) {
    const body = await signInRes.text();
    throw new Error(
      `[e2e auth] Sign-in failed (${signInRes.status()}): ${body}`,
    );
  }

  const signInBody = await signInRes.json();
  console.log(`[e2e auth] Signed in as: ${signInBody.user?.name ?? signInBody.user?.email ?? "unknown"}`);

  await ctx.storageState({ path: AUTH_STATE_PATH });
  console.log(`[e2e auth] Auth state saved to ${AUTH_STATE_PATH}`);

  await ctx.dispose();
}

export default globalSetup;