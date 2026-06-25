// ============================================================================
// Settlement context builder
// ----------------------------------------------------------------------------
// Extracts all game/room/player/hand/submission data needed by settlement
// rules into a single SettlementContext. Called once at the start of
// settlement so every rule receives the same pre-built data.
// ============================================================================

import { ConvexError } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { getRoomEconomyMode } from "../../gameConfig";
import { INITIAL_CHIPS, AI_DEALER_PLAYER_ID, DEV_BOT_AUTH_PREFIX } from "../gamesShared";
import {
  findEligibleWinnerIds,
  splitPotBySeatOrder,
  buildPayouts,
  type PayoutEntry,
} from "../gamesSettlement";
import type { SettlementContext } from "./types";

// ---------------------------------------------------------------------------
// Bot detection (kept here — the single place for these checks)
// ---------------------------------------------------------------------------

function isBotAuthUserId(authUserId: string): boolean {
  return authUserId.startsWith(DEV_BOT_AUTH_PREFIX);
}

function isBotPlayerId(playerId: string): boolean {
  return playerId === AI_DEALER_PLAYER_ID;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export async function buildSettlementContext(
  ctx: MutationCtx,
  gameId: Id<"games">,
  foldWin: boolean,
): Promise<SettlementContext> {
  const game = await ctx.db.get(gameId);
  if (!game) {
    throw new ConvexError({
      code: "GAME_NOT_FOUND",
      message: "Game does not exist.",
    });
  }

  const room = await ctx.db.get(game.roomId as Id<"rooms">);
  const economyMode = room ? getRoomEconomyMode(room) : null;
  const isBalanceGame = economyMode === "balance";

  // Load hands, players, submissions in parallel conceptually (Convex
  // serialises mutations, but explicit fetches are cleanest).
  const hands = await ctx.db
    .query("playerHands")
    .withIndex("by_game", (q) => q.eq("gameId", game._id))
    .collect();

  const players = await ctx.db
    .query("players")
    .withIndex("roomId", (q) =>
      q.eq("roomId", game.roomId as Id<"rooms">),
    )
    .collect();

  const submissions = await ctx.db
    .query("wordSubmissions")
    .withIndex("by_game", (q) => q.eq("gameId", game._id))
    .collect();

  // --- Build lookup maps ---

  const playerById = new Map<string, Doc<"players">>();
  for (const player of players) {
    playerById.set(String(player._id), player);
  }

  const seatIndexByPlayerId = new Map<string, number>();
  for (const hand of hands) {
    const player = playerById.get(hand.playerId);
    seatIndexByPlayerId.set(
      hand.playerId,
      player?.seatIndex ?? Number.MAX_SAFE_INTEGER,
    );
  }

  const eligiblePlayerIds = new Set(
    hands.filter((h) => !h.hasFolded).map((h) => h.playerId),
  );

  // --- Compute winners and pot shares ---

  let tiedWinnerIds: string[] = [];
  if (game.winnerId) {
    const rankedSubmissions = submissions.map((s) => ({
      playerId: s.playerId,
      score: s.score,
      word: s.word,
      tiles: s.tiles,
      createdAt: s.createdAt,
    }));

    tiedWinnerIds = findEligibleWinnerIds(
      rankedSubmissions,
      game.winnerId,
      eligiblePlayerIds,
    );
  }

  let potShares: Map<string, number>;
  if (tiedWinnerIds.length > 0) {
    potShares = splitPotBySeatOrder(game.pot, tiedWinnerIds, seatIndexByPlayerId);
  } else if (game.winnerId && eligiblePlayerIds.has(game.winnerId)) {
    potShares = new Map([[game.winnerId, game.pot]]);
  } else {
    // No eligible winner: split the unresolved pot among all humans.
    const humanPlayerIds = hands
      .filter((h) => {
        if (isBotPlayerId(h.playerId)) return false;
        const player = playerById.get(h.playerId);
        if (!player) return false;
        return !isBotAuthUserId(player.authUserId);
      })
      .map((h) => h.playerId);
    potShares = splitPotBySeatOrder(game.pot, humanPlayerIds, seatIndexByPlayerId);
  }

  // --- Build payout entries ---

  const payouts: PayoutEntry[] = buildPayouts({
    hands: hands.map((h) => ({
      playerId: h.playerId,
      chips: h.chips,
      hasFolded: h.hasFolded,
    })),
    playerById: playerById as Map<string, { authUserId: string; seatIndex: number }>,
    potShares,
  });

  // --- Collect winner IDs ---

  const allWinnerIds = [
    ...new Set([
      ...(game.winnerId ? [game.winnerId] : []),
      ...tiedWinnerIds,
    ]),
  ];

  const startingChips = isBalanceGame && room?.buyIn ? room.buyIn : INITIAL_CHIPS;

  return {
    game,
    room,
    economyMode,
    isBalanceGame,
    foldWin,
    hands,
    players,
    submissions,
    playerById,
    seatIndexByPlayerId,
    eligiblePlayerIds,
    winnerIds: tiedWinnerIds.length > 0 ? tiedWinnerIds : (game.winnerId ? [game.winnerId] : []),
    allWinnerIds,
    winningScore: game.winningScore ?? null,
    winningWord: game.winningWord ?? null,
    potShares,
    payouts,
    startingChips,
  };
}
