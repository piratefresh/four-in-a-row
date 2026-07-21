/** Expire the E2E seat's disconnect lease and run the guarded cash-out sweep. */

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
if (!activeRoom) throw new Error("No active STO-249 seat to expire");

const walletBefore = query("wallet:getMyBalance").balance;
const roomBefore = query("rooms:getRoomMembers", { code: activeRoom.code });
const seatBefore = roomBefore.members.find(function (member) {
  return member._id === activeRoom.playerId;
});

mutation("rooms:e2eExpirePlayerPresence", { playerId: activeRoom.playerId });
const sweep = mutation("rooms:sweepDisconnectedLeases");

const walletAfter = query("wallet:getMyBalance").balance;
const activeRoomAfter = query("rooms:getMyActiveRoom");

output.expiredTableStakes = {
  code: activeRoom.code,
  walletBefore: walletBefore,
  stackBefore: seatBefore ? seatBefore.tableStack : null,
  walletAfter: walletAfter,
  activeRoomAfter: activeRoomAfter,
  sweptCount: sweep.leasesExpired,
};

console.log("Expired STO-249 seat: " + JSON.stringify(output.expiredTableStakes));
