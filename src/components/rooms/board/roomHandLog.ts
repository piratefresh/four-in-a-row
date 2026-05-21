import type {
  PlayerHand,
  RoomGameTableProps,
  RoomHandLogEntry,
  Tile,
} from "./RoomGameTable.types";

type BuildRoomHandLogArgs = {
  gameStage: RoomGameTableProps["gameStage"];
  communityTiles: Tile[];
  hands: PlayerHand[];
  currentTurnPlayerId?: string | null;
  dealerButtonIndex?: number;
  smallBlindIndex?: number;
  bigBlindIndex?: number;
  pot?: number;
  builtWord?: string;
  currentRackScore?: number | null;
  getPlayerName: (playerId: string) => string;
};

function formatStageName(stage: RoomGameTableProps["gameStage"]) {
  switch (stage) {
    case "preflop":
      return "Pre-flop";
    case "flop":
      return "Flop";
    case "turn":
      return "Turn";
    case "river":
      return "River";
    case "final":
      return "Final street";
    case "showdown":
      return "Showdown";
  }
}

function formatTile(tile: Tile) {
  if (tile.kind === "choice") return tile.options.join("/");
  return tile.letter;
}

function formatAction(action: PlayerHand["lastAction"]) {
  if (action === "check") return "checked";
  if (action === "call") return "called";
  if (action === "raise") return "raised";
  if (action === "fold") return "folded";
  return null;
}

function getActionTone(action: PlayerHand["lastAction"]): RoomHandLogEntry["tone"] {
  if (action === "raise") return "raise";
  if (action === "fold") return "fold";
  if (action === "call" || action === "check") return "call";
  return "play";
}

export function buildRoomHandLog({
  gameStage,
  communityTiles,
  hands,
  currentTurnPlayerId,
  dealerButtonIndex,
  smallBlindIndex,
  bigBlindIndex,
  pot = 0,
  builtWord,
  currentRackScore,
  getPlayerName,
}: BuildRoomHandLogArgs): RoomHandLogEntry[] {
  const entries: RoomHandLogEntry[] = [
    {
      id: "stage",
      message: `${formatStageName(gameStage)} / ${hands.length} seats`,
      tone: gameStage === "showdown" ? "showdown" : "play",
    },
  ];

  const dealer = dealerButtonIndex != null ? hands[dealerButtonIndex] : null;
  const smallBlind = smallBlindIndex != null ? hands[smallBlindIndex] : null;
  const bigBlind = bigBlindIndex != null ? hands[bigBlindIndex] : null;

  if (dealer) {
    entries.push({
      id: "dealer",
      message: `${getPlayerName(dealer.playerId)} has the dealer button`,
      tone: "play",
    });
  }

  if (smallBlind) {
    entries.push({
      id: "small-blind",
      message: `${getPlayerName(smallBlind.playerId)} posted small blind`,
      tone: "call",
    });
  }

  if (bigBlind) {
    entries.push({
      id: "big-blind",
      message: `${getPlayerName(bigBlind.playerId)} posted big blind`,
      tone: "call",
    });
  }

  const revealedCommunity = communityTiles.filter(
    (tile) => tile.revealed !== false,
  );

  if (revealedCommunity.length > 0) {
    entries.push({
      id: "community",
      message: `${revealedCommunity.length} community letters / ${revealedCommunity.map(formatTile).join(" / ")}`,
      tone: "pot",
    });
  }

  for (const hand of hands) {
    const playerName = getPlayerName(hand.playerId);
    if (hand.hasFolded) {
      entries.push({
        id: `folded-${hand.playerId}`,
        message: `${playerName} folded`,
        tone: "fold",
      });
      continue;
    }

    const action = formatAction(hand.lastAction);
    if (action) {
      const amount = hand.betThisRound ? ` $${hand.betThisRound}` : "";
      entries.push({
        id: `action-${hand.playerId}`,
        message: `${playerName} ${action}${amount}`,
        tone: getActionTone(hand.lastAction),
      });
    }
  }

  const currentTurnHand = hands.find(
    (hand) => hand.playerId === currentTurnPlayerId,
  );
  if (currentTurnHand && !currentTurnHand.hasFolded) {
    entries.push({
      id: "turn",
      message: `${getPlayerName(currentTurnHand.playerId)} is on turn`,
      tone: "turn",
    });
  }

  if (builtWord && currentRackScore !== null && currentRackScore !== undefined) {
    entries.push({
      id: "rack",
      message: `Current rack ${builtWord} / ${currentRackScore}pts`,
      tone: "showdown",
    });
  }

  if (pot > 0) {
    entries.push({
      id: "pot",
      message: `Pot is $${pot}`,
      tone: "pot",
    });
  }

  return entries.slice(-9);
}
