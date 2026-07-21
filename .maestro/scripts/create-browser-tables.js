/**
 * Create balance and non-balance tables for the table-browser smoke test.
 *
 * Produces two public rooms with predictable properties so the Maestro flow
 * can assert on the lobby table cards directly.
 */

const convexUrl = CONVEX_URL || "http://127.0.0.1:3210";

function convex(endpoint, path, args) {
  const response = http.post(convexUrl + "/api/" + endpoint, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: path, args: args || {} }),
  });
  const body = json(response.body);
  if (body.status === "error" || body.errorMessage) {
    throw new Error(
      "Convex " + endpoint + " " + path + " failed: " + JSON.stringify(body),
    );
  }
  return body.value !== undefined ? body.value : body;
}

function mutation(path, args) {
  return convex("mutation", path, args);
}

// Clean up any stale seat before normalizing the wallet.
mutation("rooms:e2eResetTestState");
mutation("wallet:ensureMyWallet");

// Balance table with a fixed 500 coin buy-in and one bot.
const balance = mutation("rooms:e2eCreateTestRoom", {
  playerName: "E2E Test Player",
  botCount: 1,
  roomTitle: "Browser Balance Table",
  isBotGame: false,
  economyMode: "balance",
  buyIn: 500,
});
mutation("rooms:e2eResetTestState");

// Non-balance table with one bot.
const nonBalance = mutation("rooms:e2eCreateTestRoom", {
  playerName: "E2E Test Player",
  botCount: 1,
  roomTitle: "Browser Freeplay Table",
  isBotGame: false,
  economyMode: "nonBalance",
});
mutation("rooms:e2eResetTestState");

output.browserTables = {
  balance: {
    code: balance.code,
    roomId: balance.roomId,
    buyIn: 500,
    title: "Browser Balance Table",
  },
  nonBalance: {
    code: nonBalance.code,
    roomId: nonBalance.roomId,
    title: "Browser Freeplay Table",
  },
};

console.log("Created browser tables: " + JSON.stringify(output.browserTables));
