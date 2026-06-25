/**
 * Bot turn orchestration for betting rounds.
 *
 * Handles the full bot turn pipeline: validate game state, check for tutorial
 * mode, attempt AI decision via OpenRouter, fall back to deterministic engine,
 * apply overrides, and send dialogue. Calls back into human betting handlers
 * (check/call/raise/fold) via Convex mutations.
 */

import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  completeResolvedConfig,
  resolveConfig,
  type ResolvedGameConfig,
} from "../gameConfig";
import { FIRST_BOT_GAME_TUTORIAL_ID } from "../rooms/helpers";
import { tutorialBotBettingDecision } from "../tutorialBots";
import {
  AI_DEALER_PLAYER_ID,
  DEV_BOT_AUTH_PREFIX,
  sortHandsByTurnOrder,
} from "./gamesShared";
import {
  getBotCharacterForAuthUserId,
  getModelForDifficulty,
  AI_PERSONALITIES,
  isBluffLikely,
  shouldBelievePlayer,
} from "../aiStrategy";
import { AI_DIFFICULTY, type AIDifficulty } from "../aiBettingConstants";
import { isOpenRouterConfigured } from "../openRouterClient";
import { sendBotTurnDialogue, type BotDialogueContext } from "./gamesBotDialogue";

const BOT_AI_TIMEOUT_MS = 4_000;

type PlayerActionArgs = {
  gameId: Doc<"games">["_id"];
  playerId: string;
  clientIsMobile?: boolean;
};
type ScheduledBotTurnArgs = PlayerActionArgs & {
  expectedStage?: string;
  expectedCurrentPlayerIndex?: number;
  expectedTurnStartedAt?: number;
};

function getGameConfig(game: Doc<"games">): ResolvedGameConfig {
  return completeResolvedConfig(game.config ?? resolveConfig());
}

function logBotTurn(
  message: string,
  details: Record<string, unknown>,
) {
  console.log(`[bot-turn] ${message}`, details);
}

/**
 * Execute a bot's betting turn.
 *
 * Called via Convex scheduler from gamesProgression.scheduleBotTurnIfNeeded.
 * This is the single entry point for all bot betting behaviour — tutorial,
 * AI-driven, and deterministic fallback.
 */
export async function internalProcessBotTurnHandler(
  ctx: ActionCtx,
  args: ScheduledBotTurnArgs,
): Promise<
  | { ok: true; action: "check" | "call" | "fold"; playerId: string; reasoning?: string }
  | { ok: true; action: "raise"; playerId: string; raiseAmount: number; reasoning?: string }
  | { ok: false; reason: string }
> {
  logBotTurn("starting bot turn", {
    gameId: args.gameId,
    playerId: args.playerId,
  });
  const runtimeState = await ctx.runQuery(internal.games.internalGetGameRuntimeState, { gameId: args.gameId });
  const game = runtimeState?.game;
  if (!game || game.status !== "active") {
    logBotTurn("aborting bot turn because game is not active", {
      gameFound: !!game,
      gameStatus: game?.status,
    });
    return { ok: false, reason: "Game not active" };
  }
  if (game.stage === "final" || game.stage === "showdown") {
    logBotTurn("aborting bot turn because stage does not allow betting", {
      gameId: args.gameId,
      stage: game.stage,
    });
    return { ok: false, reason: `Bots do not act during ${game.stage}` };
  }
  if (
    args.expectedStage !== undefined &&
    (game.stage !== args.expectedStage ||
      game.currentPlayerIndex !== args.expectedCurrentPlayerIndex ||
      game.turnStartedAt !== args.expectedTurnStartedAt)
  ) {
    logBotTurn("aborting bot turn because the scheduled turn is stale", {
      expectedStage: args.expectedStage,
      actualStage: game.stage,
      expectedCurrentPlayerIndex: args.expectedCurrentPlayerIndex,
      actualCurrentPlayerIndex: game.currentPlayerIndex,
      expectedTurnStartedAt: args.expectedTurnStartedAt,
      actualTurnStartedAt: game.turnStartedAt,
    });
    return { ok: false, reason: "Scheduled bot turn is stale" };
  }
  const hands = runtimeState.hands;
  if (hands.length === 0) {
    logBotTurn("aborting bot turn because no hands were found", {
      gameId: args.gameId,
    });
    return { ok: false, reason: "No hands found" };
  }
  const orderedHands = sortHandsByTurnOrder(hands);
  const currentTurnHand = orderedHands[game.currentPlayerIndex];
  if (!currentTurnHand) {
    logBotTurn("aborting bot turn because current turn index is invalid", {
      gameId: args.gameId,
      currentPlayerIndex: game.currentPlayerIndex,
      handCount: orderedHands.length,
    });
    return { ok: false, reason: "Current turn index out of range" };
  }
  if (currentTurnHand.playerId !== args.playerId) {
    logBotTurn("aborting bot turn because the turn moved", {
      expectedPlayerId: args.playerId,
      actualPlayerId: currentTurnHand.playerId,
      currentPlayerIndex: game.currentPlayerIndex,
    });
    return { ok: false, reason: "Turn changed before bot action executed" };
  }
  const amountToCall = game.currentBet - currentTurnHand.betThisRound;
  const runCheck = () => ctx.runMutation(api.games.check, { gameId: args.gameId, playerId: args.playerId });
  const runCall = () => ctx.runMutation(api.games.call, { gameId: args.gameId, playerId: args.playerId });
  const runFold = () => ctx.runMutation(api.games.fold, { gameId: args.gameId, playerId: args.playerId });

  const roomId = game.roomId as Id<"rooms">;
  const room = runtimeState.room;

  // ── Tutorial bot path ──────────────────────────────────────────

  if (room?.tutorialId === FIRST_BOT_GAME_TUTORIAL_ID) {
    const tutorialDecision = tutorialBotBettingDecision({
      currentBet: game.currentBet,
      betThisRound: currentTurnHand.betThisRound,
      chips: currentTurnHand.chips,
    });
    logBotTurn("tutorial bot betting decision", {
      gameId: args.gameId,
      playerId: args.playerId,
      action: tutorialDecision.action,
      reasoning: tutorialDecision.reasoning,
    });
    if (tutorialDecision.action === "call") {
      await runCall();
      return { ok: true, action: "call" as const, playerId: args.playerId, reasoning: tutorialDecision.reasoning };
    }
    await runCheck();
    return { ok: true, action: "check" as const, playerId: args.playerId, reasoning: tutorialDecision.reasoning };
  }

  // ── Build dialogue context ─────────────────────────────────────

  const botPlayer = runtimeState.players.find((p) => String(p._id) === args.playerId);
  const botAuthUserId = botPlayer?.authUserId ?? "";
  const difficulty = (runtimeState.room?.difficulty as AIDifficulty | undefined) ?? AI_DIFFICULTY.MEDIUM;

  const dialogueCtx: BotDialogueContext = {
    gameId: args.gameId,
    roomId,
    playerId: args.playerId,
    botAuthUserId,
    gameStage: game.stage,
    pot: game.pot,
    botChips: currentTurnHand.chips,
    currentBet: game.currentBet,
    privateTiles: currentTurnHand.tiles,
    isMobileAudience: game.lastAudienceIsMobile === true,
  };

  const runDialogue = (action: string, reasoning?: string) =>
    sendBotTurnDialogue(ctx, dialogueCtx, action, reasoning);

  // ── Deterministic fallback (no API key) ────────────────────────

  if (!isOpenRouterConfigured()) {
    logBotTurn("OPENROUTER_API_KEY missing, using betting fallback", {
      gameId: args.gameId,
      playerId: args.playerId,
      stage: game.stage,
      currentBet: game.currentBet,
      amountToCall,
      chips: currentTurnHand.chips,
    });
    if (game.currentBet === 0 || amountToCall <= 0) {
      await runCheck();
      logBotTurn("fallback action resolved to check", { playerId: currentTurnHand.playerId });
      await runDialogue("check");
      return { ok: true, action: "check", playerId: currentTurnHand.playerId };
    }
    if (currentTurnHand.chips >= amountToCall) {
      await runCall();
      logBotTurn("fallback action resolved to call", { playerId: currentTurnHand.playerId, amountToCall });
      await runDialogue("call");
      return { ok: true, action: "call", playerId: currentTurnHand.playerId };
    }
    await runFold();
    logBotTurn("fallback action resolved to fold", { playerId: currentTurnHand.playerId, amountToCall, chips: currentTurnHand.chips });
    await runDialogue("fold");
    return { ok: true, action: "fold", playerId: currentTurnHand.playerId };
  }

  // ── AI-driven bot turn ─────────────────────────────────────────

  try {
    const character = getBotCharacterForAuthUserId(botAuthUserId);
    const personality = character?.personality ?? AI_PERSONALITIES.BALANCED;

    const recentMessages = await ctx.runQuery(api.messages.getRecentMessages, {
      roomId,
      limit: 10,
    });

    const playerMessages = recentMessages
      .filter((m) => m.type === "player")
      .map((m) => m.text);

    const bluffDetected = isBluffLikely(playerMessages);
    const believesPlayer = shouldBelievePlayer(personality, bluffDetected);

    logBotTurn("requesting AI betting decision", {
      gameId: args.gameId,
      playerId: args.playerId,
      stage: game.stage,
      currentBet: game.currentBet,
      amountToCall,
      betThisRound: currentTurnHand.betThisRound,
      chips: currentTurnHand.chips,
      pot: game.pot,
      raisesThisRound: game.raisesThisRound ?? 0,
      difficulty,
      bluffDetected,
      believesPlayer,
    });
    const config = getGameConfig(game);
    const decision = await ctx.runAction(internal.ai.aiDecideBet, {
      difficulty,
      personality,
      handTiles: currentTurnHand.tiles,
      communityTiles: game.communityTiles,
      stage: game.stage,
      currentBet: game.currentBet,
      chips: currentTurnHand.chips,
      pot: game.pot,
      raiseLadder: config.raiseLadder,
      maxRaises: config.maxRaisesPerRound,
      currentRaises: game.raisesThisRound ?? 0,
      timeoutMs: BOT_AI_TIMEOUT_MS,
      bluffDetected,
      believesPlayer: believesPlayer ?? undefined,
      gameId: args.gameId,
      roomId,
      playerId: args.playerId,
      playerName: botPlayer?.name ?? character?.name,
      characterId: character?.id,
    });
    logBotTurn("received AI betting decision", {
      playerId: currentTurnHand.playerId,
      action: decision.action,
      raiseAmount: decision.raiseAmount,
      reasoning: decision.reasoning,
    });

    // ── Process AI decision ────────────────────────────────────

    if (decision.action === "fold") {
      // Never fold when checking is free
      if (amountToCall <= 0) {
        await runCheck();
        logBotTurn("overrode AI fold to check (no bet to call)", { playerId: currentTurnHand.playerId, reasoning: decision.reasoning });
        await runDialogue("check", decision.reasoning);
        return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: `Overrode fold: ${decision.reasoning}` };
      }
      await runFold();
      logBotTurn("executed AI fold", { playerId: currentTurnHand.playerId, reasoning: decision.reasoning });
      await runDialogue("fold", decision.reasoning);
      return { ok: true, action: "fold", playerId: currentTurnHand.playerId, reasoning: decision.reasoning };
    }
    if (decision.action === "check" && amountToCall <= 0) {
      await runCheck();
      logBotTurn("executed AI check", { playerId: currentTurnHand.playerId, reasoning: decision.reasoning });
      await runDialogue("check", decision.reasoning);
      return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: decision.reasoning };
    }
    if (decision.action === "call") {
      if (amountToCall <= 0) {
        await runCheck();
        logBotTurn("converted AI call into check because there was nothing to call", {
          playerId: currentTurnHand.playerId,
          reasoning: decision.reasoning,
        });
        await runDialogue("check", decision.reasoning);
        return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: decision.reasoning };
      }
      if (currentTurnHand.chips < amountToCall) {
        await runFold();
        logBotTurn("converted AI call into fold because chips were insufficient", {
          playerId: currentTurnHand.playerId,
          amountToCall,
          chips: currentTurnHand.chips,
        });
        await runDialogue("fold", "Insufficient chips");
        return { ok: true, action: "fold", playerId: currentTurnHand.playerId, reasoning: "Insufficient chips" };
      }
      await runCall();
      logBotTurn("executed AI call", { playerId: currentTurnHand.playerId, amountToCall, reasoning: decision.reasoning });
      await runDialogue("call", decision.reasoning);
      return { ok: true, action: "call", playerId: currentTurnHand.playerId, reasoning: decision.reasoning };
    }
    if (decision.action === "raise" && decision.raiseAmount) {
      const raiseToAmount = decision.raiseAmount;
      const additionalChipsNeeded = raiseToAmount - currentTurnHand.betThisRound;
      if (additionalChipsNeeded <= currentTurnHand.chips && (game.raisesThisRound ?? 0) < config.maxRaisesPerRound && raiseToAmount === config.raiseLadder.find((amount) => amount > game.currentBet)) {
        await ctx.runMutation(api.games.raise, { gameId: args.gameId, playerId: args.playerId, raiseToAmount });
        logBotTurn("executed AI raise", {
          playerId: currentTurnHand.playerId,
          raiseToAmount,
          additionalChipsNeeded,
          reasoning: decision.reasoning,
        });
        await runDialogue("raise", decision.reasoning);
        return { ok: true, action: "raise", playerId: currentTurnHand.playerId, raiseAmount: raiseToAmount, reasoning: decision.reasoning };
      }
      logBotTurn("AI raise was invalid, using fallback resolution", {
        playerId: currentTurnHand.playerId,
        raiseToAmount,
        additionalChipsNeeded,
        currentBet: game.currentBet,
        raisesThisRound: game.raisesThisRound ?? 0,
      });
      if (amountToCall > 0 && currentTurnHand.chips >= amountToCall) {
        await runCall();
        logBotTurn("invalid AI raise downgraded to call", { playerId: currentTurnHand.playerId, amountToCall });
        await runDialogue("call", "Raise invalid, downgraded to call");
        return { ok: true, action: "call", playerId: currentTurnHand.playerId, reasoning: "Insufficient chips to raise" };
      }
      if (amountToCall <= 0) {
        await runCheck();
        logBotTurn("invalid AI raise downgraded to check", { playerId: currentTurnHand.playerId });
        await runDialogue("check", "Raise invalid, downgraded to check");
        return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: "AI fallback" };
      }
      await runFold();
      logBotTurn("invalid AI raise downgraded to fold", { playerId: currentTurnHand.playerId, amountToCall, chips: currentTurnHand.chips });
      await runDialogue("fold", "Insufficient chips");
      return { ok: true, action: "fold", playerId: currentTurnHand.playerId, reasoning: "Insufficient chips" };
    }
    logBotTurn("AI returned an unusable decision, applying generic fallback", {
      playerId: currentTurnHand.playerId,
      action: decision.action,
      amountToCall,
    });
    if (amountToCall <= 0) {
      await runCheck();
      logBotTurn("generic fallback resolved to check", { playerId: currentTurnHand.playerId });
      await runDialogue("check", "AI fallback");
      return { ok: true, action: "check", playerId: currentTurnHand.playerId, reasoning: "AI fallback" };
    }
    await runFold();
    logBotTurn("generic fallback resolved to fold", { playerId: currentTurnHand.playerId, amountToCall });
    await runDialogue("fold", "AI fallback");
    return { ok: true, action: "fold", playerId: currentTurnHand.playerId, reasoning: "AI fallback" };
  } catch (error) {
    console.error("[bot-turn] AI betting execution failed", {
      gameId: args.gameId,
      playerId: args.playerId,
      error: String(error),
    });
    if (game.currentBet === 0 || amountToCall <= 0) {
      await runCheck();
      logBotTurn("error fallback resolved to check", { playerId: currentTurnHand.playerId });
      await runDialogue("check");
      return { ok: true, action: "check", playerId: currentTurnHand.playerId };
    }
    if (currentTurnHand.chips >= amountToCall) {
      await runCall();
      logBotTurn("error fallback resolved to call", { playerId: currentTurnHand.playerId, amountToCall });
      await runDialogue("call");
      return { ok: true, action: "call", playerId: currentTurnHand.playerId };
    }
    await runFold();
    logBotTurn("error fallback resolved to fold", { playerId: currentTurnHand.playerId, amountToCall, chips: currentTurnHand.chips });
    await runDialogue("fold");
    return { ok: true, action: "fold", playerId: currentTurnHand.playerId };
  }
}
