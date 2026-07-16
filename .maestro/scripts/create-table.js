/**
 * Maestro helper: Create a test table via the Convex E2E API.
 *
 * Usage (from Maestro): runScript: .maestro/scripts/create-table.js
 *
 * Environment:
 *   CONVEX_URL — Convex HTTP endpoint (default: http://127.0.0.1:3210)
 *
 * Reads test params from environment; returns JSON with { roomId, code }.
 */

const CONVEX_URL = process.env.CONVEX_URL || "http://127.0.0.1:3210";

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

async function main() {
  const economyMode = process.env.TABLE_ECONOMY || "balance";
  const buyIn = parseInt(process.env.TABLE_BUY_IN || "500", 10);
  const botCount = parseInt(process.env.TABLE_BOT_COUNT || "2", 10);
  const roomTitle = process.env.TABLE_TITLE || `E2E Table ${Date.now()}`;

  const result = await convexMutation("rooms:e2eCreateTestRoom", {
    playerName: "E2E Test Player",
    botCount,
    roomTitle,
    isBotGame: true,
    economyMode,
    buyIn,
  });

  console.log(JSON.stringify(result));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
