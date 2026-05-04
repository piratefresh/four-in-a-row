import { recordGameCompletion } from "../activityFeed";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  getNewRevealCountForStage,
  getNextStage,
} from "../gameState";
import type { GameDeckTile, GameStage, GameTile } from "../gameState";
import { resolveConfig } from "../gameConfig";
import {
  AI_DEALER_PLAYER_ID,
  BOT_ACTION_DELAY_MS,
  DEV_BOT_AUTH_PREFIX,
  getClearedTurnClockFields,
  getNewTurnStateFields,
  type PlayerHand,
  sortHandsByTurnOrder,
} from "./gamesShared";

const FIRST_BOT_GAME_TUTORIAL_ID = "first-bot-game" as const;

function describeRevealedTiles(tiles: GameTile[]) {
  return tiles
    .filter((tile) => tile.revealed)
    .map((tile) =>
      tile.kind === "single"
        ? tile.letter
        : `[${tile.options.join("/")}]`,
    )
    .join(" ");
}

export async function advanceTurn(
  ctx: MutationCtx,
  game: { _id: Id<"games">; currentPlayerIndex: number },
  orderedHands: PlayerHand[],
): Promise<number> {
  let nextPlayerIndex = game.currentPlayerIndex;
  const now = Date.now();

  for (let step = 1; step <= orderedHands.length; step++) {
    const candidateIndex = (game.currentPlayerIndex + step) % orderedHands.length;
    if (!orderedHands[candidateIndex]?.hasFolded) {
      nextPlayerIndex = candidateIndex;
      break;
    }
  }

  await ctx.db.patch(game._id, {
    currentPlayerIndex: nextPlayerIndex,
    updatedAt: now,
    ...getNewTurnStateFields(now),
  });

  return nextPlayerIndex;
}

function allActivePlayersHaveActed(hands: PlayerHand[]): boolean {
  const activePlayers = hands.filter((hand) => !hand.hasFolded);
  return activePlayers.length > 0 && activePlayers.every((hand) => hand.hasActed);
}

function onlyOnePlayerRemains(hands: PlayerHand[]): boolean {
  const activePlayers = hands.filter((hand) => !hand.hasFolded);
  return activePlayers.length === 1;
}

function getFirstActivePlayerIndex(hands: PlayerHand[]): number {
  const activeIndex = hands.findIndex((hand) => !hand.hasFolded);
  return activeIndex >= 0 ? activeIndex : 0;
}

async function advanceStage(
  ctx: MutationCtx,
  game: {
    _id: Id<"games">;
    roomId: string;
    stage: GameStage;
    communityTiles: GameTile[];
    deck: GameDeckTile[];
    currentBet: number;
    raisesThisRound?: number;
  },
  orderedHands: PlayerHand[],
): Promise<boolean> {
  const nextStage = getNextStage(game.stage);

  if (!nextStage) {
    return false;
  }

  const now = Date.now();
  const skipBetting = nextStage === "final";
  const roomId = game.roomId as Id<"rooms">;
  const room = await ctx.db.get(roomId);
  const shouldPauseTutorialBetting =
    nextStage === "turn" && room?.tutorialId === FIRST_BOT_GAME_TUTORIAL_ID;
  const shouldPauseTutorialShowdown =
    nextStage === "final" && room?.tutorialId === FIRST_BOT_GAME_TUTORIAL_ID;

  for (const hand of orderedHands) {
    if (!hand.hasFolded) {
      await ctx.db.patch(hand._id, {
        hasActed: skipBetting ? true : false,
        betThisRound: 0,
        lastAction: undefined,
        updatedAt: now,
      });
    }
  }

  const revealCount = getNewRevealCountForStage(nextStage);
  const updatedCommunityTiles = [...game.communityTiles];
  let revealedSoFar = 0;

  for (let i = 0; i < updatedCommunityTiles.length && revealedSoFar < revealCount; i++) {
    if (!updatedCommunityTiles[i].revealed) {
      updatedCommunityTiles[i] = { ...updatedCommunityTiles[i], revealed: true };
      revealedSoFar++;
    }
  }

  const targetStage = nextStage === "final" ? "showdown" : nextStage;
  const updateData: {
    stage: GameStage | "showdown";
    communityTiles: GameTile[];
    currentBet: number;
    currentPlayerIndex: number;
    raisesThisRound: number;
    updatedAt: number;
    showdownStartedAt?: number;
    turnStartedAt?: number;
    turnClockCalledAt?: undefined;
    turnClockExpiresAt?: undefined;
    turnClockCallerPlayerId?: undefined;
    turnClockTargetPlayerId?: undefined;
  } = {
    stage: targetStage,
    communityTiles: updatedCommunityTiles,
    currentBet: 0,
    currentPlayerIndex: getFirstActivePlayerIndex(orderedHands),
    raisesThisRound: 0,
    updatedAt: now,
    ...getClearedTurnClockFields(),
  };

  if (targetStage === "showdown") {
    updateData.showdownStartedAt = shouldPauseTutorialShowdown
      ? undefined
      : now;
    updateData.turnStartedAt = undefined;
  } else {
    updateData.turnStartedAt = shouldPauseTutorialBetting ? undefined : now;
  }

  await ctx.db.patch(game._id, updateData);
  await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
    gameId: game._id,
    roomId,
    category: "stage_change",
    previousStage: game.stage,
    stage: targetStage,
    tilesRevealed: describeRevealedTiles(updatedCommunityTiles),
    potAfter: orderedHands.reduce((sum, hand) => sum + hand.totalBet, 0),
    metadata: {
      revealCount,
      activePlayerIds: orderedHands
        .filter((hand) => !hand.hasFolded)
        .map((hand) => hand.playerId),
    },
  });

  return true;
}

async function isAutomatedParticipant(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  playerId: string,
) {
  if (playerId === AI_DEALER_PLAYER_ID) {
    return true;
  }

  const normalizedPlayerId = ctx.db.normalizeId("players", playerId);
  if (!normalizedPlayerId) {
    return false;
  }

  const player = await ctx.db.get(normalizedPlayerId);
  return (
    !!player &&
    player.roomId === roomId &&
    player.status === "active" &&
    player.authUserId.startsWith(DEV_BOT_AUTH_PREFIX)
  );
}

async function scheduleBotShowdownSubmissions(
  ctx: MutationCtx,
  gameId: Id<"games">,
) {
  const game = await ctx.db.get(gameId);
  if (
    !game ||
    game.stage !== "showdown" ||
    game.showdownStartedAt === undefined
  ) {
    return;
  }

  const room = await ctx.db.get(game.roomId as Id<"rooms">);

  const hands = await ctx.db
    .query("playerHands")
    .withIndex("by_game", (q) => q.eq("gameId", gameId))
    .collect();

  const botHands = [];
  for (const hand of hands) {
    if (hand.hasFolded) continue;

    const isBot = await isAutomatedParticipant(
      ctx,
      game.roomId as Id<"rooms">,
      hand.playerId,
    );

    if (isBot) {
      botHands.push(hand);
    }
  }

  for (const botHand of botHands) {
    const isTutorial = room?.tutorialId === FIRST_BOT_GAME_TUTORIAL_ID;
    const delay = isTutorial
      ? 1500
      : 3000 + Math.floor(Math.random() * 12000);

    await ctx.scheduler.runAfter(
      delay,
      (internal as typeof internal).games.internalProcessBotShowdown,
      {
        gameId,
        playerId: botHand.playerId,
      },
    );
  }
}

async function scheduleShowdownResolution(
  ctx: MutationCtx,
  gameId: Id<"games">,
) {
  const game = await ctx.db.get(gameId);
  if (
    !game ||
    game.stage !== "showdown" ||
    game.status !== "active" ||
    game.showdownStartedAt === undefined
  ) {
    return;
  }

  const config = game.config ?? resolveConfig();
  await ctx.scheduler.runAfter(
    config.showdownTimerMs,
    (internal as typeof internal).games.internalResolveExpiredShowdown,
    {
      gameId,
      showdownStartedAt: game.showdownStartedAt,
    },
  );
}

async function scheduleTurnTimeout(
  ctx: MutationCtx,
  args: {
    gameId: Id<"games">;
    playerId: string;
    turnStartedAt: number;
    timeoutMs: number;
  },
) {
  const turnClockExpiresAt = args.turnStartedAt + args.timeoutMs;
  const now = Date.now();

  await ctx.db.patch(args.gameId, {
    turnClockExpiresAt,
    turnClockTargetPlayerId: args.playerId,
    turnClockCallerPlayerId: undefined,
    turnClockCalledAt: undefined,
    updatedAt: now,
  });

  await ctx.scheduler.runAfter(
    Math.max(0, turnClockExpiresAt - now),
    (internal as typeof internal).games.internalResolveExpiredTurnClock,
    {
      gameId: args.gameId,
      playerId: args.playerId,
      turnClockExpiresAt,
    },
  );
}

export async function setRoomUsersActiveGameId(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  activeGameId?: string,
) {
  const activePlayers = await ctx.db
    .query("players")
    .withIndex("roomId_status", (q) =>
      q.eq("roomId", roomId).eq("status", "active"),
    )
    .collect();

  const userIds = new Set<string>();
  for (const player of activePlayers) {
    if (player.authUserId) {
      userIds.add(player.authUserId);
    }
  }

  for (const userId of userIds) {
    const normalizedUserId = ctx.db.normalizeId("user", userId);
    if (normalizedUserId) {
      await ctx.db.patch(normalizedUserId, { activeGameId });
    }
  }
}

export async function scheduleBotTurnIfNeeded(
  ctx: MutationCtx,
  gameId: Id<"games">,
) {
  const game = await ctx.db.get(gameId);
  if (!game || game.status !== "active") {
    console.log("scheduleBotTurnIfNeeded: Game not active or not found");
    return;
  }

  console.log(
    `scheduleBotTurnIfNeeded: Game ${gameId}, stage=${game.stage}, currentPlayerIndex=${game.currentPlayerIndex}`,
  );

  if (game.stage === "showdown") {
    console.log("scheduleBotTurnIfNeeded: Scheduling showdown submissions");
    if (game.showdownStartedAt === undefined) {
      console.log(
        "scheduleBotTurnIfNeeded: Tutorial showdown is paused until released",
      );
      return;
    }
    await scheduleBotShowdownSubmissions(ctx, gameId);
    await scheduleShowdownResolution(ctx, gameId);
    return;
  }

  if (game.stage === "final") {
    console.log("scheduleBotTurnIfNeeded: Stage is final, skipping");
    return;
  }

  const room = await ctx.db.get(game.roomId as Id<"rooms">);
  if (
    room?.tutorialId === FIRST_BOT_GAME_TUTORIAL_ID &&
    game.turnStartedAt === undefined
  ) {
    console.log("scheduleBotTurnIfNeeded: Tutorial betting is paused");
    return;
  }

  const hands = await ctx.db
    .query("playerHands")
    .withIndex("by_game", (q) => q.eq("gameId", gameId))
    .collect();

  if (hands.length === 0) {
    console.log("scheduleBotTurnIfNeeded: No hands found");
    return;
  }

  const orderedHands = sortHandsByTurnOrder(hands);
  const currentTurnHand = orderedHands[game.currentPlayerIndex];
  if (!currentTurnHand || currentTurnHand.hasFolded) {
    console.log("scheduleBotTurnIfNeeded: Current turn hand not found or has folded");
    if (orderedHands.some((hand) => !hand.hasFolded)) {
      await advanceTurn(ctx, game, orderedHands);
      await scheduleBotTurnIfNeeded(ctx, gameId);
    }
    return;
  }

  console.log(`scheduleBotTurnIfNeeded: Current turn player=${currentTurnHand.playerId}`);

  const isBot = await isAutomatedParticipant(
    ctx,
    game.roomId as Id<"rooms">,
    currentTurnHand.playerId,
  );

  console.log(`scheduleBotTurnIfNeeded: isBot=${isBot}`);

  if (!isBot) {
    if (room?.tutorialId === FIRST_BOT_GAME_TUTORIAL_ID) {
      if (game.turnClockExpiresAt !== undefined) {
        await ctx.db.patch(game._id, {
          ...getClearedTurnClockFields(),
          updatedAt: Date.now(),
        });
      }
      console.log("scheduleBotTurnIfNeeded: Turn timer is disabled for tutorial player turns");
      return;
    }

    if (
      game.turnStartedAt !== undefined &&
      game.turnClockExpiresAt === undefined
    ) {
      console.log(
        `scheduleBotTurnIfNeeded: Scheduling turn timeout for ${currentTurnHand.playerId}`,
      );
      const config = game.config ?? resolveConfig();
      await scheduleTurnTimeout(ctx, {
        gameId,
        playerId: currentTurnHand.playerId,
        turnStartedAt: game.turnStartedAt,
        timeoutMs: config.turnClockGraceMs,
      });
    }
    console.log("scheduleBotTurnIfNeeded: Current player is not a bot, skipping bot action");
    return;
  }

  console.log(
    `scheduleBotTurnIfNeeded: Scheduling bot turn for ${currentTurnHand.playerId} in ${BOT_ACTION_DELAY_MS}ms`,
  );

  await ctx.scheduler.runAfter(
    BOT_ACTION_DELAY_MS,
    (internal as typeof internal).games.internalProcessBotTurn,
    {
      gameId,
      playerId: currentTurnHand.playerId,
      expectedStage: game.stage,
      expectedCurrentPlayerIndex: game.currentPlayerIndex,
      expectedTurnStartedAt: game.turnStartedAt,
    },
  );
}

export async function handlePostActionProgression(
  ctx: MutationCtx,
  game: {
    _id: Id<"games">;
    roomId: string;
    stage: GameStage;
    currentPlayerIndex: number;
    communityTiles: GameTile[];
    deck: GameDeckTile[];
    currentBet: number;
    raisesThisRound?: number;
    status: string;
  },
  orderedHands: PlayerHand[],
): Promise<void> {
  const now = Date.now();

  if (onlyOnePlayerRemains(orderedHands)) {
    const winner = orderedHands.find((hand) => !hand.hasFolded);

    if (!winner) {
      await ctx.db.patch(game._id, {
        stage: "showdown",
        status: "completed",
        turnStartedAt: undefined,
        ...getClearedTurnClockFields(),
        updatedAt: now,
      });
      await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
        gameId: game._id,
        roomId: game.roomId as Id<"rooms">,
        category: "game_complete",
        stage: "showdown",
        metadata: { reason: "no_remaining_players" },
      });
      await recordGameCompletion(ctx, game._id);
      // DEPRECATED: playerStats are now computed on-the-fly (see STO-185)
      return;
    }

    const updatedCommunityTiles = game.communityTiles.map((tile) => ({
      ...tile,
      revealed: true,
    }));

    for (const hand of orderedHands) {
      if (!hand.hasFolded) {
        await ctx.db.patch(hand._id, {
          hasActed: true,
          betThisRound: 0,
          lastAction: undefined,
          updatedAt: now,
        });
      }
    }

    await ctx.db.patch(game._id, {
      stage: "showdown",
      status: "active",
      communityTiles: updatedCommunityTiles,
      currentBet: 0,
      raisesThisRound: 0,
      showdownStartedAt: now,
      turnStartedAt: undefined,
      ...getClearedTurnClockFields(),
      updatedAt: now,
    });

    await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
      gameId: game._id,
      roomId: game.roomId as Id<"rooms">,
      category: "stage_change",
      previousStage: game.stage,
      stage: "showdown",
      tilesRevealed: describeRevealedTiles(updatedCommunityTiles),
      potAfter: orderedHands.reduce((sum, hand) => sum + hand.totalBet, 0),
      metadata: {
        revealCount: updatedCommunityTiles.filter((t) => t.revealed).length - game.communityTiles.filter((t) => t.revealed).length,
        activePlayerIds: orderedHands.filter((hand) => !hand.hasFolded).map((hand) => hand.playerId),
        reason: "only_one_player_remains",
      },
    });

    await scheduleBotTurnIfNeeded(ctx, game._id);
    return;
  }

  if (allActivePlayersHaveActed(orderedHands)) {
    const advanced = await advanceStage(ctx, game, orderedHands);

    if (!advanced) {
      await ctx.db.patch(game._id, {
        status: "completed",
        turnStartedAt: undefined,
        ...getClearedTurnClockFields(),
        updatedAt: now,
      });
      await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
        gameId: game._id,
        roomId: game.roomId as Id<"rooms">,
        category: "game_complete",
        stage: game.stage,
        metadata: { reason: "no_next_stage" },
      });
      await recordGameCompletion(ctx, game._id);
      // DEPRECATED: playerStats are now computed on-the-fly (see STO-185)
      return;
    }
  } else {
    await advanceTurn(ctx, game, orderedHands);
  }

  await scheduleBotTurnIfNeeded(ctx, game._id);
}
