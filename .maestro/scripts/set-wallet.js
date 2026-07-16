/**
 * Maestro helper: Set the E2E user's wallet balance.
 *
 * Usage (from Maestro): runScript: .maestro/scripts/set-wallet.js
 *
 * Environment:
 *   CONVEX_URL — Convex HTTP endpoint (default: http://127.0.0.1:3210)
 *   WALLET_BALANCE — target balance (default: 10000)
 */

const CONVEX_URL = process.env.CONVEX_URL || "http://127.0.0.1:3210";
const TARGET = parseInt(process.env.WALLET_BALANCE || "10000", 10);

async function convexMutation(path, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args }),
  });
  const body = await res.json();
  if (body?.status === "error" || body?.errorMessage) {
    throw new Error(`Convex mutation ${path} failed: ${JSON.stringify(body)}`);
  }
  return body?.value ?? body;
}

async function convexQuery(path, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args }),
  });
  const body = await res.json();
  if (body?.status === "error" || body?.errorMessage) {
    throw new Error(`Convex query ${path} failed: ${JSON.stringify(body)}`);
  }
  return body?.value ?? body;
}

async function main() {
  // Ensure wallet exists
  await convexMutation("wallet:ensureMyWallet", {});

  const { balance } = await convexQuery("wallet:getMyBalance", {});
  const diff = TARGET - balance;

  if (diff > 0) {
    await convexMutation("wallet:depositPlaytestCoins", {
      amount: diff,
      operationId: `maestro:set-wallet:${Date.now()}`,
    });
  } else if (diff < 0) {
    await convexMutation("wallet:e2eDebitCoins", {
      amount: -diff,
      operationId: `maestro:set-wallet:${Date.now()}`,
    });
  }

  const after = await convexQuery("wallet:getMyBalance", {});
  console.log(JSON.stringify({ balance: after.balance }));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
