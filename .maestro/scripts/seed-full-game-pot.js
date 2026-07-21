/** Commit deterministic wagers before completing a real browser hand. */

const convexUrl = CONVEX_URL || "http://127.0.0.1:3210";

function convex(endpoint, path, args) {
  const response = http.post(convexUrl + "/api/" + endpoint, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: path, args: args || {} }),
  });
  const body = json(response.body);
  if (body.status === "error" || body.errorMessage) {
    throw new Error("Convex " + path + " failed: " + JSON.stringify(body));
  }
  return body.value !== undefined ? body.value : body;
}

const activeRoom = convex("query", "rooms:getMyActiveRoom");
if (!activeRoom) throw new Error("Expected an active balance room");

const game = convex("query", "games:getGameByRoom", {
  roomId: activeRoom.roomId,
});
if (!game) throw new Error("Expected an active game");

const seeded = convex("mutation", "rooms:e2eSeedCommittedPot", {
  gameId: game._id,
  amountPerPlayer: 100,
});

output.fullGamePot = seeded;
console.log("Seeded committed pot: " + JSON.stringify(seeded));
