/**
 * Seed the deterministic STO-249 fixed-buy-in journey.
 *
 * Maestro's JavaScript runtime provides `http`, `json`, and `output` globals.
 * The local Convex deployment must be running with E2E_TESTING=true.
 */

const convexUrl = CONVEX_URL || "http://127.0.0.1:3210";
const initialWallet = 1000;
const buyIn = 500;

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

function query(path, args) {
  return convex("query", path, args);
}

// Remove any stale active seat before normalizing the wallet.
mutation("rooms:e2eResetTestState");
mutation("wallet:ensureMyWallet");

const before = query("wallet:getMyBalance").balance;
const difference = initialWallet - before;

if (difference > 0) {
  mutation("wallet:depositPlaytestCoins", {
    amount: difference,
    operationId: "maestro:sto-249:deposit:" + Date.now(),
  });
} else if (difference < 0) {
  mutation("wallet:e2eDebitCoins", {
    amount: -difference,
    operationId: "maestro:sto-249:debit:" + Date.now(),
  });
}

const room = mutation("rooms:e2eCreateTestRoom", {
  playerName: "E2E Test Player",
  botCount: 1,
  roomTitle: "STO-249 Table Stakes",
  // Public lobbies intentionally hide bot-game fixtures. Keep one bot seated,
  // but expose this as a normal room so Maestro exercises the real table card.
  isBotGame: false,
  economyMode: "balance",
  buyIn: buyIn,
});

// e2eCreateTestRoom initially seats the test user. Leave that fixture seat so
// the browser exercises the real join mutation and its buy-in transaction.
// The bot keeps the room open and joinable.
mutation("rooms:e2eResetTestState");

output.tableStakes = {
  code: room.code,
  roomId: room.roomId,
  initialWallet: initialWallet,
  buyIn: buyIn,
};

console.log("Seeded STO-249 table " + room.code + " at a 500 coin buy-in");
