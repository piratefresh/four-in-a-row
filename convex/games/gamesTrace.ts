/**
 * Shared trace utilities for betting and showdown.
 *
 * Provides a unified getTracePlayerInfo that replaces the near-duplicate
 * versions previously in gamesBetting.ts and gamesShowdown.ts, along with
 * trace insertion helpers for game actions and completion events.
 */

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { ResolvedGameConfig } from "../gameConfig";
import { getBotCharacterForAuthUserId } from "../aiStrategy";
import { AI_DEALER_PLAYER_ID, DEV_BOT_AUTH_PREFIX } from "./gamesShared";

export interface TracePlayerInfo {
  playerName: string;
  isBot: boolean;
  characterId: string | undefined;
  /** Whether the player's room matches the game's room. Always true for AI_DEALER. */
  roomMatches: boolean;
}

/**
 * Resolve trace metadata for a player in a game.
 *
 * Unified replacement for the separate getTracePlayerInfo (betting) and
 * getShowdownTracePlayer (showdown) implementations. Always returns the
 * full shape — callers pick what they need.
 */
export async function getTracePlayerInfo(
  ctx: MutationCtx,
  game: Doc<"games">,
  playerId: string,
): Promise<TracePlayerInfo> {
  if (playerId === AI_DEALER_PLAYER_ID) {
    return { playerName: "AI Dealer", isBot: true, characterId: undefined, roomMatches: true };
  }

  const normalizedPlayerId = ctx.db.normalizeId("players", playerId);
  if (!normalizedPlayerId) {
    return { playerName: playerId, isBot: false, characterId: undefined, roomMatches: false };
  }

  const player = await ctx.db.get(normalizedPlayerId);
  const character = getBotCharacterForAuthUserId(player?.authUserId ?? "");
  const roomMatches = !!player && player.roomId === game.roomId;
  const isBot = roomMatches && player.authUserId.startsWith(DEV_BOT_AUTH_PREFIX);

  return {
    playerName: character?.name ?? player?.name ?? playerId,
    isBot,
    characterId: character?.id,
    roomMatches,
  };
}

export async function insertGameActionTrace(
  ctx: MutationCtx,
  args: {
    game: Doc<"games">;
    playerId: string;
    action: string;
    potBefore: number;
    potAfter: number;
    chipsBefore: number;
    chipsAfter: number;
    raiseAmount?: number;
  },
): Promise<void> {
  const player = await getTracePlayerInfo(ctx, args.game, args.playerId);
  await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
    gameId: args.game._id,
    roomId: args.game.roomId as Id<"rooms">,
    category: "game_action",
    playerId: args.playerId,
    playerName: player.playerName,
    characterId: player.characterId,
    isBot: player.isBot,
    action: args.action,
    stage: args.game.stage,
    potBefore: args.potBefore,
    potAfter: args.potAfter,
    chipsBefore: args.chipsBefore,
    chipsAfter: args.chipsAfter,
    raiseAmount: args.raiseAmount,
  });
}

export async function insertGameCompleteTrace(
  ctx: MutationCtx,
  game: Doc<"games">,
  args: {
    winnerId?: string;
    winnerWord?: string;
    winnerScore?: number;
    reason: string;
  },
): Promise<void> {
  await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
    gameId: game._id,
    roomId: game.roomId as Id<"rooms">,
    category: "game_complete",
    stage: "showdown",
    winnerId: args.winnerId,
    winnerWord: args.winnerWord,
    winnerScore: args.winnerScore,
    metadata: { reason: args.reason },
  });
}
