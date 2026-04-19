import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  getNewRevealCountForStage,
  getNextStage,
} from "../gameState";
import type { GameDeckTile, GameStage, GameTile } from "../gameState";
import {
  AI_DEALER_PLAYER_ID,
  BOT_ACTION_DELAY_MS,
  DEV_BOT_AUTH_PREFIX,
  type PlayerHand,
  sortHandsByTurnOrder,
} from "./gamesShared";

export async function advanceTurn(
  ctx: MutationCtx,
  game: { _id: Id<"games">; currentPlayerIndex: number },
  orderedHands: PlayerHand[],
): Promise<number> {
  let nextPlayerIndex = game.currentPlayerIndex;

  for (let step = 1; step <= orderedHands.length; step++) {
    const candidateIndex = (game.currentPlayerIndex + step) % orderedHands.length;
    if (!orderedHands[candidateIndex]?.hasFolded) {
      nextPlayerIndex = candidateIndex;
      break;
    }
  }

  await ctx.db.patch(game._id, {
    currentPlayerIndex: nextPlayerIndex,
    updatedAt: Date.now(),
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

async function advanceStage(
  ctx: MutationCtx,
  game: {
    _id: Id<"games">;
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
  } = {
    stage: targetStage,
    communityTiles: updatedCommunityTiles,
    currentBet: 0,
    currentPlayerIndex: 0,
    raisesThisRound: 0,
    updatedAt: now,
  };

  if (targetStage === "showdown") {
    updateData.showdownStartedAt = now;
  }

  await ctx.db.patch(game._id, updateData);

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
  if (!game || game.stage !== "showdown") {
    return;
  }

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
    const delay = 3000 + Math.floor(Math.random() * 12000);

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
    await scheduleBotShowdownSubmissions(ctx, gameId);
    return;
  }

  if (game.stage === "final") {
    console.log("scheduleBotTurnIfNeeded: Stage is final, skipping");
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
    console.log("scheduleBotTurnIfNeeded: Current player is not a bot, skipping");
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
    },
  );
}

export async function handlePostActionProgression(
  ctx: MutationCtx,
  game: {
    _id: Id<"games">;
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

    if (winner) {
      await ctx.db.patch(game._id, {
        stage: "showdown",
        status: "completed",
        winnerId: winner.playerId,
        winningWord: undefined,
        winningScore: undefined,
        winningScoreBreakdown: undefined,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(game._id, {
        stage: "showdown",
        status: "completed",
        updatedAt: now,
      });
    }
    return;
  }

  if (allActivePlayersHaveActed(orderedHands)) {
    const advanced = await advanceStage(ctx, game, orderedHands);

    if (!advanced) {
      await ctx.db.patch(game._id, {
        status: "completed",
        updatedAt: now,
      });
      return;
    }
  } else {
    await advanceTurn(ctx, game, orderedHands);
  }

  await scheduleBotTurnIfNeeded(ctx, game._id);
}
