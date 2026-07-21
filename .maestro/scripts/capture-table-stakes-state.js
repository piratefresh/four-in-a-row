/** Capture wallet, active table stack, and forced-bet state for STO-249. */

const convexUrl = CONVEX_URL || "http://127.0.0.1:3210";

function query(path, args) {
  const response = http.post(convexUrl + "/api/query", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: path, args: args || {} }),
  });
  const body = json(response.body);

  if (body.status === "error" || body.errorMessage) {
    throw new Error("Convex query " + path + " failed: " + JSON.stringify(body));
  }

  return body.value !== undefined ? body.value : body;
}

const wallet = query("wallet:getMyBalance");
const activeRoom = query("rooms:getMyActiveRoom");
let game = null;
let tableStack = null;
let rebuyCount = null;

if (activeRoom) {
  const roomData = query("rooms:getRoomMembers", { code: activeRoom.code });
  const seat = roomData.members.find(function (candidate) {
    return candidate._id === activeRoom.playerId;
  });
  tableStack = seat ? seat.tableStack : null;
  rebuyCount = seat ? seat.rebuyCount : null;

  game = query("games:getGameByRoom", { roomId: activeRoom.roomId });
}

output.tableStakesState = {
  walletBalance: wallet.balance,
  activeRoomCode: activeRoom ? activeRoom.code : null,
  tableStack: tableStack,
  rebuyCount: rebuyCount,
  pot: game ? game.pot : null,
  currentBet: game ? game.currentBet : null,
  gameStatus: game ? game.status : null,
};

console.log("STO-249 state: " + JSON.stringify(output.tableStakesState));
