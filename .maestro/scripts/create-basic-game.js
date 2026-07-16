/**
 * Create the deterministic room used by the basic-game Maestro flow.
 *
 * Maestro JavaScript runs in a sandbox, so use its built-in `http` client
 * and publish values through the global `output` object.
 */

const convexUrl = CONVEX_URL || "http://127.0.0.1:3210";

function mutation(path, args) {
  const response = http.post(convexUrl + "/api/mutation", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: path, args: args || {} }),
  });
  const body = json(response.body);

  if (body.status === "error" || body.errorMessage) {
    throw new Error(
      "Convex mutation " + path + " failed: " + JSON.stringify(body),
    );
  }

  return body.value || body;
}

const room = mutation("rooms:e2eCreateTestRoom", {
  playerName: "Maestro Player",
  botCount: 1,
  roomTitle: "Maestro Basic Game",
  isBotGame: true,
  economyMode: "nonBalance",
});

output.basicGame = {
  code: room.code,
  roomId: room.roomId,
};

console.log("Created Maestro basic-game room " + room.code);
