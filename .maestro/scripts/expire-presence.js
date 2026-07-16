/**
 * Maestro helper: Expire a player's presence to simulate disconnect timeout.
 *
 * Usage (from Maestro): runScript: .maestro/scripts/expire-presence.js
 *
 * Environment:
 *   CONVEX_URL — Convex HTTP endpoint (default: http://127.0.0.1:3210)
 *   PLAYER_ID — the player ID to expire
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
  const playerId = process.env.PLAYER_ID;

  if (!playerId) {
    throw new Error("PLAYER_ID environment variable is required.");
  }

  const result = await convexMutation("rooms:e2eExpirePlayerPresence", {
    playerId,
  });

  console.log(JSON.stringify(result));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
