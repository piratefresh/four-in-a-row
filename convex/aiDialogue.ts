/**
 * AI Dialogue Generation for Word Poker
 *
 * Generates personality-driven in-game dialogue for bot characters.
 * Uses two LLM calls per bot turn:
 * 1. Betting/showdown action (tool-use)
 * 2. Optional dialogue (freeform generation)
 *
 * This module handles the dialogue generation — deciding whether to speak
 * and what to say.
 */

import {
  type AIPersonality,
  AI_PERSONALITIES,
  type BotCharacterId,
  BOT_CHARACTERS,
} from "./aiStrategy";
import {
  getDialogueProfile,
  shouldGenerateDialogue,
  getTriggerDescription,
  getRandomReaction,
  type DialogueTrigger,
} from "./aiPersonalities";
export type { DialogueTrigger };
import { PROMPT_DIALOGUE } from "./aiPrompts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DialogueRequest = {
  botCharacterId: BotCharacterId;
  trigger: DialogueTrigger;
  gameState: string;
  recentMessages: string;
  randomFn?: () => number;
};

export type DialogueResult = {
  message: string;
  trigger: DialogueTrigger;
  botCharacterId: BotCharacterId;
  wasTemplateReaction: boolean;
};

// ---------------------------------------------------------------------------
// Dialogue generation logic
// ---------------------------------------------------------------------------

/**
 * Determine whether the bot should speak and generate a dialogue message.
 *
 * This is a pure function that can be called from Convex actions.
 * The actual LLM call is separate — this module prepares the prompt
 * and decides whether dialogue should be generated.
 */
export function prepareDialoguePrompt(
  request: DialogueRequest,
): { shouldSpeak: boolean; prompt: string } {
  const character = getCharacter(request.botCharacterId);
  const profile = getDialogueProfile(character.personality);
  const randomFn = request.randomFn ?? Math.random;

  if (!shouldGenerateDialogue(character.personality, request.trigger, randomFn())) {
    return { shouldSpeak: false, prompt: "" };
  }

  const prompt = PROMPT_DIALOGUE.build({
    botName: character.name,
    botTitle: character.title,
    personality: character.personality,
    personalityDescription: profile.systemPrompt
      .replace(/^You are /, "")
      .replace(/. You.*$/, "")
      .trim(),
    chattinessDescription: getChattinessDescription(character.personality),
    trigger: request.trigger,
    triggerDescription: getTriggerDescription(request.trigger),
    gameState: request.gameState,
    recentMessages: request.recentMessages,
    maxTokens: profile.maxTokens,
  });

  return { shouldSpeak: true, prompt };
}

/**
 * Try to get a quick template reaction instead of an LLM call.
 * This saves a network request for common reactions.
 */
export function tryTemplateReaction(
  request: DialogueRequest,
): DialogueResult | null {
  const character = getCharacter(request.botCharacterId);
  const randomFn = request.randomFn ?? Math.random;

  if (!shouldGenerateDialogue(character.personality, request.trigger, randomFn())) {
    return null;
  }

  const reaction = getRandomReaction(character.personality, request.trigger, randomFn);
  if (!reaction) {
    return null;
  }

  // Only use templates ~50% of the time when they exist
  // The other 50% we want the LLM to generate something more contextual
  if (randomFn() > 0.5) {
    return null;
  }

  return {
    message: reaction,
    trigger: request.trigger,
    botCharacterId: request.botCharacterId,
    wasTemplateReaction: true,
  };
}

/**
 * Clean and validate an LLM-generated dialogue response.
 * Strips quotes, truncates to max length, etc.
 */
export function cleanDialogueResponse(
  raw: string,
  maxTokens: number = 50,
): string {
  let cleaned = raw.trim();

  // Strip surrounding quotes if the LLM wrapped the response
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  // Strip "Jax:" or "Nora:" prefix if the LLM included it
  const namePrefixMatch = cleaned.match(/^(?:Jax|Nora|Ellis|Mira)(?:\s+\w*)?:\s*/i);
  if (namePrefixMatch) {
    cleaned = cleaned.slice(namePrefixMatch[0].length);
  }

  // Truncate at first newline (we want one-liners)
  const newlineIndex = cleaned.indexOf("\n");
  if (newlineIndex !== -1) {
    cleaned = cleaned.slice(0, newlineIndex);
  }

  // Rough character limit based on max tokens (avg ~4 chars per token)
  const maxChars = maxTokens * 4;
  if (cleaned.length > maxChars) {
    cleaned = cleaned.slice(0, maxChars).replace(/\s+\S*$/, "");
  }

  return cleaned;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCharacter(botCharacterId: BotCharacterId) {
  const character = BOT_CHARACTERS.find((c) => c.id === botCharacterId);
  if (!character) {
    throw new Error(`Unknown bot character: ${botCharacterId}`);
  }
  return character;
}

function getChattinessDescription(personality: AIPersonality): string {
  switch (personality) {
    case AI_PERSONALITIES.CAUTIOUS:
      return "You speak rarely. When you do, keep it brief and measured.";
    case AI_PERSONALITIES.BALANCED:
      return "You speak sometimes. Keep messages friendly and concise.";
    case AI_PERSONALITIES.AGGRESSIVE:
      return "You speak often. Keep messages short, bold, and punchy. Trash talk is welcome.";
    case AI_PERSONALITIES.CREATIVE:
      return "You speak often. Keep messages playful, witty, and fun. Wordplay and puns are your thing.";
    default:
      return "Keep messages brief and relevant.";
  }
}

/**
 * Build a succinct game state description for the dialogue prompt.
 */
export function buildGameStateDescription(args: {
  stage: string;
  pot: number;
  botChips: number;
  currentBet: number;
  isBotTurn: boolean;
}): string {
  const parts: string[] = [];

  parts.push(`Stage: ${args.stage}`);
  parts.push(`Pot: ${args.pot} chips`);
  parts.push(`Your chips: ${args.botChips}`);

  if (args.currentBet > 0) {
    parts.push(`Current bet: ${args.currentBet}`);
  }

  if (args.isBotTurn) {
    parts.push("It's your turn");
  }

  return parts.join(". ") + ".";
}