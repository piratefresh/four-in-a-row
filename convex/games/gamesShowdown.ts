import { ConvexError } from "convex/values";
import { api, internal } from "../_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import type { GameTile } from "../gameState";
import { getBotCharacterForAuthUserId, getBotCharacterForSeed, isBluffLikely, shouldBelievePlayer } from "../aiStrategy";
import { calculateScore, getHighestScoringTileValue } from "./gamesScoring";

export type SubmitWordArgs = {
  gameId: Doc<"games">["_id"];
  playerId: string;
  word: string;
  tiles: Array<{
    letter: string;
    baseValue: number;
    multiplier?: "2L" | "3L";
    source: "hand" | "community";
    cardIndex?: number;
    wasChoice?: boolean;
  }>;
  choiceResolutions?: { hand?: Record<string, string>; community?: Record<string, string> };
  invalidWord?: boolean;
};

type ShowdownArgs = { gameId: Doc<"games">["_id"]; playerId: string };
type ResolveShowdownArgs = { gameId: Doc<"games">["_id"] };

function logBotShowdown(
  message: string,
  details: Record<string, unknown>,
) {
  console.log(`[bot-showdown] ${message}`, details);
}

async function getShowdownTracePlayer(
  ctx: MutationCtx,
  game: Doc<"games">,
  playerId: string,
) {
  const normalizedPlayerId = ctx.db.normalizeId("players", playerId);
  if (!normalizedPlayerId) {
    return { playerName: playerId, isBot: playerId === "ai_dealer", characterId: undefined };
  }

  const player = await ctx.db.get(normalizedPlayerId);
  const character = getBotCharacterForAuthUserId(player?.authUserId) ?? undefined;
  return {
    playerName: character?.name ?? player?.name ?? playerId,
    isBot: !!character || playerId === "ai_dealer",
    characterId: character?.id,
    roomMatches: player?.roomId === game.roomId,
  };
}

async function insertGameCompleteTrace(
  ctx: MutationCtx,
  game: Doc<"games">,
  args: {
    winnerId?: string;
    winnerWord?: string;
    winnerScore?: number;
    reason: string;
  },
) {
  await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
    gameId: game._id,
    roomId: game.roomId as Doc<"rooms">["_id"],
    category: "game_complete",
    stage: "showdown",
    winnerId: args.winnerId,
    winnerWord: args.winnerWord,
    winnerScore: args.winnerScore,
    metadata: { reason: args.reason },
  });
}

function getTileIdentityKey(
  tile:
    | { letter: string; baseValue: number; multiplier?: "2L" | "3L" }
    | { kind: "single"; letter: string; baseValue: number; multiplier?: "2L" | "3L" },
) {
  return `${tile.letter}-${tile.baseValue}-${tile.multiplier ?? "1L"}`;
}

function compareRankedSubmissions(
  left: {
    score: number;
    word: string | null;
    tiles: Array<{ baseValue: number; multiplier?: "2L" | "3L" }>;
    createdAt?: number;
    playerId: string;
  },
  right: {
    score: number;
    word: string | null;
    tiles: Array<{ baseValue: number; multiplier?: "2L" | "3L" }>;
    createdAt?: number;
    playerId: string;
  },
) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  const rightLength = right.word?.length ?? right.tiles.length;
  const leftLength = left.word?.length ?? left.tiles.length;
  if (rightLength !== leftLength) {
    return rightLength - leftLength;
  }

  const highestTileDelta =
    getHighestScoringTileValue(right.tiles) -
    getHighestScoringTileValue(left.tiles);
  if (highestTileDelta !== 0) {
    return highestTileDelta;
  }

  const leftCreatedAt = left.createdAt ?? Number.MAX_SAFE_INTEGER;
  const rightCreatedAt = right.createdAt ?? Number.MAX_SAFE_INTEGER;
  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt - rightCreatedAt;
  }

  return left.playerId.localeCompare(right.playerId);
}

function buildEmergencyBotSubmission(
  handTiles: Array<
    | { kind: "single"; letter: string; baseValue: number; multiplier?: "2L" | "3L" }
    | { kind: "choice"; options: string[]; baseValues: number[]; multiplier?: "2L" | "3L" }
  >,
  communityTiles: Array<
    | { kind: "single"; letter: string; baseValue: number; multiplier?: "2L" | "3L"; revealed: boolean }
    | { kind: "choice"; options: string[]; baseValues: number[]; multiplier?: "2L" | "3L"; revealed: boolean }
  >,
) {
  const availableTiles: SubmitWordArgs["tiles"] = [];
  const choiceResolutions: NonNullable<SubmitWordArgs["choiceResolutions"]> = {
    hand: {},
    community: {},
  };

  handTiles.forEach((tile, index) => {
    if (tile.kind === "single") {
      availableTiles.push({
        letter: tile.letter,
        baseValue: tile.baseValue,
        multiplier: tile.multiplier,
        source: "hand",
        cardIndex: index,
        wasChoice: false,
      });
      return;
    }

    availableTiles.push({
      letter: tile.options[0],
      baseValue: tile.baseValues[0],
      multiplier: tile.multiplier,
      source: "hand",
      cardIndex: index,
      wasChoice: true,
    });
    choiceResolutions.hand![index.toString()] = tile.options[0];
  });

  communityTiles
    .filter((tile) => tile.revealed)
    .forEach((tile, index) => {
      if (tile.kind === "single") {
        availableTiles.push({
          letter: tile.letter,
          baseValue: tile.baseValue,
          multiplier: tile.multiplier,
          source: "community",
          cardIndex: index,
          wasChoice: false,
        });
        return;
      }

      availableTiles.push({
        letter: tile.options[0],
        baseValue: tile.baseValues[0],
        multiplier: tile.multiplier,
        source: "community",
        cardIndex: index,
        wasChoice: true,
      });
      choiceResolutions.community![index.toString()] = tile.options[0];
    });

  const selectedTiles = availableTiles.slice(0, Math.min(2, availableTiles.length));
  const word = selectedTiles.map((tile) => tile.letter).join("");

  return {
    word,
    tiles: selectedTiles,
    choiceResolutions:
      Object.keys(choiceResolutions.hand || {}).length > 0 ||
      Object.keys(choiceResolutions.community || {}).length > 0
        ? choiceResolutions
        : undefined,
  };
}

async function submitEmergencyBotWord(
  ctx: ActionCtx,
  args: ShowdownArgs,
  emergencySubmission: ReturnType<typeof buildEmergencyBotSubmission>,
) {
  return await ctx.runMutation(internal.games.submitWordInternal, {
    gameId: args.gameId,
    playerId: args.playerId,
    word: emergencySubmission.word,
    tiles: emergencySubmission.tiles,
    choiceResolutions: emergencySubmission.choiceResolutions,
    invalidWord: true,
  });
}

export async function submitWordInternalHandler(ctx: MutationCtx, args: SubmitWordArgs) {
  const { gameId, playerId, word, tiles, choiceResolutions, invalidWord } = args;
  const normalizedWord = word.toLowerCase().trim();
  const normalizedPlayerId = playerId.trim();
  const game = await ctx.db.get(gameId);
  if (!game) throw new ConvexError({ code: "GAME_NOT_FOUND", message: "Game does not exist." });
  if (game.status !== "active") throw new ConvexError({ code: "INVALID_GAME_STATUS", message: "Game is not active." });
  if (game.stage !== "showdown") throw new ConvexError({ code: "INVALID_GAME_STAGE", message: "Word submissions are only allowed during showdown." });
  const hands = await ctx.db.query("playerHands").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect();
  if (hands.length === 0) throw new ConvexError({ code: "HANDS_NOT_FOUND", message: "No hands found for this game." });
  const playerHand = hands.find((hand) => hand.playerId === normalizedPlayerId);
  if (!playerHand) throw new ConvexError({ code: "PLAYER_NOT_FOUND", message: "Player not found in this game." });
  if (playerHand.hasFolded) throw new ConvexError({ code: "PLAYER_FOLDED", message: "Cannot submit word after folding." });
  const existingSubmission = await ctx.db.query("wordSubmissions").withIndex("by_game_player", (q) => q.eq("gameId", gameId).eq("playerId", normalizedPlayerId)).filter((q) => q.eq(q.field("stage"), game.stage)).unique();
  if (existingSubmission) throw new ConvexError({ code: "ALREADY_SUBMITTED", message: "You have already submitted a word for showdown." });

  const handTileCount = new Map<string, number>();
  for (const tile of playerHand.tiles) {
    const key =
      tile.kind === "single"
        ? getTileIdentityKey(tile)
        : `choice-${playerHand.tiles.indexOf(tile)}`;
    handTileCount.set(
      key,
      tile.kind === "single" ? (handTileCount.get(key) || 0) + 1 : 1,
    );
  }
  const communityTileCount = new Map<string, number>();
  game.communityTiles.filter((tile: GameTile) => tile.revealed).forEach((tile: GameTile, index: number) => {
    const key = tile.kind === "single" ? getTileIdentityKey(tile) : `choice-${index}`;
    communityTileCount.set(key, tile.kind === "single" ? (communityTileCount.get(key) || 0) + 1 : 1);
  });

  const usedHandTiles = new Map<string, number>();
  const usedCommunityTiles = new Map<string, number>();
  for (const tile of tiles) {
    const key =
      tile.wasChoice && tile.cardIndex !== undefined
        ? `choice-${tile.cardIndex}`
        : getTileIdentityKey(tile);
    if (tile.source === "hand") {
      const used = (usedHandTiles.get(key) || 0) + 1;
      if (used > (handTileCount.get(key) || 0)) throw new ConvexError({ code: "INVALID_TILE_USAGE", message: `Tile ${tile.letter} not available in hand or used too many times.` });
      usedHandTiles.set(key, used);
    } else {
      const used = (usedCommunityTiles.get(key) || 0) + 1;
      if (used > (communityTileCount.get(key) || 0)) throw new ConvexError({ code: "INVALID_TILE_USAGE", message: `Community tile ${tile.letter} not available or used too many times.` });
      usedCommunityTiles.set(key, used);
    }
  }

  const wordLetters = normalizedWord.split("");
  const tileLetters = tiles.map((tile) => tile.letter.toLowerCase());
  if (wordLetters.length !== tileLetters.length) throw new ConvexError({ code: "WORD_TILE_MISMATCH", message: "Word length does not match number of tiles." });
  for (let i = 0; i < wordLetters.length; i++) if (wordLetters[i] !== tileLetters[i]) throw new ConvexError({ code: "WORD_TILE_MISMATCH", message: "Word does not match tile letters." });

  const now = Date.now();
  const score = invalidWord
    ? { total: 0, basePoints: 0, multiplierBonus: 0, fullRackBonus: 0 }
    : calculateScore(tiles);
  await ctx.db.insert("wordSubmissions", {
    gameId,
    playerId: normalizedPlayerId,
    stage: game.stage,
    word: normalizedWord,
    tiles,
    choiceResolutions,
    score: score.total,
    scoreBreakdown: {
      basePoints: score.basePoints,
      multiplierBonus: score.multiplierBonus,
      fullRackBonus: score.fullRackBonus,
    },
    createdAt: now,
  });
  const tracePlayer = await getShowdownTracePlayer(ctx, game, normalizedPlayerId);
  await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
    gameId,
    roomId: game.roomId as Doc<"rooms">["_id"],
    category: "showdown_submit",
    playerId: normalizedPlayerId,
    playerName: tracePlayer.playerName,
    characterId: tracePlayer.characterId,
    isBot: tracePlayer.isBot,
    stage: game.stage,
    wordSubmitted: normalizedWord,
    wordScore: score.total,
    wordScoreBreakdown: JSON.stringify(score),
    success: !invalidWord,
    metadata: {
      forfeited: !!invalidWord,
      tileCount: tiles.length,
      choiceResolutions,
    },
  });

  const eligiblePlayerIds = hands.filter((hand) => !hand.hasFolded).map((hand) => hand.playerId);
  if (eligiblePlayerIds.length === 0) {
    await ctx.db.patch(game._id, { status: "completed", updatedAt: now });
    await insertGameCompleteTrace(ctx, game, { reason: "no_eligible_players_after_submit" });
    await ctx.runMutation(internal.playerStats.updatePlayerStats, { gameId: gameId });
  } else {
    const allSubmissions = await ctx.db.query("wordSubmissions").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect();
    const submissionsByPlayer = new Map<string, (typeof allSubmissions)[number]>();
    for (const submission of allSubmissions) {
      if (!eligiblePlayerIds.includes(submission.playerId)) continue;
      const existing = submissionsByPlayer.get(submission.playerId);
      if (!existing || submission.createdAt > existing.createdAt) submissionsByPlayer.set(submission.playerId, submission);
    }
    if (eligiblePlayerIds.every((id) => submissionsByPlayer.has(id)) && !game.winnerId) {
      const winningSubmission = [...submissionsByPlayer.values()].sort(compareRankedSubmissions)[0];
      await ctx.db.patch(game._id, { winnerId: winningSubmission.playerId, winningWord: winningSubmission.word, winningScore: winningSubmission.score, winningScoreBreakdown: winningSubmission.scoreBreakdown, status: "completed", updatedAt: now });
      await insertGameCompleteTrace(ctx, game, {
        winnerId: winningSubmission.playerId,
        winnerWord: winningSubmission.word,
        winnerScore: winningSubmission.score,
        reason: "all_showdown_submissions_received",
      });
      await ctx.runMutation(internal.playerStats.updatePlayerStats, { gameId: gameId });
    }
  }

  return { ok: !invalidWord, word: normalizedWord, score: score.total, scoreBreakdown: score, submissionTime: now, forfeited: invalidWord, message: invalidWord ? `"${normalizedWord}" is not a valid dictionary word. Submitted with 0 points.` : undefined };
}

export async function forfeitShowdownHandler(ctx: MutationCtx, args: ShowdownArgs) {
  const game = await ctx.db.get(args.gameId);
  if (!game) throw new ConvexError({ code: "GAME_NOT_FOUND", message: "Game does not exist." });
  if (game.status !== "active" || game.stage !== "showdown") throw new ConvexError({ code: "INVALID_GAME_STAGE", message: "Forfeit is only allowed during active showdown." });
  const normalizedPlayerId = args.playerId.trim();
  if (!normalizedPlayerId) throw new ConvexError({ code: "INVALID_PLAYER_ID", message: "Player ID is required." });
  const hands = await ctx.db.query("playerHands").withIndex("by_game", (q) => q.eq("gameId", args.gameId)).collect();
  const playerHand = hands.find((hand) => hand.playerId === normalizedPlayerId);
  if (!playerHand) throw new ConvexError({ code: "PLAYER_NOT_FOUND", message: "Player not found in this game." });
  const now = Date.now();
  if (!playerHand.hasFolded) await ctx.db.patch(playerHand._id, { hasFolded: true, hasActed: true, updatedAt: now });
  const latestHands = await ctx.db.query("playerHands").withIndex("by_game", (q) => q.eq("gameId", args.gameId)).collect();
  const eligiblePlayerIds = latestHands.filter((hand) => !hand.hasFolded).map((hand) => hand.playerId);
  const allSubmissions = await ctx.db.query("wordSubmissions").withIndex("by_game", (q) => q.eq("gameId", args.gameId)).collect();
  const submissionsByPlayer = new Map<string, (typeof allSubmissions)[number]>();
  for (const submission of allSubmissions) {
    if (!eligiblePlayerIds.includes(submission.playerId)) continue;
    const existing = submissionsByPlayer.get(submission.playerId);
    if (!existing || submission.createdAt > existing.createdAt) submissionsByPlayer.set(submission.playerId, submission);
  }
  if (eligiblePlayerIds.length === 0) {
    await ctx.db.patch(game._id, { status: "completed", updatedAt: now });
    await insertGameCompleteTrace(ctx, game, { reason: "all_players_forfeited" });
    await ctx.runMutation(internal.playerStats.updatePlayerStats, { gameId: args.gameId });
    return { ok: true, forfeited: true, resolved: true, hasWinner: false };
  }
  if (eligiblePlayerIds.length === 1) {
    const winnerId = eligiblePlayerIds[0];
    const winnerSubmission = submissionsByPlayer.get(winnerId);
    if (winnerSubmission) {
      await ctx.db.patch(game._id, { winnerId, winningWord: winnerSubmission.word, winningScore: winnerSubmission.score, winningScoreBreakdown: winnerSubmission.scoreBreakdown, status: "completed", updatedAt: now });
      await insertGameCompleteTrace(ctx, game, {
        winnerId,
        winnerWord: winnerSubmission.word,
        winnerScore: winnerSubmission.score,
        reason: "one_player_left_after_forfeit",
      });
      await ctx.runMutation(internal.playerStats.updatePlayerStats, { gameId: args.gameId });
      return { ok: true, forfeited: true, resolved: true, hasWinner: true, winnerId };
    }
    return { ok: true, forfeited: true, resolved: false, hasWinner: false };
  }
  if (!eligiblePlayerIds.every((playerId) => submissionsByPlayer.has(playerId))) {
    return { ok: true, forfeited: true, resolved: false, hasWinner: false };
  }
  const winningSubmission = [...submissionsByPlayer.values()].sort(compareRankedSubmissions)[0];
  await ctx.db.patch(game._id, { winnerId: winningSubmission.playerId, winningWord: winningSubmission.word, winningScore: winningSubmission.score, winningScoreBreakdown: winningSubmission.scoreBreakdown, status: "completed", updatedAt: now });
  await insertGameCompleteTrace(ctx, game, {
    winnerId: winningSubmission.playerId,
    winnerWord: winningSubmission.word,
    winnerScore: winningSubmission.score,
    reason: "forfeit_completed_remaining_showdown",
  });
  await ctx.runMutation(internal.playerStats.updatePlayerStats, { gameId: args.gameId });
  return { ok: true, forfeited: true, resolved: true, hasWinner: true, winnerId: winningSubmission.playerId };
}

export async function submitWordHandler(ctx: ActionCtx, args: Omit<SubmitWordArgs, "invalidWord">): Promise<{ ok: boolean; word: string; score: number; scoreBreakdown: any; submissionTime: number; forfeited?: boolean; message?: string }> {
  const normalizedPlayerId = args.playerId.trim();
  const normalizedWord = args.word.toLowerCase().trim();
  if (!normalizedPlayerId) throw new ConvexError({ code: "INVALID_PLAYER_ID", message: "Player ID is required." });
  if (normalizedWord.length < 2 || normalizedWord.length > 7) throw new ConvexError({ code: "INVALID_WORD_LENGTH", message: "Word must be between 2 and 7 letters." });
  const validationData = await ctx.runAction(internal.validateWord.validateDictionaryWord, { word: normalizedWord });
  if (!validationData.valid) {
    return await ctx.runMutation(internal.games.submitWordInternal, { ...args, playerId: normalizedPlayerId, word: normalizedWord, invalidWord: true });
  }
  return await ctx.runMutation(internal.games.submitWordInternal, { ...args, playerId: normalizedPlayerId, word: normalizedWord });
}

export async function resolveShowdownHandler(ctx: MutationCtx, args: { gameId: Doc<"games">["_id"] }) {
  const game = await ctx.db.get(args.gameId);
  if (!game) throw new ConvexError({ code: "GAME_NOT_FOUND", message: "Game does not exist." });
  if (game.stage !== "showdown") throw new ConvexError({ code: "INVALID_GAME_STAGE", message: "Game must be in showdown stage to resolve winner." });
  if (game.winnerId) throw new ConvexError({ code: "WINNER_ALREADY_DETERMINED", message: "Winner has already been determined for this game." });
  const hands = await ctx.db.query("playerHands").withIndex("by_game", (q) => q.eq("gameId", args.gameId)).collect();
  const eligiblePlayerIds = hands.filter((hand) => !hand.hasFolded).map((hand) => hand.playerId);
  if (eligiblePlayerIds.length === 0) {
    await ctx.db.patch(game._id, { status: "completed", updatedAt: Date.now() });
    await insertGameCompleteTrace(ctx, game, { reason: "resolve_no_eligible_players" });
    await ctx.runMutation(internal.playerStats.updatePlayerStats, { gameId: args.gameId });
    return { ok: true, hasWinner: false, message: "No eligible players for showdown." };
  }
  const allSubmissions = await ctx.db.query("wordSubmissions").withIndex("by_game", (q) => q.eq("gameId", args.gameId)).collect();
  const submissionsByPlayer = new Map<string, (typeof allSubmissions)[number]>();
  for (const submission of allSubmissions) {
    if (!eligiblePlayerIds.includes(submission.playerId)) continue;
    const existing = submissionsByPlayer.get(submission.playerId);
    if (!existing || submission.createdAt > existing.createdAt) submissionsByPlayer.set(submission.playerId, submission);
  }
  const eligibleSubmissions = Array.from(submissionsByPlayer.values());
  if (eligibleSubmissions.length === 0) {
    await ctx.db.patch(game._id, { status: "completed", updatedAt: Date.now() });
    await insertGameCompleteTrace(ctx, game, { reason: "resolve_no_valid_submissions" });
    await ctx.runMutation(internal.playerStats.updatePlayerStats, { gameId: args.gameId });
    return { ok: true, hasWinner: false, message: "No valid submissions for showdown." };
  }
  const sortedSubmissions = [...eligibleSubmissions].sort(compareRankedSubmissions);
  const winningSubmission = sortedSubmissions[0];
  const now = Date.now();
  await ctx.db.patch(game._id, { winnerId: winningSubmission.playerId, winningWord: winningSubmission.word, winningScore: winningSubmission.score, winningScoreBreakdown: winningSubmission.scoreBreakdown, status: "completed", updatedAt: now });
  await insertGameCompleteTrace(ctx, game, {
    winnerId: winningSubmission.playerId,
    winnerWord: winningSubmission.word,
    winnerScore: winningSubmission.score,
    reason: "manual_or_timer_resolution",
  });
  await ctx.runMutation(internal.playerStats.updatePlayerStats, { gameId: args.gameId });
  return { ok: true, hasWinner: true, winnerId: winningSubmission.playerId, winningWord: winningSubmission.word, winningScore: winningSubmission.score, winningScoreBreakdown: winningSubmission.scoreBreakdown, allSubmissions: sortedSubmissions.map((submission) => ({ playerId: submission.playerId, word: submission.word, score: submission.score, scoreBreakdown: submission.scoreBreakdown })) };
}

export async function internalResolveExpiredShowdownHandler(
  ctx: MutationCtx,
  args: ResolveShowdownArgs & { showdownStartedAt: number },
) {
  const game = await ctx.db.get(args.gameId);
  if (!game) {
    return { ok: false, reason: "Game not found" };
  }

  const isMatchingActiveShowdown =
    game.stage === "showdown" &&
    game.status === "active" &&
    game.showdownStartedAt === args.showdownStartedAt &&
    !game.winnerId;

  if (!isMatchingActiveShowdown) {
    return {
      ok: false,
      reason: "Showdown already resolved or replaced",
    };
  }

  return await resolveShowdownHandler(ctx, { gameId: args.gameId });
}

export async function getWordSubmissionsHandler(ctx: QueryCtx, args: { gameId: Doc<"games">["_id"] }) {
  const game = await ctx.db.get(args.gameId);
  if (!game || game.stage !== "showdown") return null;
  const allSubmissions = await ctx.db.query("wordSubmissions").withIndex("by_game", (q) => q.eq("gameId", args.gameId)).collect();
  const hands = await ctx.db.query("playerHands").withIndex("by_game", (q) => q.eq("gameId", args.gameId)).collect();
  const eligiblePlayerIds = hands.filter((hand) => !hand.hasFolded).map((hand) => hand.playerId);
  const submissionsByPlayer = new Map<string, (typeof allSubmissions)[number]>();
  for (const submission of allSubmissions) {
    if (!eligiblePlayerIds.includes(submission.playerId)) continue;
    const existing = submissionsByPlayer.get(submission.playerId);
    if (!existing || submission.createdAt > existing.createdAt) submissionsByPlayer.set(submission.playerId, submission);
  }
  return {
    submissions: [...submissionsByPlayer.values()].sort(compareRankedSubmissions).map((submission) => ({ playerId: submission.playerId, word: submission.word, tiles: submission.tiles, choiceResolutions: submission.choiceResolutions, score: submission.score, scoreBreakdown: submission.scoreBreakdown })),
    isCompleted: game.status === "completed",
    winnerId: game.winnerId,
  };
}

export async function getShowdownResultsHandler(ctx: QueryCtx, args: { gameId: Doc<"games">["_id"] }) {
  const game = await ctx.db.get(args.gameId);
  if (!game || game.stage !== "showdown" || (game.status !== "completed" && game.status !== "waiting")) return null;
  const allSubmissions = await ctx.db.query("wordSubmissions").withIndex("by_game", (q) => q.eq("gameId", args.gameId)).collect();
  const hands = await ctx.db.query("playerHands").withIndex("by_game", (q) => q.eq("gameId", args.gameId)).collect();
  const submissionsByPlayer = new Map<string, (typeof allSubmissions)[number]>();
  for (const submission of allSubmissions) {
    const existing = submissionsByPlayer.get(submission.playerId);
    if (!existing || submission.createdAt > existing.createdAt) submissionsByPlayer.set(submission.playerId, submission);
  }
  const allPlayerResults = hands.map((hand) => {
    const submission = submissionsByPlayer.get(hand.playerId);
    if (hand.hasFolded && !submission) return { playerId: hand.playerId, word: null, tiles: [], score: 0, scoreBreakdown: null, status: "forfeited" as const };
    if (submission) return { playerId: submission.playerId, word: submission.word, tiles: submission.tiles, score: submission.score, scoreBreakdown: submission.scoreBreakdown, status: "submitted" as const };
    return { playerId: hand.playerId, word: null, tiles: [], score: 0, scoreBreakdown: null, status: "no-submission" as const };
  });
  return {
    hasWinner: !!game.winnerId,
    winnerId: game.winnerId,
    winningWord: game.winningWord,
    winningScore: game.winningScore,
    winningScoreBreakdown: game.winningScoreBreakdown,
    allSubmissions: allPlayerResults.sort(compareRankedSubmissions),
  };
}

export async function internalProcessBotShowdownHandler(ctx: ActionCtx, args: ShowdownArgs): Promise<{ ok: true; word: string; score: number; reasoning?: string } | { ok: false; reason: string; error?: string }> {
  logBotShowdown("starting bot showdown submission", {
    gameId: args.gameId,
    playerId: args.playerId,
  });
  const runtimeState = await ctx.runQuery(internal.games.internalGetGameRuntimeState, { gameId: args.gameId });
  const game = runtimeState?.game;
  if (!game || game.status !== "active" || game.stage !== "showdown") {
    logBotShowdown("aborting bot showdown because game is not in showdown", {
      gameFound: !!game,
      gameStatus: game?.status,
      stage: game?.stage,
    });
    return { ok: false, reason: "Game not in showdown stage" };
  }
  const botHand = runtimeState.hands.find((hand) => hand.playerId === args.playerId);
  if (!botHand || botHand.hasFolded) {
    logBotShowdown("aborting bot showdown because the hand is missing or folded", {
      playerId: args.playerId,
      handFound: !!botHand,
      hasFolded: botHand?.hasFolded,
    });
    return { ok: false, reason: "Bot hand not found or already folded" };
  }
  try {
    const botPlayer = runtimeState.players.find((player) => String(player._id) === args.playerId);
    const botCharacter =
      getBotCharacterForAuthUserId(botPlayer?.authUserId) ?? getBotCharacterForSeed(args.playerId);
    const personality = botCharacter.personality;

    const recentMessages = await ctx.runQuery(api.messages.getRecentMessages, {
      roomId: game.roomId as any,
      limit: 10,
    });

    const playerMessages = recentMessages
      .filter((m) => m.type === "player")
      .map((m) => m.text);

    const bluffDetected = isBluffLikely(playerMessages);
    const believesPlayer = shouldBelievePlayer(personality, bluffDetected);

    logBotShowdown("requesting AI showdown word", {
      playerId: args.playerId,
      botName: botCharacter.name,
      botTitle: botCharacter.title,
      personality,
      revealedCommunityCount: game.communityTiles.filter((tile) => tile.revealed).length,
      handTileCount: botHand.tiles.length,
      bluffDetected,
      believesPlayer,
    });
    const wordResult = await ctx.runAction(internal.ai.aiSubmitWord, {
      difficulty: "medium",
      personality,
      handTiles: botHand.tiles,
      communityTiles: game.communityTiles,
      timeoutMs: 15_000,
      believesPlayer: believesPlayer ?? undefined,
      gameId: args.gameId,
      roomId: game.roomId as any,
      playerId: args.playerId,
      playerName: botCharacter.name,
      characterId: botCharacter.id,
    });
    if (!wordResult.word || wordResult.tiles.length === 0) {
      const emergencySubmission = buildEmergencyBotSubmission(
        botHand.tiles,
        game.communityTiles,
      );
      logBotShowdown("AI did not return a usable word, trying emergency submission", {
        playerId: args.playerId,
        word: wordResult.word,
        tileCount: wordResult.tiles.length,
        reasoning: wordResult.reasoning,
        emergencyWord: emergencySubmission.word,
      });
      if (emergencySubmission.word.length >= 2) {
        const result = await submitEmergencyBotWord(
          ctx,
          args,
          emergencySubmission,
        );
        return {
          ok: true,
          word: emergencySubmission.word,
          score: result.score,
          reasoning: "Emergency showdown submission",
        };
      }
      await ctx.runMutation(api.games.forfeitShowdown, { gameId: args.gameId, playerId: args.playerId });
      return { ok: false, reason: "AI failed to generate word" };
    }
    logBotShowdown("AI generated showdown word", {
      playerId: args.playerId,
      botName: botCharacter.name,
      personality,
      word: wordResult.word,
      tileCount: wordResult.tiles.length,
      estimatedScore: wordResult.estimatedScore,
      reasoning: wordResult.reasoning,
    });
    const result = await ctx.runAction(api.games.submitWord, { gameId: args.gameId, playerId: args.playerId, word: wordResult.word, tiles: wordResult.tiles, choiceResolutions: wordResult.choiceResolutions });
    logBotShowdown("submitted AI showdown word", {
      playerId: args.playerId,
      word: wordResult.word,
      score: result.score,
      forfeited: result.forfeited,
    });
    return { ok: true, word: wordResult.word, score: result.score, reasoning: wordResult.reasoning };
  } catch (error) {
    console.error("[bot-showdown] AI showdown submission failed", {
      gameId: args.gameId,
      playerId: args.playerId,
      error: String(error),
    });
    try {
      const emergencySubmission = buildEmergencyBotSubmission(
        botHand.tiles,
        game.communityTiles,
      );
      logBotShowdown("retrying showdown with emergency submission", {
        playerId: args.playerId,
        word: emergencySubmission.word,
        tileCount: emergencySubmission.tiles.length,
      });
      if (emergencySubmission.word.length >= 2) {
        const result = await submitEmergencyBotWord(
          ctx,
          args,
          emergencySubmission,
        );
        return {
          ok: true,
          word: emergencySubmission.word,
          score: result.score,
          reasoning: "Emergency showdown submission",
        };
      }
    } catch (emergencyError) {
      console.error("[bot-showdown] Emergency showdown submission failed", {
        gameId: args.gameId,
        playerId: args.playerId,
        error: String(emergencyError),
      });
    }
    await ctx.runMutation(api.games.forfeitShowdown, { gameId: args.gameId, playerId: args.playerId });
    return { ok: false, reason: "AI submission error", error: String(error) };
  }
}
