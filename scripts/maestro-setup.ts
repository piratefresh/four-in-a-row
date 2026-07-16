/**
 * Maestro E2E setup script.
 *
 * Provisions the E2E test account, resets state, sets wallet balance,
 * and optionally creates a test table.
 *
 * Usage: bun run scripts/maestro-setup.ts
 *
 * Prerequisites:
 *   - Convex dev server running with E2E_TESTING=true
 *   - Frontend dev server running on port 3000
 */

import { provisionE2E, createTable, convexMutation } from "../e2e/provisioning";

const result = await provisionE2E();

if (!result.ok) {
  console.error(`Setup failed: ${result.error}`);
  process.exit(1);
}

console.log(`Setup complete. runId=${result.runId}, wallet=${result.walletBalance}`);

// Optionally create a test table
const createTableEnv = process.env.CREATE_TABLE;
if (createTableEnv !== "false" && createTableEnv !== "0") {
  const economyMode = (process.env.TABLE_ECONOMY || "balance") as "balance" | "nonBalance";
  const buyIn = parseInt(process.env.TABLE_BUY_IN || "500", 10);
  const botCount = parseInt(process.env.TABLE_BOT_COUNT || "2", 10);

  const table = await createTable({
    playerName: "E2E Test Player",
    botCount,
    economyMode,
    buyIn,
    roomTitle: "E2E Test Table",
  });

  console.log(`Test table created: code=${table.code}, roomId=${table.roomId}`);
}
