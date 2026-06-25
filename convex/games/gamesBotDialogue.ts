/**
 * Bot dialogue engine.
 *
 * Handles template-based reactions, RAG-cached responses, and LLM-generated
 * dialogue for bot players during betting. Separated from the betting
 * orchestration so each can vary independently.
 */

import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  getBotCharacterForAuthUserId,
  getModelForDifficulty,
  AI_PERSONALITIES,
  isBluffLikely,
  shouldBelievePlayer,
} from "../aiStrategy";
import {
  type DialogueTrigger,
  prepareDialoguePrompt,
  tryTemplateReaction,
  buildGameStateDescription,
  cleanDialogueResponse,
  parseDialogueResponse,
  dialogueResponseToTraceText,
  type DialogueResponse,
} from "../aiDialogue";
import { getDialogueProfile } from "../aiPersonalities";
import { isOpenRouterConfigured, callOpenRouterChat } from "../openRouterClient";
import { redactReasoningNumbersForChat } from "../reasoningRedaction";
import {
  BOT_DIALOGUE_PILE_ON_REDUCTION,
  redactBracketedCandidateWords,
  redactPrivateTileLetters,
} from "./gamesShared";

// ── Types ──────────────────────────────────────────────────────────

export interface BotDialogueContext {
  gameId: Doc<"games">["_id"];
  roomId: Id<"rooms">;
  playerId: string;
  botAuthUserId: string;
  gameStage: string;
  pot: number;
  botChips: number;
  currentBet: number;
  /** Whether the bot currently has private tiles visible (for redaction). */
  privateTiles: Array<{ kind?: string; letter?: string; options?: string[] }>;
  isMobileAudience: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────

function mapActionToDialogueTrigger(action: string): DialogueTrigger | null {
  switch (action) {
    case "fold": return "botFolds";
    case "raise": return "botRaises";
    case "call": return "playerCall";
    case "check": return "playerCheck";
    default: return null;
  }
}

function formatRecentMessages(
  messages: Array<{ senderName: string; text: string; type: string; repliedByBots?: string[] }>,
  _botName: string,
): string {
  if (messages.length === 0) return "";
  return messages
    .map((msg) => {
      if (msg.type === "system") return `[System] ${msg.text}`;
      if (msg.type === "ai") {
        return `[${msg.senderName} (bot)] ${msg.text}`;
      }
      const repliedTag = msg.repliedByBots?.length
        ? ` (replied by: ${msg.repliedByBots.join(", ")})`
        : "";
      return `${msg.senderName}: ${msg.text}${repliedTag}`;
    })
    .join("\n");
}

async function sendBotDialogueResponse(
  ctx: ActionCtx,
  args: {
    roomId: Id<"rooms">;
    playerId: string;
    response: DialogueResponse;
  },
): Promise<void> {
  if (args.response.type === "sticker") {
    await ctx.runMutation(internal.stickers.sendAsAI, {
      roomId: args.roomId,
      playerId: args.playerId as any,
      stickerKey: args.response.stickerKey,
    });
    return;
  }

  await ctx.runMutation(api.messages.sendAsAI, {
    roomId: args.roomId,
    playerId: args.playerId as any,
    text: args.response.message,
  });
}

// ── Reasoning streaming ────────────────────────────────────────────

/**
 * Stream bot reasoning into chat as short "thinking aloud" messages.
 * Sends 2-3 short system messages with delays for a streaming effect.
 */
async function streamReasoning(
  ctx: ActionCtx,
  roomId: Id<"rooms">,
  botName: string,
  reasoning: string,
  privateTiles: Array<{ kind?: string; letter?: string; options?: string[] }>,
): Promise<void> {
  const messages: string[] = [];
  const visibleReasoning = redactPrivateTileLetters(
    redactBracketedCandidateWords(reasoning),
    privateTiles,
  );

  // Extract key pieces: RR stats and final action.
  const segments = visibleReasoning.split(" | ").map((s) => s.trim());

  // First message: hand analysis (RR info)
  for (const seg of segments) {
    if (seg.startsWith("RR=")) {
      messages.push(`Analyzing: ${seg}`);
    }
  }

  // Second message: the decision
  for (const seg of segments) {
    if (seg.includes("->")) {
      const action = seg.split("->").pop()?.trim();
      const labels: Record<string, string> = {
        fold: "folding", call: "calling", raise: "raising", check: "checking",
      };
      messages.push(`Decision: ${labels[action ?? ""] ?? action}`);
    }
  }

  // Fallback: send raw reasoning if we couldn't parse anything
  if (messages.length === 0) {
    await ctx.runMutation(api.messages.sendSystemMessage, {
      roomId,
      text: `[${botName}] ${redactReasoningNumbersForChat(visibleReasoning)}`,
    });
    return;
  }

  for (let i = 0; i < messages.length; i++) {
    await ctx.runMutation(api.messages.sendSystemMessage, {
      roomId,
      text: `[${botName}] ${redactReasoningNumbersForChat(messages[i]!) }`,
    });
    if (i < messages.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

// ── Main dialogue entry points ─────────────────────────────────────

/**
 * Send dialogue after a bot takes a betting action.
 *
 * This is the extracted version of the sendDialogue closure from
 * internalProcessBotTurnHandler. It takes a context object instead of
 * capturing local variables.
 */
export async function sendBotTurnDialogue(
  ctx: ActionCtx,
  dialogueCtx: BotDialogueContext,
  action: string,
  reasoning?: string,
): Promise<void> {
  const { botAuthUserId } = dialogueCtx;
  if (!botAuthUserId) return;

  try {
    const character = getBotCharacterForAuthUserId(botAuthUserId);
    const personality = character?.personality ?? AI_PERSONALITIES.BALANCED;

    const recentMessages = await ctx.runQuery(api.messages.getRecentMessages, {
      roomId: dialogueCtx.roomId,
      limit: 10,
    });

    const playerMessages = recentMessages
      .filter((m) => m.type === "player")
      .map((m) => m.text);

    const bluffDetected = isBluffLikely(playerMessages);
    const believesPlayer = shouldBelievePlayer(personality, bluffDetected);

    await maybeSendBotDialogue(ctx, {
      gameId: dialogueCtx.gameId,
      roomId: dialogueCtx.roomId,
      playerId: dialogueCtx.playerId,
      botAuthUserId,
      action,
      gameStage: dialogueCtx.gameStage,
      pot: dialogueCtx.pot,
      botChips: dialogueCtx.botChips,
      currentBet: dialogueCtx.currentBet,
      believesPlayer,
      isMobileAudience: dialogueCtx.isMobileAudience,
    });

    if (reasoning) {
      if (dialogueCtx.isMobileAudience) {
        const visibleReasoning = redactReasoningNumbersForChat(
          redactPrivateTileLetters(
            redactBracketedCandidateWords(reasoning),
            dialogueCtx.privateTiles,
          ),
        );
        await ctx.runMutation(api.messages.sendAsAI, {
          roomId: dialogueCtx.roomId,
          playerId: dialogueCtx.playerId as any,
          text: visibleReasoning,
        });
      } else {
        await streamReasoning(
          ctx,
          dialogueCtx.roomId,
          character?.name ?? "Bot",
          reasoning,
          dialogueCtx.privateTiles,
        );
      }
    }
  } catch (dialogError) {
    console.warn("[bot-turn] sendDialogue failed", {
      gameId: dialogueCtx.gameId,
      playerId: dialogueCtx.playerId,
      action,
      error: String(dialogError),
    });
  }
}

/**
 * Attempt to generate and send AI dialogue after a bot takes an action.
 * This is a best-effort side effect — failures are logged but don't affect game flow.
 */
export async function maybeSendBotDialogue(
  ctx: ActionCtx,
  args: {
    gameId: Doc<"games">["_id"];
    roomId: Doc<"rooms">["_id"];
    playerId: string;
    botAuthUserId: string;
    action: string;
    gameStage: string;
    pot: number;
    botChips: number;
    currentBet: number;
    believesPlayer?: boolean | null;
    isMobileAudience?: boolean;
  },
): Promise<void> {
  try {
    const character = getBotCharacterForAuthUserId(args.botAuthUserId);
    if (!character) return;

    const trigger = mapActionToDialogueTrigger(args.action);
    if (!trigger) return;

    const recentMessages = await ctx.runQuery(api.messages.getRecentMessages, {
      roomId: args.roomId,
      limit: 10,
    });

    // Find the most recent player message to track pile-on responses
    let latestPlayerMsg: (typeof recentMessages)[number] | undefined;
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      if (recentMessages[i].type === "player") {
        latestPlayerMsg = recentMessages[i];
        break;
      }
    }
    const alreadyRepliedCount = latestPlayerMsg?.repliedByBots?.length ?? 0;

    // If other bots already replied to the latest player message, dramatically reduce
    // the chance of this bot also responding
    if (alreadyRepliedCount > 0) {
      const reductionFactor = Math.pow(BOT_DIALOGUE_PILE_ON_REDUCTION, alreadyRepliedCount);
      if (Math.random() > reductionFactor) return;
    }

    const recentMessagesStr = formatRecentMessages(recentMessages, character.name);

    const templateResult = tryTemplateReaction({
      botCharacterId: character.id as any,
      trigger,
      gameState: "",
      recentMessages: recentMessagesStr,
      believesPlayer: args.believesPlayer ?? null,
      isMobileAudience: args.isMobileAudience === true,
    });

    if (templateResult) {
      await sendBotDialogueResponse(ctx, {
        roomId: args.roomId,
        playerId: args.playerId,
        response: templateResult.response,
      });
      const dialogueMessage = dialogueResponseToTraceText(templateResult.response);
      await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
        gameId: args.gameId,
        roomId: args.roomId,
        category: "ai_dialogue",
        component: "dialogue",
        operation: "send_dialogue",
        decisionSource: "template",
        provider: "template",
        playerId: args.playerId,
        playerName: character.name,
        characterId: character.id,
        isBot: true,
        stage: args.gameStage,
        action: args.action,
        personality: character.personality,
        dialogueTrigger: trigger,
        dialogueMessage,
        dialogueSource: "template",
        dialogueSent: true,
        bluffDetected: false,
        believesPlayer: args.believesPlayer ?? null,
        usedFallback: true,
        metadata: { source: "template", response: templateResult.response },
      });
      if (latestPlayerMsg && alreadyRepliedCount < 3) {
        try {
          await ctx.runMutation(api.messages.markPlayerMessageReplied, {
            messageId: latestPlayerMsg._id,
            botName: character.name,
          });
        } catch {}
      }
      return;
    }

    const gameStateDesc = buildGameStateDescription({
      stage: args.gameStage,
      pot: args.pot,
      botChips: args.botChips,
      currentBet: args.currentBet,
      isBotTurn: false,
    });

    const { shouldSpeak, prompt } = prepareDialoguePrompt({
      botCharacterId: character.id as any,
      trigger,
      gameState: gameStateDesc,
      recentMessages: recentMessagesStr,
      believesPlayer: args.believesPlayer ?? null,
      isMobileAudience: args.isMobileAudience === true,
    });

    if (!shouldSpeak) return;

    if (!isOpenRouterConfigured()) return;

    if (args.isMobileAudience === true) {
      const model = getModelForDifficulty("medium");
      const profile = getDialogueProfile(character.personality);
      const { content: rawResponse, latencyMs } = await callOpenRouterChat({
        model,
        prompt,
        timeoutMs: 3000,
        responseFormat: { type: "json_object" },
      });
      const response =
        parseDialogueResponse(rawResponse) ?? {
          type: "text" as const,
          message: cleanDialogueResponse(rawResponse, profile.maxTokens),
        };
      if (response.type === "text" && !response.message) return;

      await sendBotDialogueResponse(ctx, {
        roomId: args.roomId,
        playerId: args.playerId,
        response,
      });

      const dialogueMessage = dialogueResponseToTraceText(response);
      await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
        gameId: args.gameId,
        roomId: args.roomId,
        category: "ai_dialogue",
        component: "dialogue",
        operation: "send_dialogue",
        decisionSource: "llm",
        provider: "openrouter",
        latencyMs,
        playerId: args.playerId,
        playerName: character.name,
        characterId: character.id,
        isBot: true,
        stage: args.gameStage,
        action: args.action,
        model,
        personality: character.personality,
        dialogueTrigger: trigger,
        dialogueMessage,
        dialogueSource: response.type,
        dialogueSent: true,
        bluffDetected: false,
        believesPlayer: args.believesPlayer ?? null,
        inputPrompt: prompt,
        outputRaw: rawResponse,
        outputParsed: JSON.stringify(response),
        usedFallback: false,
        metadata: { latencyMs, response },
      });

      if (latestPlayerMsg && alreadyRepliedCount < 3) {
        try {
          await ctx.runMutation(api.messages.markPlayerMessageReplied, {
            messageId: latestPlayerMsg._id,
            botName: character.name,
          });
        } catch {}
      }
      return;
    }

    // RAG: try to find a cached response for similar context
    const contextText = `Trigger: ${trigger}. ${gameStateDesc} Chat: ${recentMessagesStr || "none"}`;

    let cachedResponse: string | null = null;
    try {
      const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
        text: contextText,
      });

      cachedResponse = await ctx.runAction(internal.aiCache.searchDialogueCache, {
        embedding,
        personality: character.personality,
        trigger,
      });
    } catch (embedError) {
      console.warn("[bot-dialogue] RAG lookup failed, falling through to LLM", {
        error: String(embedError),
      });
    }

    if (cachedResponse) {
      await ctx.runMutation(api.messages.sendAsAI, {
        roomId: args.roomId,
        playerId: args.playerId as any,
        text: cachedResponse,
      });
      await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
        gameId: args.gameId,
        roomId: args.roomId,
        category: "ai_dialogue",
        component: "dialogue",
        operation: "send_dialogue",
        decisionSource: "cache",
        provider: "rag_cache",
        cacheStatus: "hit",
        playerId: args.playerId,
        playerName: character.name,
        characterId: character.id,
        isBot: true,
        stage: args.gameStage,
        action: args.action,
        personality: character.personality,
        dialogueTrigger: trigger,
        dialogueMessage: cachedResponse,
        dialogueSource: "rag_cache",
        dialogueSent: true,
        bluffDetected: false,
        believesPlayer: args.believesPlayer ?? null,
        inputPrompt: prompt,
        usedFallback: true,
        metadata: { source: "rag_cache", contextText },
      });
      if (latestPlayerMsg && alreadyRepliedCount < 3) {
        try {
          await ctx.runMutation(api.messages.markPlayerMessageReplied, {
            messageId: latestPlayerMsg._id,
            botName: character.name,
          });
        } catch {}
      }
      return;
    }

    // Cache miss: generate via LLM
    const model = getModelForDifficulty("medium");
    const profile = getDialogueProfile(character.personality);

    const { content: rawResponse, latencyMs } = await callOpenRouterChat({
      model,
      prompt,
      timeoutMs: 3000,
      responseFormat: { type: "json_object" },
    });
    const parsed = parseDialogueResponse(rawResponse);
    const cleaned =
      parsed?.type === "text"
        ? parsed.message
        : cleanDialogueResponse(rawResponse, profile.maxTokens);

    if (!cleaned) return;

    // Store in cache for future reuse (best-effort)
    try {
      const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
        text: contextText,
      });

      await ctx.runMutation(internal.aiCache.insertDialogueCacheEntry, {
        personality: character.personality,
        trigger,
        contextText,
        embedding,
        responseText: cleaned,
      });
    } catch (cacheError) {
      console.warn("[bot-dialogue] Failed to cache dialogue response", {
        error: String(cacheError),
      });
    }

    await ctx.runMutation(api.messages.sendAsAI, {
      roomId: args.roomId,
      playerId: args.playerId as any,
      text: cleaned,
    });

    await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
      gameId: args.gameId,
      roomId: args.roomId,
      category: "ai_dialogue",
      component: "dialogue",
      operation: "send_dialogue",
      decisionSource: "llm",
      provider: "openrouter",
      latencyMs,
      playerId: args.playerId,
      playerName: character.name,
      characterId: character.id,
      isBot: true,
      stage: args.gameStage,
      action: args.action,
      model,
      personality: character.personality,
      dialogueTrigger: trigger,
      dialogueMessage: cleaned,
      dialogueSource: "llm",
      dialogueSent: true,
      bluffDetected: false,
      believesPlayer: args.believesPlayer ?? null,
      inputPrompt: prompt,
      outputRaw: rawResponse,
      outputParsed: cleaned,
      usedFallback: false,
      metadata: { latencyMs, contextText },
    });

    if (latestPlayerMsg && alreadyRepliedCount < 3) {
      try {
        await ctx.runMutation(api.messages.markPlayerMessageReplied, {
          messageId: latestPlayerMsg._id,
          botName: character.name,
        });
      } catch {}
    }
  } catch (error) {
    console.warn("[bot-dialogue] Failed to generate dialogue", { error: String(error) });
  }
}
