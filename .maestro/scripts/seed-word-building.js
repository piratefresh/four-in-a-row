/**
 * Seed a word-building test game and fast-forward to showdown.
 *
 * Creates a balance game with 1 bot, readies the E2E user,
 * starts the hand, and advances directly to the showdown phase
 * so the browser can test word building and submission.
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

// Normalize wallet and clean up stale state.
mutation("rooms:e2eResetTestState");
mutation("wallet:ensureMyWallet");

var before = query("wallet:getMyBalance").balance;
var difference = initialWallet - before;
if (difference > 0) {
  mutation("wallet:depositPlaytestCoins", {
    amount: difference,
    operationId: "maestro:wordbuild:deposit:" + Date.now(),
  });
} else if (difference < 0) {
  mutation("wallet:e2eDebitCoins", {
    amount: -difference,
    operationId: "maestro:wordbuild:debit:" + Date.now(),
  });
}

// Create the room. The E2E user is auto-seated by e2eCreateTestRoom,
// and 1 bot is added. We keep the E2E user seated so the browser
// sees them already in the room (no join modal needed).
var room = mutation("rooms:e2eCreateTestRoom", {
  playerName: "E2E Word Builder",
  botCount: 1,
  roomTitle: "Word Builder Test",
  isBotGame: false,
  economyMode: "balance",
  buyIn: buyIn,
});

// Room creation only creates and seats the table. Prepare the waiting hand
// before exercising the real ready gate below.
mutation("games:createGameForRoom", { roomId: room.roomId });

// Toggle ready — bots auto-ready, so this starts the hand.
mutation("rooms:toggleReady", { code: room.code });

// Poll for the game to be created (hand starts after all players ready).
var game = null;
for (var attempt = 0; attempt < 20; attempt++) {
  game = query("games:getGameByRoom", { roomId: room.roomId });
  if (game && game.status === "active") break;
}

if (!game || game.status !== "active") {
  throw new Error("Game did not start after readying up. Status: " + (game ? game.status : "none"));
}

// Fast-forward past all betting rounds to showdown.
mutation("rooms:e2eAdvanceToShowdown", { gameId: game._id });

output.wordBuild = {
  code: room.code,
  roomId: room.roomId,
  gameId: game._id,
  buyIn: buyIn,
};

console.log("Seeded word-building game " + room.code + " at showdown phase");
