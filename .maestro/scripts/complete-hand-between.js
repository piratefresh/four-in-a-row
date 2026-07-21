/**
 * Complete the current hand server-side and capture state for the next hand.
 *
 * Used by the stack-persists flow to verify that table stacks carry over
 * between hands without wallet interference.
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

function query(path, args) {
  return convex("query", path, args);
}

var activeRoom = query("rooms:getMyActiveRoom");
if (!activeRoom) throw new Error("No active room for stack-persists test");

var roomData = query("rooms:getRoomMembers", { code: activeRoom.code });
var seat = roomData.members.find(function (candidate) {
  return candidate._id === activeRoom.playerId;
});
var stackBefore = seat ? seat.tableStack : null;
var walletBefore = query("wallet:getMyBalance").balance;

var game = query("games:getGameByRoom", { roomId: activeRoom.roomId });
if (!game) throw new Error("No active game in the room");

// Complete the current hand.
mutation("rooms:e2eCompleteCurrentHand", { gameId: game._id });

// Capture state after hand completes — look for the next hand.
var walletAfter = query("wallet:getMyBalance").balance;
var activeRoomAfter = query("rooms:getMyActiveRoom");
var stackAfter = null;
var nextGame = null;

if (activeRoomAfter) {
  var nextRoomData = query("rooms:getRoomMembers", { code: activeRoomAfter.code });
  var nextSeat = nextRoomData.members.find(function (candidate) {
    return candidate._id === activeRoomAfter.playerId;
  });
  stackAfter = nextSeat ? nextSeat.tableStack : null;

  nextGame = query("games:getGameByRoom", { roomId: activeRoomAfter.roomId });
}

output.completedHand = {
  walletBefore: walletBefore,
  walletAfter: walletAfter,
  stackBefore: stackBefore,
  stackAfter: stackAfter,
  nextGameStatus: nextGame ? nextGame.status : null,
  nextGamePot: nextGame ? nextGame.pot : 0,
  nextGameCurrentBet: nextGame ? nextGame.currentBet : 0,
};

console.log("Completed hand: " + JSON.stringify(output.completedHand));
