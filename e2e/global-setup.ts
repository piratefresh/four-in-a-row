import { request as pwRequest } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const BASE_URL = "http://localhost:3000";
const CONVEX_URL = "http://127.0.0.1:3210";
const AUTH_STATE_PATH = ".auth/e2e-user.json";
const E2E_USER_EMAIL = "e2e-test@wordpoker.app";
const E2E_USER_PASSWORD = "E2eTest1234!";
const E2E_USER_NAME = "E2E Test Player";

async function forceVerifyEmail(): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const convexCtx = await pwRequest.newContext({ baseURL: CONVEX_URL });
    try {
      const res = await convexCtx.post("/api/mutation", {
        data: {
          path: "auth:e2eForceVerifyUserEmail",
          args: { email: E2E_USER_EMAIL },
        },
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok()) {
        const body = await res.json();
        if (body?.value?.ok) {
          console.log(`[e2e auth] Email verified (attempt ${attempt + 1})`);
          return true;
        }
        console.log(`[e2e auth] Verify result (attempt ${attempt + 1}): ${JSON.stringify(body?.value)}`);
      } else {
        console.warn(`[e2e auth] Verify request failed (${res.status()}): ${await res.text()}`);
      }
    } finally {
      await convexCtx.dispose();
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.warn("[e2e auth] Email verification failed after 5 retries");
  return false;
}

async function globalSetup() {
  // Pre-flight: verify Convex backend is reachable and has E2E_TESTING=true.
  // Start Convex manually in another terminal: bun run convex:dev:e2e
  const checkCtx = await pwRequest.newContext({ baseURL: CONVEX_URL });
  try {
    const checkRes = await checkCtx.post("/api/mutation", {
      data: {
        path: "rooms:e2eCreateTestRoom",
        args: { playerName: "_preflight_check" },
      },
      headers: { "Content-Type": "application/json" },
    });
    const checkBody = await checkRes.json();
    if (checkBody?.errorMessage?.includes("only available in E2E testing mode")) {
      console.error(
        "\n❌ E2E_TESTING is disabled on the Convex backend.\n" +
        "   Start Convex with:  bun run convex:dev:e2e\n"
      );
      process.exit(1);
    }
  } catch {
    console.warn(
      "[e2e setup] Convex not reachable at " + CONVEX_URL + ". " +
      "Start it with: bun run convex:dev:e2e"
    );
  } finally {
    await checkCtx.dispose();
  }

  fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
  const ctx = await pwRequest.newContext({ baseURL: BASE_URL });

  // Sign up (may fail if user already exists – that's fine)
  await ctx.post("/api/auth/sign-up/email", {
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

  // Ensure the user's email is verified before signing in,
  // so the session cookie carries emailVerified: true.
  await forceVerifyEmail();

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

  if (signInRes.ok()) {
    const signInBody = await signInRes.json();
    console.log(
      `[e2e auth] Signed in as: ${signInBody.user?.name ?? signInBody.user?.email ?? "unknown"}`,
    );
  } else {
    const body = await signInRes.text();
    console.warn(
      `[e2e auth] Sign-in failed (${signInRes.status()}): ${body}`,
    );
    console.warn(
      "[e2e auth] Continuing without auth. Tests that require authentication will fail.",
    );
    // Diagnostic: check if the API auth route is reachable at all
    try {
      const diagRes = await ctx.get("/api/auth/session");
      console.warn(
        `[e2e auth] GET /api/auth/session status: ${diagRes.status()}`,
      );
    } catch (diagErr) {
      console.warn(
        `[e2e auth] GET /api/auth/session threw: ${diagErr}`,
      );
    }
  }

  await ctx.storageState({ path: AUTH_STATE_PATH });
  console.log(`[e2e auth] Auth state saved to ${AUTH_STATE_PATH}`);

  await ctx.dispose();
}

export default globalSetup;
