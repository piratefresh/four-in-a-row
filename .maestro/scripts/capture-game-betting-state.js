/**
 * Capture detailed game betting state for the betting-controls Maestro flows.
 *
 * Returns: wallet balance, table stack, pot, current bet, game phase,
 * player's committed amount for the current round and total hand.
 */

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
var game = null;
var tableStack = null;
var betThisRound = null;
var totalBet = null;
var hasFolded = null;
var isMyTurn = null;
var canCheck = null;
var canCall = null;
var canRaise = null;
var canFold = null;

if (activeRoom) {
  const roomData = query("rooms:getRoomMembers", { code: activeRoom.code });
  const seat = roomData.members.find(function (candidate) {
    return candidate._id === activeRoom.playerId;
  });

  if (seat) {
    tableStack = seat.tableStack;
  }

  game = query("games:getGameByRoom", { roomId: activeRoom.roomId });

  if (game && game.players) {
    const me = game.players.find(function (player) {
      return player.playerId === activeRoom.playerId;
    });
    if (me) {
      betThisRound = me.betThisRound || 0;
      totalBet = me.totalBet || 0;
      hasFolded = !!me.hasFolded;
    }

    // Determine whose turn it is.
    if (game.turnOrder && game.currentPlayerIndex !== undefined) {
      const turnPlayerId = game.turnOrder[game.currentPlayerIndex];
      isMyTurn = turnPlayerId === activeRoom.playerId;

      // Derive available actions from game state.
      const currentBet = game.currentBet || 0;
      const myRoundBet = betThisRound || 0;

      canCheck = currentBet === 0;
      canCall = currentBet > 0 && myRoundBet < currentBet && tableStack > 0;
      canFold = true;
      canRaise = tableStack > 0;
    }
  }
}

output.bettingState = {
  walletBalance: wallet.balance,
  activeRoomCode: activeRoom ? activeRoom.code : null,
  tableStack: tableStack,
  pot: game ? game.pot : null,
  currentBet: game ? game.currentBet : null,
  gameStage: game ? game.stage : null,
  gameStatus: game ? game.status : null,
  betThisRound: betThisRound,
  totalBet: totalBet,
  hasFolded: hasFolded,
  isMyTurn: isMyTurn,
  canCheck: canCheck,
  canCall: canCall,
  canRaise: canRaise,
  canFold: canFold,
};

console.log("Betting state: " + JSON.stringify(output.bettingState));
