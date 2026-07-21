/** Capture exact post-hand table and wallet accounting. */

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

const activeRoom = query("rooms:getMyActiveRoom");
if (!activeRoom) throw new Error("Expected the settled table to remain active");

const roomData = query("rooms:getRoomMembers", { code: activeRoom.code });
const game = query("games:getGameByRoom", { roomId: activeRoom.roomId });
const wallet = query("wallet:getMyBalance");
const human = roomData.members.find(function (member) {
  return member._id === activeRoom.playerId;
});
const winner = roomData.members.find(function (member) {
  return member._id === game.winnerId;
});

output.fullGameSettlement = {
  gameStatus: game.status,
  settlementState: game.settlementState,
  pot: game.pot,
  humanStack: human ? human.tableStack : null,
  winnerStack: winner ? winner.tableStack : null,
  totalTableStacks: roomData.members.reduce(function (sum, member) {
    return sum + (member.tableStack || 0);
  }, 0),
  walletBalance: wallet.balance,
};

console.log(
  "Full-game settlement: " + JSON.stringify(output.fullGameSettlement),
);
