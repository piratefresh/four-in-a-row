/**
 * Maestro helper: Leave any active room the E2E user is in.
 *
 * Usage (from Maestro): runScript: .maestro/scripts/leave-active-room.js
 *
 * Environment:
 *   CONVEX_URL — Convex HTTP endpoint (default: http://127.0.0.1:3210)
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
  // Use e2eResetTestState which leaves any active room for the E2E user
  const result = await convexMutation("rooms:e2eResetTestState", {});
  console.log(JSON.stringify(result));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
