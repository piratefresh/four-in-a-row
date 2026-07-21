/**
 * Submit a test word for the E2E player during showdown.
 *
 * Reads the player's available tiles from their hand and the community,
 * picks the first 2-7 tiles to form a submission, and sends it via
 * the Convex submitWord action. Returns the word, score, and result.
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

function query(path, args) {
  return convex("query", path, args);
}

function action(path, args) {
  return convex("action", path, args);
}

var activeRoom = query("rooms:getMyActiveRoom");
if (!activeRoom) throw new Error("No active room for word submission");

var game = query("games:getGameByRoom", { roomId: activeRoom.roomId });
if (!game) throw new Error("No active game in room");
if (game.stage !== "showdown") {
  throw new Error("Game is not in showdown phase: " + game.stage);
}

// Read player hands to get available tiles.
var hands = query("games:getPlayerHands", { gameId: game._id });
var myHand = null;
if (hands) {
  for (var i = 0; i < hands.length; i++) {
    if (hands[i].playerId === activeRoom.playerId) {
      myHand = hands[i];
      break;
    }
  }
}

// Collect available tiles: hand tiles + revealed community tiles.
var availableTiles = [];
if (myHand && myHand.tiles) {
  for (var j = 0; j < myHand.tiles.length; j++) {
    availableTiles.push({ tile: myHand.tiles[j], source: "hand", cardIndex: j });
  }
}
if (game.communityTiles) {
  for (var k = 0; k < game.communityTiles.length; k++) {
    if (game.communityTiles[k].revealed) {
      availableTiles.push({ tile: game.communityTiles[k], source: "community", cardIndex: k });
    }
  }
}

if (availableTiles.length < 2) {
  throw new Error("Not enough available tiles (need at least 2, have " + availableTiles.length + ")");
}

// Build a submission from the first N tiles.
var tileCount = Math.min(availableTiles.length, 7);
var tiles = [];
var word = "";
var choiceResolutions = { hand: {}, community: {} };

for (var t = 0; t < tileCount; t++) {
  var available = availableTiles[t];
  var tile = available.tile;
  var wasChoice = tile.kind === "choice";
  var letter = wasChoice ? tile.options[0] : tile.letter;
  var baseValue = wasChoice ? tile.baseValues[0] : tile.baseValue;

  if (wasChoice) {
    choiceResolutions[available.source][String(available.cardIndex)] = letter;
  }

  word = word + letter;
  tiles.push({
    letter: letter,
    baseValue: baseValue,
    multiplier: tile.multiplier || undefined,
    source: available.source,
    cardIndex: available.cardIndex,
    wasChoice: wasChoice,
  });
}

// Submit via the Convex action.
var result = action("games:submitWord", {
  gameId: game._id,
  playerId: activeRoom.playerId,
  word: word,
  tiles: tiles,
  choiceResolutions: choiceResolutions,
});

output.wordSubmission = {
  word: word,
  tilesUsed: tileCount,
  ok: result.ok || false,
  score: result.score || 0,
  forfeited: result.forfeited || false,
  message: result.message || null,
};

console.log("Submitted word: " + JSON.stringify(output.wordSubmission));
