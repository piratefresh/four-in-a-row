/**
 * Seed a table-stakes game, join, and ready up for the betting-controls flows.
 *
 * The caller must already be authenticated (login.yaml has run).
 * This script normalizes the wallet to 1000, creates a 500 buy-in balance game
 * with 1 bot, joins the player, and readies them up so the flow lands directly
 * in the first betting round.
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

mutation("rooms:e2eResetTestState");
mutation("wallet:ensureMyWallet");

var before = query("wallet:getMyBalance").balance;
var difference = initialWallet - before;
if (difference > 0) {
  mutation("wallet:depositPlaytestCoins", {
    amount: difference,
    operationId: "maestro:betting:deposit:" + Date.now(),
  });
} else if (difference < 0) {
  mutation("wallet:e2eDebitCoins", {
    amount: -difference,
    operationId: "maestro:betting:debit:" + Date.now(),
  });
}

var room = mutation("rooms:e2eCreateTestRoom", {
  playerName: "E2E Bettor",
  botCount: 1,
  roomTitle: "Betting Controls Test",
  isBotGame: false,
  economyMode: "balance",
  buyIn: buyIn,
});

// Leave the fixture seat so the browser exercises the real join.
mutation("rooms:e2eResetTestState");

output.bettingHand = {
  code: room.code,
  roomId: room.roomId,
  initialWallet: initialWallet,
  buyIn: buyIn,
};

console.log("Seeded betting-controls table " + room.code);
