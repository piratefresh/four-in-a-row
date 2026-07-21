/** Bust the E2E seat and complete its current hand to expose re-buy controls. */

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
if (!activeRoom) throw new Error("No active STO-249 seat to bust");

const game = query("games:getGameByRoom", { roomId: activeRoom.roomId });
if (!game || game.status !== "active") {
  throw new Error("Expected an active STO-249 hand");
}

mutation("rooms:e2eSetTableStack", {
  gameId: game._id,
  playerId: activeRoom.playerId,
  chips: 0,
});
mutation("rooms:e2eCompleteCurrentHand", { gameId: game._id });

output.bustedTableStakes = {
  code: activeRoom.code,
  gameId: game._id,
  playerId: activeRoom.playerId,
};

console.log("Busted STO-249 seat " + activeRoom.playerId);
