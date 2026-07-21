/** Execute the real fixed re-buy mutation after the E2E seat has busted. */

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

function query(path, args) {
  return convex("query", path, args);
}

const activeRoom = query("rooms:getMyActiveRoom");
if (!activeRoom) throw new Error("No busted STO-249 seat to re-buy");

const walletBefore = query("wallet:getMyBalance").balance;
const result = mutation("rooms:rebuy", { code: activeRoom.code });
const walletAfter = query("wallet:getMyBalance").balance;

output.rebuyTableStakes = {
  walletBefore: walletBefore,
  walletAfter: walletAfter,
  tableStack: result.tableStack,
  rebuyCount: result.rebuyCount,
};

console.log("Re-bought STO-249 seat: " + JSON.stringify(output.rebuyTableStakes));
