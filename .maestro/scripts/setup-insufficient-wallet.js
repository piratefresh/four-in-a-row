/** Seed the deterministic STO-249 insufficient-wallet journey. */

const convexUrl = CONVEX_URL || "http://127.0.0.1:3210";
const wallet = 100;
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

const before = query("wallet:getMyBalance").balance;
const difference = wallet - before;

if (difference > 0) {
  mutation("wallet:depositPlaytestCoins", {
    amount: difference,
    operationId: "maestro:sto-249:insufficient:deposit:" + Date.now(),
  });
} else if (difference < 0) {
  mutation("wallet:e2eDebitCoins", {
    amount: -difference,
    operationId: "maestro:sto-249:insufficient:debit:" + Date.now(),
  });
}

const room = mutation("rooms:e2eCreateTestRoom", {
  playerName: "E2E Test Player",
  botCount: 1,
  roomTitle: "STO-249 Insufficient Wallet",
  isBotGame: false,
  economyMode: "balance",
  buyIn: buyIn,
});

// Leave the fixture's host seat while retaining its bot and public table.
mutation("rooms:e2eResetTestState");

output.insufficientWallet = {
  code: room.code,
  roomId: room.roomId,
  wallet: wallet,
  buyIn: buyIn,
};

console.log("Seeded insufficient-wallet table " + room.code);
