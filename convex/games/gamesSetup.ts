import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  INITIAL_HAND_SIZE,
  COMMUNITY_TILE_COUNT,
  MIN_COMMUNITY_CHOICE_TILE_COUNT,
  MAX_COMMUNITY_CHOICE_TILE_COUNT,
  PREFERRED_PRIVATE_CHOICE_TILE_COUNT,
  createInitialGameDocument,
  createShuffledDeck,
  type GameDeckTile,
  type GameTile,
} from "../gameState";
import { resolveConfig, getRoomEconomyMode, type ResolvedGameConfig } from "../gameConfig";
import { FIRST_BOT_GAME_TUTORIAL_ID } from "../rooms/helpers";
import { createTutorialDeal } from "../tutorialDeck";
import { recordGameStart } from "../activityFeed";
import { scheduleBotTurnIfNeeded, markGameActiveForParticipants } from "./gamesProgression";
import {
  AI_DEALER_PLAYER_ID,
  DEV_BOT_AUTH_PREFIX,
  getClearedTurnClockFields,
  getNewTurnStateFields,
} from "./gamesShared";

function randomIndex(maxExclusive: number) {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % maxExclusive;
}

function drawMatchingTiles(
  deck: GameDeckTile[],
  count: number,
  predicate: (tile: GameDeckTile) => boolean,
) {
  const drawn: GameDeckTile[] = [];
  let index = 0;

  while (index < deck.length && drawn.length < count) {
    const tile = deck[index];
    if (!tile) {
      break;
    }
    if (predicate(tile)) {
      drawn.push(tile);
      deck.splice(index, 1);
      continue;
    }
    index += 1;
  }

  return drawn;
}

function shuffleTiles<T>(tiles: T[]) {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const swapIndex = randomIndex(i + 1);
    [shuffled[i], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[i]];
  }
  return shuffled;
}

function toCommunityTile(tile: GameDeckTile): GameTile {
  return tile.kind === "single"
    ? {
        kind: "single",
        letter: tile.letter,
        baseValue: tile.baseValue,
        multiplier: tile.multiplier,
        revealed: false,
      }
    : {
        kind: "choice",
        options: tile.options,
        baseValues: tile.baseValues,
        multiplier: tile.multiplier,
        revealed: false,
      };
}

function hideCommunityTiles(communityTiles: GameTile[]) {
  return communityTiles.map((tile) => ({ ...tile, revealed: false }));
}

export function createChoiceTileDeal(
  sourceDeck: GameDeckTile[],
  participantCount: number,
  config = resolveConfig(),
) {
  if (participantCount <= 0) {
    throw new ConvexError({
      code: "NOT_ENOUGH_PLAYERS",
      message: "At least one participant is required to deal a round.",
    });
  }

  const deck = [...sourceDeck];
  const totalTilesNeeded =
    participantCount * INITIAL_HAND_SIZE + COMMUNITY_TILE_COUNT;
  if (deck.length < totalTilesNeeded) {
    throw new ConvexError({
      code: "DECK_EXHAUSTED",
      message: "Not enough tiles in deck for initial distribution.",
    });
  }

  const availableChoiceTiles = deck.filter((tile) => tile.kind === "choice").length;
  const availableSingleTiles = deck.length - availableChoiceTiles;
  const privateChoiceTileCount =
    config.choiceTileFrequency === "low" ? 0 : PREFERRED_PRIVATE_CHOICE_TILE_COUNT;
  const minCommunityChoiceTileCount =
    config.choiceTileFrequency === "low" ? 0 : MIN_COMMUNITY_CHOICE_TILE_COUNT;
  const maxCommunityChoiceTileCount =
    config.choiceTileFrequency === "low" ? 1 : MAX_COMMUNITY_CHOICE_TILE_COUNT;
  const minChoiceTilesNeeded =
    participantCount * privateChoiceTileCount +
    minCommunityChoiceTileCount;

  if (availableChoiceTiles < minChoiceTilesNeeded) {
    throw new ConvexError({
      code: "DECK_CHOICE_TILE_SHORTAGE",
      message: "Not enough two-letter choice tiles to build a valid round.",
    });
  }

  const maxCommunityChoiceTiles = Math.min(
    maxCommunityChoiceTileCount,
    availableChoiceTiles -
      participantCount * privateChoiceTileCount,
  );
  const communityChoiceTileCount =
    maxCommunityChoiceTiles <= minCommunityChoiceTileCount
      ? minCommunityChoiceTileCount
      : minCommunityChoiceTileCount +
        randomIndex(
          maxCommunityChoiceTiles -
            minCommunityChoiceTileCount +
            1,
        );
  const totalChoiceTilesNeeded =
    participantCount * privateChoiceTileCount +
    communityChoiceTileCount;
  const totalSingleTilesNeeded = totalTilesNeeded - totalChoiceTilesNeeded;

  if (availableSingleTiles < totalSingleTilesNeeded) {
    throw new ConvexError({
      code: "DECK_SINGLE_TILE_SHORTAGE",
      message: "Not enough single-letter tiles to satisfy the round distribution.",
    });
  }

  const hands: GameDeckTile[][] = Array.from(
    { length: participantCount },
    () => [],
  );

  for (let participantIndex = 0; participantIndex < participantCount; participantIndex += 1) {
    hands[participantIndex]!.push(
      ...drawMatchingTiles(
        deck,
        privateChoiceTileCount,
        (tile) => tile.kind === "choice",
      ),
    );
    hands[participantIndex]!.push(
      ...drawMatchingTiles(
        deck,
        INITIAL_HAND_SIZE - privateChoiceTileCount,
        (tile) => tile.kind === "single",
      ),
    );

    if (hands[participantIndex]!.length !== INITIAL_HAND_SIZE) {
      throw new ConvexError({
        code: "INVALID_HAND_DEAL",
        message: "Player hand could not be dealt correctly.",
      });
    }

    hands[participantIndex] = shuffleTiles(hands[participantIndex]!);
  }

  const communityChoiceTiles = drawMatchingTiles(
    deck,
    communityChoiceTileCount,
    (tile) => tile.kind === "choice",
  );
  const communitySingleTiles = drawMatchingTiles(
    deck,
    COMMUNITY_TILE_COUNT - communityChoiceTileCount,
    (tile) => tile.kind === "single",
  );
  const communityTiles = shuffleTiles([
    ...communityChoiceTiles,
    ...communitySingleTiles,
  ]).map(toCommunityTile);

  if (communityTiles.length !== COMMUNITY_TILE_COUNT) {
    throw new ConvexError({
      code: "INVALID_COMMUNITY_DEAL",
      message: "Community tiles could not be dealt correctly.",
    });
  }

  return {
    hands,
    communityTiles,
    deck,
    communityChoiceTileCount,
    handChoiceTileCounts: hands.map(
      (hand) => hand.filter((tile) => tile.kind === "choice").length,
    ),
  };
}

async function clearHands(ctx: MutationCtx, gameId: Id<"games">) {
  const existingHands = await ctx.db
    .query("playerHands")
    .withIndex("by_game", (q) => q.eq("gameId", gameId))
    .collect();
  for (const hand of existingHands) await ctx.db.delete(hand._id);
}

function assertMinimumPlayersToStart(participantIds: string[]) {
  if (participantIds.length < 2) {
    throw new ConvexError({
      code: "NOT_ENOUGH_PLAYERS",
      message: "At least 2 active players are required to start.",
    });
  }
}

async function getActiveRoomPlayers(ctx: MutationCtx, roomId: Id<"rooms">) {
  const players = await ctx.db
    .query("players")
    .withIndex("roomId_status", (q) =>
      q.eq("roomId", roomId).eq("status", "active"),
    )
    .collect();
  players.sort((a, b) => a.seatIndex - b.seatIndex);
  return players;
}

function buildParticipantIds(activePlayers: Doc<"players">[]) {
  const participantIds = activePlayers.map((player) => player._id as string);

  if (participantIds.length === 1) {
    const hasExistingBots = activePlayers.some((player) =>
      player.authUserId?.startsWith(DEV_BOT_AUTH_PREFIX),
    );
    if (hasExistingBots) {
      participantIds.push(AI_DEALER_PLAYER_ID);
    }
  }

  return participantIds;
}

function getHumanPlayers(activePlayers: Doc<"players">[]): Doc<"players">[] {
  return activePlayers.filter(
    (p) => !p.authUserId?.startsWith(DEV_BOT_AUTH_PREFIX),
  );
}

/**
 * Validation-only check that the room's active players are eligible to start
 * a balance game. Performs NO wallet writes. Runs before any buy-in debit so
 * a validation failure leaves every wallet unchanged.
 *
 * `currentGameId` is defensively allowed: if a player's `activeGameId`
 * happens to point at the game being started (e.g. from a previous
 * partial-failure attempt), the unsettled-game check treats that as
 * non-blocking rather than self-blocking the start.
 */
export async function assertPlayersCanStartBalanceGame(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  activePlayers: Doc<"players">[],
  currentGameId?: Id<"games">,
): Promise<void> {
  if (getRoomEconomyMode(room) !== "balance" || !room.buyIn) return;

  const humanPlayers = getHumanPlayers(activePlayers);

  // Guests cannot participate in balance games.
  for (const player of humanPlayers) {
    if (!player.authUserId) {
      throw new ConvexError({
        code: "GUEST_BALANCE_GAME",
        message: "Guests cannot participate in balance games.",
      });
    }
  }

  // Unsettled-game check: no human may start a new balance game while their
  // `activeGameId` references an active, unsettled hand. The current game
  // being started is defensively allowed.
  await ensureNoUnsettledGames(ctx, humanPlayers, currentGameId);

  // Sufficient-funds is enforced at buy-in time (on join), not here — chips
  // now live on the seat's persistent table stack, not the wallet.
}

function resolveGameConfig(room: Doc<"rooms">): ResolvedGameConfig {
  const config = resolveConfig(room.config);
  if (getRoomEconomyMode(room) === "balance" && room.buyIn) {
    return { ...config, startingChips: room.buyIn };
  }
  return config;
}

async function ensureNoUnsettledGames(
  ctx: MutationCtx,
  humanPlayers: Doc<"players">[],
  currentGameId?: Id<"games">,
) {
  for (const player of humanPlayers) {
    const normalizedUserId = ctx.db.normalizeId("user", player.authUserId);
    if (!normalizedUserId) continue;
    const userDoc = await ctx.db.get(normalizedUserId);
    if (!userDoc?.activeGameId) continue;
    // Defensively allow the game being started: a stale `activeGameId`
    // pointing at `currentGameId` (e.g. from a previous partial-failure
    // attempt) must not self-block the start.
    if (currentGameId && userDoc.activeGameId === String(currentGameId)) continue;
    const activeGame = await ctx.db.get(userDoc.activeGameId as Id<"games">);
    if (!activeGame) continue;
    if (
      activeGame.status !== "completed" ||
      activeGame.settlementState !== "settled"
    ) {
      throw new ConvexError({
        code: "UNSETTLED_GAME",
        message: `${player.name} has an unsettled game. Complete it before starting a new one.`,
      });
    }
  }
}

/**
 * Rotate the dealer button to the next occupied seat *clockwise* from the
 * previous hand's dealer, tied to seat identity rather than list position
 * (table-stakes epic M1). Index-based rotation is wrong the moment eligibility
 * changes — e.g. dealer at seat 1 of [0,1,2], seat 0 busts to [1,2], and
 * `(1+1)%2 = 0` would hand seat 1 the button twice.
 *
 * The previous dealer's seat is read from the persisted `dealerSeatIndex` on
 * the last completed game — NOT reconstructed from player records, which are
 * mutable (a player can rejoin into a different seat, which would corrupt any
 * identity-based lookup). We then pick the first current participant seated
 * strictly after that seat, wrapping to the lowest seat.
 *
 * `participantIds` must be in ascending seat order (as built for the hand).
 * The first hand of a room (or any completed game predating `dealerSeatIndex`)
 * starts the button at index 0.
 */
async function getNextDealerButtonIndex(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  participantIds: string[],
  seatIndexByParticipant: Map<string, number>,
): Promise<number> {
  if (participantIds.length === 0) return 0;

  const lastCompleted = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", String(roomId)).eq("status", "completed"),
    )
    .order("desc")
    .first();
  const previousDealerSeatIndex = lastCompleted?.dealerSeatIndex;
  if (previousDealerSeatIndex === undefined || previousDealerSeatIndex === null) {
    return 0;
  }

  // First current participant seated strictly after the previous dealer's
  // seat; wrap to the lowest seat (index 0) if none sit after it.
  const nextIndex = participantIds.findIndex(
    (id) =>
      (seatIndexByParticipant.get(id) ?? Number.MAX_SAFE_INTEGER) >
      previousDealerSeatIndex,
  );
  return nextIndex === -1 ? 0 : nextIndex;
}

async function dealHands(
  ctx: MutationCtx,
  gameId: Id<"games">,
  participantIds: string[],
  hands: GameDeckTile[][],
  now: number,
  config: ResolvedGameConfig,
  startingChipsByParticipant: Map<string, number>,
) {
  for (const [participantIndex, participantId] of participantIds.entries()) {
    const tiles = hands[participantIndex];
    if (!tiles || tiles.length !== config.initialHandSize) {
      throw new ConvexError({
        code: "INVALID_HAND_DEAL",
        message: "Player hand could not be dealt correctly.",
      });
    }

    // In the seat-lifecycle economy, a hand is dealt from the seat's persistent
    // table stack. Non-balance / tutorial seats fall back to config chips.
    const chips =
      startingChipsByParticipant.get(participantId) ?? config.startingChips;

    const handCreatedAt = now + participantIndex;
    await ctx.db.insert("playerHands", {
      gameId,
      playerId: participantId,
      tiles,
      chips,
      betThisRound: 0,
      totalBet: 0,
      hasActed: false,
      hasFolded: false,
      lastAction: undefined,
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

  const normalizedRoomId = ctx.db.normalizeId("rooms", roomId);
  if (!normalizedRoomId) {
    throw new ConvexError({
      code: "INVALID_ROOM_ID",
      message: "Room ID is invalid.",
    });
  }

  const room = await ctx.db.get(normalizedRoomId);
  if (!room) {
    throw new ConvexError({
      code: "ROOM_NOT_FOUND",
      message: "Room does not exist.",
    });
  }

  return await ctx.db.insert(
    "games",
    createInitialGameDocument(roomId, args.deck ?? [], resolveConfig(room.config)),
  );
}

export type OrchestrateGameStartResult = {
  ok: true;
  gameId: Id<"games">;
  status: "active";
  dealtHandSize: number;
  playersDealt: number;
  includesAiDealer: boolean;
};

/**
 * Shared orchestration for starting a waiting game. Both the public
 * `startGame` mutation and the `internalStartGame` mutation call this
 * function so they cannot diverge.
 *
 * Ordering (per STO-233):
 *   1. `assertPlayersCanStartBalanceGame` — validation only, no writes.
 *      Runs the unsettled-game and sufficient-funds checks before any
 *      wallet is debited, so a validation failure leaves every wallet
 *      unchanged.
 *   2. `reserveBalanceGameBuyIns` — debit buy-ins.
 *   3. Deal hands + activate the game.
 *   4. `markGameActiveForParticipants` — set `activeGameId` only after
 *      buy-ins, hand creation, and game activation succeed.
 *   5. Schedule bot turns + record the game start.
 */
async function orchestrateGameStart(
  ctx: MutationCtx,
  game: Doc<"games">,
  room: Doc<"rooms">,
  options: { source: "public" | "internal" },
): Promise<OrchestrateGameStartResult> {
  const config = resolveGameConfig(room);
  const isBalance = getRoomEconomyMode(room) === "balance";

  const activePlayers = await getActiveRoomPlayers(ctx, room._id);
  if (activePlayers.length < 1) {
    throw new ConvexError({
      code: "NOT_ENOUGH_PLAYERS",
      message: "At least 1 active player is required to start.",
    });
  }

  // Balance tables only deal seats that still have chips. Busted seats stay
  // seated but sit out until they rebuy or leave (table-stakes epic M1).
  const eligiblePlayers = isBalance
    ? activePlayers.filter((player) => (player.tableStack ?? 0) > 0)
    : activePlayers;

  // Distinguish "not enough occupied seats" from "enough seats, but too many
  // are busted and must re-buy" (table-stakes epic M1.4) so the UI can prompt a
  // re-buy instead of a dead "waiting for players".
  if (isBalance && eligiblePlayers.length < 2 && activePlayers.length >= 2) {
    throw new ConvexError({
      code: "REBUY_REQUIRED",
      message: "Not enough players have chips. Out-of-chips players must re-buy.",
    });
  }

  const participantIds = buildParticipantIds(eligiblePlayers);
  assertMinimumPlayersToStart(participantIds);

  // 1. Validation (no writes). Buy-ins were charged on join, so this only
  //    enforces the guest and unsettled-game rules for balance tables.
  await assertPlayersCanStartBalanceGame(ctx, room, eligiblePlayers, game._id);

  // Seat index per participant, used for seat-tied dealer rotation. The AI
  // dealer has no seat, so it sorts last.
  const seatIndexByParticipant = new Map<string, number>();
  for (const player of eligiblePlayers) {
    seatIndexByParticipant.set(String(player._id), player.seatIndex);
  }
  if (participantIds.includes(AI_DEALER_PLAYER_ID)) {
    seatIndexByParticipant.set(AI_DEALER_PLAYER_ID, Number.MAX_SAFE_INTEGER);
  }

  // Starting chips per participant: balance deals each seat's persistent table
  // stack; the AI dealer (no seat) and non-balance seats use config chips.
  const startingChipsByParticipant = new Map<string, number>();
  if (isBalance) {
    for (const player of eligiblePlayers) {
      startingChipsByParticipant.set(String(player._id), player.tableStack ?? 0);
    }
    if (participantIds.includes(AI_DEALER_PLAYER_ID)) {
      startingChipsByParticipant.set(
        AI_DEALER_PLAYER_ID,
        room.buyIn ?? config.startingChips,
      );
    }
  }

  const isTutorial = room.tutorialId === FIRST_BOT_GAME_TUTORIAL_ID;
  const deck = isTutorial ? [] : createShuffledDeck();
  if (!isTutorial && options.source === "public") {
    const choiceCards = deck.filter((card) => card.kind === "choice");
    console.log(`Deck generated: ${deck.length} total cards, ${choiceCards.length} choice cards`);
  }

  await clearHands(ctx, game._id);
  const roundDeal = isTutorial
    ? createTutorialDeal(participantIds.length, config)
    : createChoiceTileDeal(deck, participantIds.length, config);

  const now = Date.now();

  const dealerButtonIndex = await getNextDealerButtonIndex(
    ctx,
    room._id,
    participantIds,
    seatIndexByParticipant,
  );
  const firstActionIndex = (dealerButtonIndex + 1) % participantIds.length;
  // Persist the dealer's seat identity so the next hand rotates by seat, not by
  // a (mutable) player record. Seatless AI dealer stores a MAX sentinel.
  const dealerSeatIndex =
    seatIndexByParticipant.get(participantIds[dealerButtonIndex]!) ??
    Number.MAX_SAFE_INTEGER;
  const openingCommunityTiles = hideCommunityTiles(roundDeal.communityTiles);

  // 3. Deal hands + activate.
  await dealHands(
    ctx,
    game._id,
    participantIds,
    roundDeal.hands,
    now,
    config,
    startingChipsByParticipant,
  );
  await ctx.db.patch(game._id, {
    status: "active",
    stage: "preflop",
    communityTiles: openingCommunityTiles,
    deck: roundDeal.deck,
    pot: 0,
    currentBet: 0,
    currentPlayerIndex: firstActionIndex,
    dealerButtonIndex,
    dealerSeatIndex,
    smallBlindIndex: undefined,
    bigBlindIndex: undefined,
    raisesThisRound: 0,
    config,
    ...getNewTurnStateFields(now),
    updatedAt: now,
  });
  await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
    gameId: game._id,
    roomId: room._id,
    category: "game_start",
    stage: "preflop",
    tilesRevealed: openingCommunityTiles
      .filter((tile) => tile.revealed)
      .map((tile) => tile.kind === "single" ? tile.letter : `[${tile.options.join("/")}]`)
      .join(" "),
    potAfter: 0,
    metadata: {
      participantIds,
      playersDealt: participantIds.length,
      dealerButtonIndex,
      communityChoiceTileCount: roundDeal.communityChoiceTileCount,
      handChoiceTileCounts: roundDeal.handChoiceTileCounts,
      source: options.source,
    },
  });

  // 4. Mark active only after buy-ins, hand creation, and activation succeed.
  await markGameActiveForParticipants(ctx, room._id, game._id);

  // 5. Schedule bot turns + record start.
  await scheduleBotTurnIfNeeded(ctx, game._id);
  await recordGameStart(ctx, game._id);

  return {
    ok: true,
    gameId: game._id,
    status: "active",
    dealtHandSize: config.initialHandSize,
    playersDealt: participantIds.length,
    includesAiDealer: participantIds.includes(AI_DEALER_PLAYER_ID),
  };
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

  return await orchestrateGameStart(ctx, game, room, { source: "public" });
}

export async function internalStartGameHandler(
  ctx: MutationCtx,
  args: { gameId: Id<"games"> },
) {
  const game = await ctx.db.get(args.gameId);
  if (!game || game.status !== "waiting") {
    return { ok: false as const, reason: "Game not in waiting state" };
  }

  const roomId = game.roomId as Id<"rooms">;
  const room = await ctx.db.get(roomId);
  if (!room) return { ok: false as const, reason: "Room not found" };

  try {
    const result = await orchestrateGameStart(ctx, game, room, { source: "internal" });
    return { ok: true as const, gameId: result.gameId, status: result.status };
  } catch (error) {
    // Preserve ConvexError throws (INSUFFICIENT_FUNDS, UNSETTLED_GAME, etc.)
    // so the scheduler sees the same failure modes as the public path.
    const code = (error as { data?: { code?: string } })?.data?.code;
    if (code) throw error;
    return { ok: false as const, reason: "Start failed" };
  }
}

export async function internalRedealGameForRoomHandler(
  ctx: MutationCtx,
  args: { roomId: Id<"rooms"> },
) {
  const room = await ctx.db.get(args.roomId);
  if (!room) return { ok: false, reason: "Room not found" };

  const waitingGame = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", String(room._id)).eq("status", "waiting"),
    )
    .unique();
  if (waitingGame) {
    return {
      ok: true,
      gameId: waitingGame._id,
      status: "waiting" as const,
    };
  }

  const activeGame = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", String(room._id)).eq("status", "active"),
    )
    .unique();
  if (activeGame) return { ok: false, reason: "Game already active" };

  const completedGame = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", String(room._id)).eq("status", "completed"),
    )
    .order("desc")
    .first();
  if (!completedGame) return { ok: false, reason: "No completed game found for room" };

  const now = Date.now();

  const nextGameId = await ctx.db.insert(
    "games",
    createInitialGameDocument(
      String(room._id),
      [],
      resolveConfig(room.config),
    ),
  );

  // Reset all player ready status for the newly-created next hand.
  const players = await ctx.db
    .query("players")
    .withIndex("roomId_status", (q) =>
      q.eq("roomId", room._id).eq("status", "active"),
    )
    .collect();
  for (const player of players) {
    await ctx.db.patch(player._id, { readyStatus: false });
  }

  await ctx.db.patch(room._id, { lastActiveAt: now });

  return {
    ok: true,
    gameId: nextGameId,
    status: "waiting" as const,
  };
}

export async function resetTutorialGameForRoomHandler(
  ctx: MutationCtx,
  args: { roomId: Id<"rooms"> },
) {
  const room = await ctx.db.get(args.roomId);
  if (!room) {
    throw new ConvexError({
      code: "ROOM_NOT_FOUND",
      message: "Room does not exist.",
    });
  }

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
  const latestCompletedGame = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", String(room._id)).eq("status", "completed"),
    )
    .order("desc")
    .first();

  let game = activeGame ?? waitingGame ?? latestCompletedGame ?? null;
  if (!game) {
    const gameId = await createGameForRoomHandler(ctx, { roomId: String(room._id) });
    game = await ctx.db.get(gameId);
  }

  if (!game) {
    throw new ConvexError({
      code: "GAME_NOT_FOUND",
      message: "Tutorial game could not be prepared.",
    });
  }

  const now = Date.now();

  await clearHands(ctx, game._id);
  const existingSubmissions = await ctx.db
    .query("wordSubmissions")
    .withIndex("by_game", (q) => q.eq("gameId", game._id))
    .collect();
  for (const submission of existingSubmissions) {
    await ctx.db.delete(submission._id);
  }

  await ctx.db.patch(game._id, {
    stage: "preflop",
    status: "waiting",
    communityTiles: [],
    deck: [],
    pot: 0,
    currentBet: 0,
    currentPlayerIndex: 0,
    dealerButtonIndex: 0,
    smallBlindIndex: undefined,
    bigBlindIndex: undefined,
    raisesThisRound: 0,
    winnerId: undefined,
    winningWord: undefined,
    winningScore: undefined,
    winningScoreBreakdown: undefined,
    showdownStartedAt: undefined,
    turnStartedAt: undefined,
    ...getClearedTurnClockFields(),
    updatedAt: now,
  });

  const activePlayers = await ctx.db
    .query("players")
    .withIndex("roomId_status", (q) =>
      q.eq("roomId", room._id).eq("status", "active"),
    )
    .collect();

  for (const player of activePlayers) {
    await ctx.db.patch(player._id, {
      readyStatus: player.authUserId?.startsWith("dev-bot:") ?? false,
    });
  }

  return {
    ok: true,
    gameId: game._id,
    status: "waiting" as const,
  };
}

export async function redealGameForRoomHandler(
  ctx: MutationCtx,
  args: { roomId: string },
) {
  const roomId = args.roomId.trim() as Id<"rooms">;
  if (!roomId) {
    throw new ConvexError({
      code: "INVALID_ROOM_ID",
      message: "Room ID is required.",
    });
  }

  return await internalRedealGameForRoomHandler(ctx, { roomId });
}
