import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  ANTE_AMOUNT,
  INITIAL_HAND_SIZE,
  createInitialGameDocument,
  createShuffledDeck,
} from "../gameState";
import { scheduleBotTurnIfNeeded, setRoomUsersActiveGameId } from "./gamesProgression";
import { AI_DEALER_PLAYER_ID, INITIAL_CHIPS } from "./gamesShared";

function buildCommunityTiles(deck: ReturnType<typeof createShuffledDeck>) {
  const communityTiles = [];
  for (let i = 0; i < 5; i++) {
    const card = deck.splice(0, 1)[0];
    if (!card) return null;
    communityTiles.push(
      card.kind === "single"
        ? { kind: "single" as const, letter: card.letter, baseValue: card.baseValue, revealed: false }
        : { kind: "choice" as const, options: card.options, baseValues: card.baseValues, revealed: false },
    );
  }
  return communityTiles;
}

async function getParticipantIds(ctx: MutationCtx, roomId: Id<"rooms">) {
  const activePlayers = await ctx.db
    .query("players")
    .withIndex("roomId_status", (q) =>
      q.eq("roomId", roomId).eq("status", "active"),
    )
    .collect();
  if (activePlayers.length < 1) return null;
  activePlayers.sort((a, b) => a.seatIndex - b.seatIndex);
  const participantIds = activePlayers.map((player) => player._id as string);
  if (participantIds.length === 1) participantIds.push(AI_DEALER_PLAYER_ID);
  return participantIds;
}

async function clearHands(ctx: MutationCtx, gameId: Id<"games">) {
  const existingHands = await ctx.db
    .query("playerHands")
    .withIndex("by_game", (q) => q.eq("gameId", gameId))
    .collect();
  for (const hand of existingHands) await ctx.db.delete(hand._id);
}

async function dealHands(
  ctx: MutationCtx,
  gameId: Id<"games">,
  participantIds: string[],
  deck: ReturnType<typeof createShuffledDeck>,
  now: number,
) {
  for (const [participantIndex, participantId] of participantIds.entries()) {
    const tiles = deck.splice(0, INITIAL_HAND_SIZE);
    if (INITIAL_CHIPS < ANTE_AMOUNT) {
      throw new ConvexError({
        code: "INSUFFICIENT_CHIPS_FOR_ANTE",
        message: `Players must have at least ${ANTE_AMOUNT} chips to play.`,
      });
    }
    const handCreatedAt = now + participantIndex;
    await ctx.db.insert("playerHands", {
      gameId,
      playerId: participantId,
      tiles,
      chips: INITIAL_CHIPS - ANTE_AMOUNT,
      betThisRound: 0,
      totalBet: ANTE_AMOUNT,
      hasActed: false,
      hasFolded: false,
      createdAt: handCreatedAt,
      updatedAt: handCreatedAt,
    });
  }
}

export async function createGameForRoomHandler(
  ctx: MutationCtx,
  args: { roomId: string; deck?: ReturnType<typeof createShuffledDeck> },
) {
  const roomId = args.roomId.trim();
  if (!roomId) {
    throw new ConvexError({ code: "INVALID_ROOM_ID", message: "Room ID is required." });
  }

  const openGame = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", roomId).eq("status", "active"),
    )
    .unique();
  if (openGame) {
    throw new ConvexError({
      code: "GAME_ALREADY_ACTIVE",
      message: "An active game already exists for this room.",
    });
  }

  const waitingGame = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", roomId).eq("status", "waiting"),
    )
    .unique();
  if (waitingGame) return waitingGame._id;

  return await ctx.db.insert("games", createInitialGameDocument(roomId, args.deck ?? []));
}

export async function startGameHandler(ctx: MutationCtx, args: { gameId: Id<"games"> }) {
  const game = await ctx.db.get(args.gameId);
  if (!game) throw new ConvexError({ code: "GAME_NOT_FOUND", message: "Game does not exist." });
  if (game.status !== "waiting") {
    throw new ConvexError({
      code: "INVALID_GAME_STATUS",
      message: "Only waiting games can be started.",
    });
  }

  const roomId = game.roomId as Id<"rooms">;
  const room = await ctx.db.get(roomId);
  if (!room) throw new ConvexError({ code: "ROOM_NOT_FOUND", message: "Room does not exist." });

  const participantIds = await getParticipantIds(ctx, room._id);
  if (!participantIds) {
    throw new ConvexError({
      code: "NOT_ENOUGH_PLAYERS",
      message: "At least 1 active player is required to start.",
    });
  }

  const deck = createShuffledDeck();
  const requiredTiles = participantIds.length * INITIAL_HAND_SIZE + 5;
  const choiceCards = deck.filter((card) => card.kind === "choice");
  console.log(`Deck generated: ${deck.length} total cards, ${choiceCards.length} choice cards`);
  if (deck.length < requiredTiles) {
    throw new ConvexError({
      code: "DECK_EXHAUSTED",
      message: "Not enough tiles in deck for initial distribution.",
    });
  }

  await clearHands(ctx, game._id);
  const communityTiles = buildCommunityTiles(deck);
  if (!communityTiles) {
    throw new ConvexError({
      code: "DECK_EXHAUSTED",
      message: "Deck ran out of cards during community tile creation.",
    });
  }

  const now = Date.now();
  const totalAnte = ANTE_AMOUNT * participantIds.length;
  await dealHands(ctx, game._id, participantIds, deck, now);
  await ctx.db.patch(game._id, {
    status: "active",
    communityTiles,
    deck,
    pot: totalAnte,
    currentBet: 0,
    currentPlayerIndex: 0,
    raisesThisRound: 0,
    updatedAt: now,
  });
  await setRoomUsersActiveGameId(ctx, room._id, String(game._id));
  await scheduleBotTurnIfNeeded(ctx, game._id);

  return {
    ok: true,
    gameId: game._id,
    status: "active" as const,
    dealtHandSize: INITIAL_HAND_SIZE,
    playersDealt: participantIds.length,
    includesAiDealer: participantIds.includes(AI_DEALER_PLAYER_ID),
  };
}

export async function internalStartGameHandler(
  ctx: MutationCtx,
  args: { gameId: Id<"games"> },
) {
  const game = await ctx.db.get(args.gameId);
  if (!game || game.status !== "waiting") {
    return { ok: false, reason: "Game not in waiting state" };
  }

  const roomId = game.roomId as Id<"rooms">;
  const room = await ctx.db.get(roomId);
  if (!room) return { ok: false, reason: "Room not found" };

  const participantIds = await getParticipantIds(ctx, room._id);
  if (!participantIds) return { ok: false, reason: "Not enough players" };

  const deck = createShuffledDeck();
  const requiredTiles = participantIds.length * INITIAL_HAND_SIZE + 5;
  if (deck.length < requiredTiles) return { ok: false, reason: "Deck exhausted" };

  await clearHands(ctx, game._id);
  const communityTiles = buildCommunityTiles(deck);
  if (!communityTiles) {
    return { ok: false, reason: "Deck exhausted during community tile creation" };
  }

  const now = Date.now();
  const totalAnte = ANTE_AMOUNT * participantIds.length;
  await dealHands(ctx, game._id, participantIds, deck, now);
  await ctx.db.patch(game._id, {
    status: "active",
    communityTiles,
    deck,
    pot: totalAnte,
    currentBet: 0,
    currentPlayerIndex: 0,
    raisesThisRound: 0,
    updatedAt: now,
  });
  await setRoomUsersActiveGameId(ctx, room._id, String(game._id));
  await scheduleBotTurnIfNeeded(ctx, game._id);

  return { ok: true };
}

export async function internalRedealGameForRoomHandler(
  ctx: MutationCtx,
  args: { roomId: Id<"rooms"> },
) {
  const room = await ctx.db.get(args.roomId);
  if (!room) return { ok: false, reason: "Room not found" };

  const activeGame = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", String(room._id)).eq("status", "active"),
    )
    .unique();
  const waitingGame = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", String(room._id)).eq("status", "waiting"),
    )
    .unique();
  const game = activeGame ?? waitingGame;
  if (!game) return { ok: false, reason: "No game found for room" };

  const participantIds = await getParticipantIds(ctx, room._id);
  if (!participantIds) return { ok: false, reason: "Not enough players" };

  const deck = createShuffledDeck();
  const requiredTiles = participantIds.length * INITIAL_HAND_SIZE + 5;
  if (deck.length < requiredTiles) return { ok: false, reason: "Deck exhausted" };

  await clearHands(ctx, game._id);
  const existingSubmissions = await ctx.db
    .query("wordSubmissions")
    .withIndex("by_game", (q) => q.eq("gameId", game._id))
    .collect();
  for (const submission of existingSubmissions) await ctx.db.delete(submission._id);

  const communityTiles = buildCommunityTiles(deck);
  if (!communityTiles) {
    return { ok: false, reason: "Deck exhausted during community tile creation" };
  }

  const now = Date.now();
  const totalAnte = ANTE_AMOUNT * participantIds.length;
  await dealHands(ctx, game._id, participantIds, deck, now);
  await ctx.db.patch(game._id, {
    stage: "preflop",
    status: "active",
    communityTiles,
    deck,
    pot: totalAnte,
    currentBet: 0,
    currentPlayerIndex: 0,
    raisesThisRound: 0,
    winnerId: undefined,
    winningWord: undefined,
    winningScore: undefined,
    winningScoreBreakdown: undefined,
    showdownStartedAt: undefined,
    updatedAt: now,
  });
  await setRoomUsersActiveGameId(ctx, room._id, String(game._id));
  await scheduleBotTurnIfNeeded(ctx, game._id);

  return {
    ok: true,
    gameId: game._id,
    playersDealt: participantIds.length,
    includesAiDealer: participantIds.includes(AI_DEALER_PLAYER_ID),
  };
}
