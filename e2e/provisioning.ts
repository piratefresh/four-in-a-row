/**
 * Framework-neutral E2E provisioning — shared by Playwright global-setup,
 * Maestro scripts, and any future test runner.
 *
 * Uses raw `fetch` (Bun / Node 22 built-in) — no framework dependency.
 */
const CONVEX_URL = "http://127.0.0.1:3210";
const BASE_URL = "http://localhost:3000";
const E2E_USER_EMAIL = "e2e-test@wordpoker.app";
const E2E_USER_PASSWORD = "E2eTest1234!";
const E2E_USER_NAME = "E2E Test Player";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface E2EProvisioningResult {
  ok: boolean;
  runId: string;
  walletBalance: number | null;
  error?: string;
}

export type E2EPreflightResult =
  | { ok: true }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Convex API helpers
// ---------------------------------------------------------------------------

async function convexApi(
  endpoint: "mutation" | "query",
  path: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const res = await fetch(`${CONVEX_URL}/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args }),
  });
  const body = (await res.json()) as {
    status?: string;
    errorMessage?: string;
    value?: unknown;
  };
  if (body?.status === "error" || body?.errorMessage) {
    throw new Error(
      `Convex ${endpoint} ${path} failed: ${JSON.stringify(body)}`,
    );
  }
  return body?.value ?? body;
}

export async function convexMutation(
  path: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return convexApi("mutation", path, args);
}

export async function convexQuery(
  path: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return convexApi("query", path, args);
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export async function verifyConvexReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "rooms:listRooms", args: {} }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function verifyConvexE2EMode(): Promise<E2EPreflightResult> {
  try {
    // This guarded fixture is also the reset we need before provisioning.
    await convexMutation("rooms:e2eResetTestState", {});
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const e2eDisabled = /only available in e2e testing mode/i.test(detail);
    return {
      ok: false,
      error: e2eDisabled
        ? "Convex is running without E2E_TESTING=true. Restart it with: bun run convex:dev:e2e"
        : `Unable to verify Convex E2E mode: ${detail}`,
    };
  }
}

export async function verifyFrontendReachable(): Promise<E2EPreflightResult> {
  try {
    const res = await fetch(`${BASE_URL}/login`);
    if (res.ok) return { ok: true };
    return {
      ok: false,
      error: `Frontend login page returned HTTP ${res.status}. Restart it with: bun run dev:maestro`,
    };
  } catch {
    return {
      ok: false,
      error: `Frontend is not reachable at ${BASE_URL}. Start it with: bun run dev:maestro`,
    };
  }
}

// ---------------------------------------------------------------------------
// Account provisioning
// ---------------------------------------------------------------------------

export async function ensureE2EAccount(): Promise<void> {
  // Sign up (may fail if user already exists — that's fine)
  const signUpRes = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: E2E_USER_EMAIL,
      password: E2E_USER_PASSWORD,
      name: E2E_USER_NAME,
    }),
  });

  if (!signUpRes.ok) {
    const body = await signUpRes.json().catch(() => ({}));
    // USER_ALREADY_EXISTS is expected on re-runs
    if (
      body?.code !== "USER_ALREADY_EXISTS" &&
      signUpRes.status !== 409
    ) {
      console.warn(
        `[e2e provisioning] sign-up: ${signUpRes.status} ${JSON.stringify(body)}`,
      );
    }
  }

  // Force-verify email via E2E endpoint
  await convexMutation("auth:e2eForceVerifyUserEmail", {
    email: E2E_USER_EMAIL,
  });

  // Sign in
  const signInRes = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: E2E_USER_EMAIL,
      password: E2E_USER_PASSWORD,
    }),
  });

  if (!signInRes.ok) {
    throw new Error(
      `[e2e provisioning] sign-in failed: ${signInRes.status}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Wallet provisioning
// ---------------------------------------------------------------------------

export async function getWalletBalance(): Promise<number | null> {
  const result = (await convexQuery("wallet:getMyBalance", {})) as {
    balance: number | null;
  };
  return result.balance;
}

export async function setWalletBalance(targetBalance: number): Promise<number> {
  // Ensure wallet exists
  await convexMutation("wallet:ensureMyWallet", {});

  const current = (await convexQuery("wallet:getMyBalance", {})) as {
    balance: number;
  };
  const diff = targetBalance - current.balance;

  if (diff > 0) {
    await convexMutation("wallet:depositPlaytestCoins", {
      amount: diff,
      operationId: `e2e:set-wallet:${Date.now()}`,
    });
  } else if (diff < 0) {
    // Use the E2E debit fixture
    await convexMutation("wallet:e2eDebitCoins", {
      amount: -diff,
      operationId: `e2e:set-wallet:${Date.now()}`,
    });
  }

  const after = (await convexQuery("wallet:getMyBalance", {})) as {
    balance: number;
  };
  return after.balance;
}

// ---------------------------------------------------------------------------
// Table / room provisioning
// ---------------------------------------------------------------------------

export interface CreateTableOptions {
  playerName?: string;
  botCount?: number;
  roomTitle?: string;
  difficulty?: "easy" | "medium" | "hard";
  economyMode?: "balance" | "nonBalance";
  buyIn?: number;
}

export async function createTable(
  options: CreateTableOptions = {},
): Promise<{ roomId: string; code: string; playerId: string }> {
  const result = (await convexMutation("rooms:e2eCreateTestRoom", {
    playerName: options.playerName ?? E2E_USER_NAME,
    botCount: options.botCount ?? 2,
    roomTitle: options.roomTitle,
    difficulty: options.difficulty,
    isBotGame: true,
    economyMode: options.economyMode,
    buyIn: options.buyIn,
  })) as { roomId: string; code: string; playerId: string };

  return result;
}

// ---------------------------------------------------------------------------
// Game state fixtures
// ---------------------------------------------------------------------------

export async function createAndStartGame(
  roomId: string,
): Promise<{ gameId: string }> {
  const createRes = (await convexMutation("games:createGameForRoom", {
    roomId,
  })) as string;
  const gameId = typeof createRes === "string" ? createRes : (createRes as { gameId: string }).gameId;

  const startRes = (await convexMutation("games:startGame", { gameId })) as {
    ok: boolean;
  };
  if (!startRes.ok) {
    throw new Error(`Failed to start game ${gameId}`);
  }

  return { gameId };
}

// ---------------------------------------------------------------------------
// Run identifier
// ---------------------------------------------------------------------------

export function generateRunId(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Full provisioning (one-shot for setup scripts)
// ---------------------------------------------------------------------------

export async function provisionE2E(): Promise<E2EProvisioningResult> {
  const runId = generateRunId();
  console.log(`[e2e provisioning] runId=${runId}`);

  // 1. Verify Convex
  const reachable = await verifyConvexReachable();
  if (!reachable) {
    return {
      ok: false,
      runId,
      walletBalance: null,
      error:
        "Convex is not reachable at http://127.0.0.1:3210. Start it with: bun run convex:dev:e2e",
    };
  }
  console.log("[e2e provisioning] Convex reachable");

  // 2. Verify guarded fixtures before making account requests.
  const e2eMode = await verifyConvexE2EMode();
  if (!e2eMode.ok) {
    return { ok: false, runId, walletBalance: null, error: e2eMode.error };
  }
  console.log("[e2e provisioning] Convex E2E mode enabled");

  // 3. Verify the frontend/auth server before attempting account requests.
  const frontend = await verifyFrontendReachable();
  if (!frontend.ok) {
    return { ok: false, runId, walletBalance: null, error: frontend.error };
  }
  console.log("[e2e provisioning] Frontend reachable");

  // 4. Ensure account
  await ensureE2EAccount();
  console.log("[e2e provisioning] E2E account ready");

  // 3. Reset any active seat
  try {
    await convexMutation("rooms:e2eResetTestState", {});
  } catch {
    // May not exist yet — fine
  }
  console.log("[e2e provisioning] Test state reset");

  // 4. Set deterministic wallet balance
  const balance = await setWalletBalance(10_000);
  console.log(`[e2e provisioning] Wallet balance = ${balance}`);

  return { ok: true, runId, walletBalance: balance };
}

// Run directly when invoked as a script
if (import.meta.main) {
  const result = await provisionE2E();
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(JSON.stringify(result));
}
