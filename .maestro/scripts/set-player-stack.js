/**
 * Maestro helper: Set a player's table stack.
 *
 * Usage (from Maestro): runScript: .maestro/scripts/set-player-stack.js
 *
 * Environment:
 *   CONVEX_URL — Convex HTTP endpoint (default: http://127.0.0.1:3210)
 *   GAME_ID — the game ID
 *   PLAYER_ID — the player ID
 *   CHIPS — target chip count
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
  const gameId = process.env.GAME_ID;
  const playerId = process.env.PLAYER_ID;
  const chips = parseInt(process.env.CHIPS || "0", 10);

  if (!gameId || !playerId) {
    throw new Error("GAME_ID and PLAYER_ID environment variables are required.");
  }

  const result = await convexMutation("rooms:e2eSetTableStack", {
    gameId,
    playerId,
    chips,
  });

  console.log(JSON.stringify(result));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
