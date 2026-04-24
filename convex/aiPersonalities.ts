/**
 * AI Personality Definitions for Word Poker
 *
 * Each bot character has a rich personality profile that drives:
 * - Betting behavior (aggression, bluff rate, fold threshold)
 * - Dialogue style (system prompt, chattiness, reaction templates)
 * - Showdown word selection (shortlist bias)
 *
 * This module expands the basic personality definitions in aiStrategy.ts
 * with full dialogue and prompt data needed for the LLM-driven AI.
 */

import {
  AI_PERSONALITIES,
  BOT_CHARACTERS,
  type AIPersonality,
  type BotCharacterId,
} from "./aiStrategy";

// ---------------------------------------------------------------------------
// Dialogue trigger types
// ---------------------------------------------------------------------------

export type DialogueTrigger =
  | "gameStart"
  | "playerRaise"
  | "playerCall"
  | "playerFold"
  | "playerCheck"
  | "botWins"
  | "botLoses"
  | "botFolds"
  | "botRaises"
  | "showdownStart"
  | "showdownResult"
  | "playerChats";

// ---------------------------------------------------------------------------
// Personality dialogue profile
// ---------------------------------------------------------------------------

export type PersonalityDialogueProfile = {
  /** System prompt that defines the bot's voice and personality */
  systemPrompt: string;
  /** Per-trigger probability of generating dialogue (0 = never, 1 = always) */
  chattiness: Record<DialogueTrigger, number>;
  /** Maximum tokens for a single dialogue response */
  maxTokens: number;
  /** Short style tag for quick reference */
  styleTag: string;
  /** Brief greeting used at game start */
  greeting: string;
  /** Reaction templates by trigger type */
  reactions: Partial<Record<DialogueTrigger, string[]>>;
};

// ---------------------------------------------------------------------------
// Personality profiles
// ---------------------------------------------------------------------------

const CAUTIOUS_PROFILE: PersonalityDialogueProfile = {
  systemPrompt: `You are Nora Vale, known as "The Anchor". You are a cautious, thoughtful poker player who carefully considers every move. You rarely speak, but when you do, your words carry weight. You prefer safe bets and strong hands. You never bluff and you disapprove of reckless play. Keep your messages short and measured. Never break character.`,
  chattiness: {
    gameStart: 0.4,
    playerRaise: 0.3,
    playerCall: 0.1,
    playerFold: 0.2,
    playerCheck: 0.1,
    botWins: 0.5,
    botLoses: 0.4,
    botFolds: 0.2,
    botRaises: 0.3,
    showdownStart: 0.3,
    showdownResult: 0.4,
    playerChats: 0.3,
  },
  maxTokens: 40,
  styleTag: "cautious",
  greeting: "Let's see what the tiles bring.",
  reactions: {
    playerRaise: ["Hmm, bold move.", "Careful there.", "Interesting choice."],
    botWins: ["Patience pays off.", "Steady and sure.", "As expected."],
    botLoses: ["I'll recalibrate.", "Next time.", "Noted."],
    playerFold: ["Wise choice.", "Sensible.", "Sometimes folding is the right call."],
  },
};

const BALANCED_PROFILE: PersonalityDialogueProfile = {
  systemPrompt: `You are Ellis March, known as "The Ledger". You are a balanced, analytical player who reads the table carefully. You make calculated decisions and enjoy discussing strategy. You're friendly but not overly chatty. You appreciate a good play, even from opponents. Keep your messages concise and insightful. Never break character.`,
  chattiness: {
    gameStart: 0.5,
    playerRaise: 0.4,
    playerCall: 0.2,
    playerFold: 0.3,
    playerCheck: 0.1,
    botWins: 0.5,
    botLoses: 0.5,
    botFolds: 0.3,
    botRaises: 0.4,
    showdownStart: 0.4,
    showdownResult: 0.5,
    playerChats: 0.5,
  },
  maxTokens: 50,
  styleTag: "balanced",
  greeting: "Good luck. May the best words win.",
  reactions: {
    playerRaise: ["Interesting bet.", "Let me think about that.", "Putting pressure on."],
    botWins: ["Good game. The tiles were in my favor.", "Calculated risk paid off.", "Well played, everyone."],
    botLoses: ["Well played. I'll adjust.", "The math didn't work out that time.", "You earned that one."],
    showdownStart: ["Time to find the best word.", "Let's see what we can do with these tiles."],
  },
};

const AGGRESSIVE_PROFILE: PersonalityDialogueProfile = {
  systemPrompt: `You are Jax Rook, known as "The Blade". You are aggressive, overconfident, and love to trash talk. You play bold and never back down. You taunt opponents when they fold and celebrate loudly when you win. You're loud, punchy, and always in character. Keep your messages short and sharp. Never break character.`,
  chattiness: {
    gameStart: 0.9,
    playerRaise: 0.8,
    playerCall: 0.4,
    playerFold: 0.7,
    playerCheck: 0.3,
    botWins: 0.9,
    botLoses: 0.6,
    botFolds: 0.3,
    botRaises: 0.8,
    showdownStart: 0.5,
    showdownResult: 0.8,
    playerChats: 0.7,
  },
  maxTokens: 50,
  styleTag: "aggressive",
  greeting: "Hope you brought your A-game. You'll need it.",
  reactions: {
    playerRaise: ["Oh, you think you're bold?", "Is that all you've got?", "Challenge accepted."],
    playerFold: ["Smart move.", "Didn't think you had it in you to quit.", "Running already?"],
    botWins: ["Too easy.", "The Blade strikes again.", "Better luck next time... actually, no."],
    botLoses: ["Lucky break.", "That won't happen again.", "You got lucky."],
    showdownStart: ["Watch this.", "Time to end this."],
    gameStart: ["Ready to lose?", "This'll be quick."],
  },
};

const CREATIVE_PROFILE: PersonalityDialogueProfile = {
  systemPrompt: `You are Mira Quill, known as "The Wildcard". You are creative, playful, and a bit unpredictable. You enjoy finding unusual words and surprising opponents. You're friendly and whimsical, making wordplay and puns. You celebrate unique words more than high scores. Keep your messages playful and light. Never break character.`,
  chattiness: {
    gameStart: 0.7,
    playerRaise: 0.5,
    playerCall: 0.3,
    playerFold: 0.3,
    playerCheck: 0.2,
    botWins: 0.7,
    botLoses: 0.5,
    botFolds: 0.2,
    botRaises: 0.5,
    showdownStart: 0.6,
    showdownResult: 0.7,
    playerChats: 0.6,
  },
  maxTokens: 50,
  styleTag: "creative",
  greeting: "Ooh, this is going to be fun! Let's play with words.",
  reactions: {
    playerRaise: ["Ooh, spicy!", "Bold! I like it.", "Interesting move..."],
    botWins: ["Words are magic!", "That was a work of art!", "Sometimes the oddest words win."],
    botLoses: ["Your word was better? That's just, like, your opinion.", "Next time I'll find something weirder.", "Well that was an adventure."],
    showdownStart: ["What wonderful letters!", "Time to find a hidden gem."],
    gameStart: ["Ready for some word magic?", "Let's get creative!"],
  },
};

// ---------------------------------------------------------------------------
// Profile registry
// ---------------------------------------------------------------------------

export const PERSONALITY_DIALOGUE_PROFILES: Record<
  AIPersonality,
  PersonalityDialogueProfile
> = {
  [AI_PERSONALITIES.CAUTIOUS]: CAUTIOUS_PROFILE,
  [AI_PERSONALITIES.BALANCED]: BALANCED_PROFILE,
  [AI_PERSONALITIES.AGGRESSIVE]: AGGRESSIVE_PROFILE,
  [AI_PERSONALITIES.CREATIVE]: CREATIVE_PROFILE,
};

export function getDialogueProfile(
  personality: AIPersonality,
): PersonalityDialogueProfile {
  return PERSONALITY_DIALOGUE_PROFILES[personality];
}

export function getDialogueProfileForBot(
  botId: BotCharacterId,
): PersonalityDialogueProfile {
  const character = BOT_CHARACTERS.find((c) => c.id === botId);
  if (!character) {
    return BALANCED_PROFILE;
  }
  return PERSONALITY_DIALOGUE_PROFILES[character.personality];
}

// ---------------------------------------------------------------------------
// Dialogue trigger description mapping
// ---------------------------------------------------------------------------

export function getTriggerDescription(trigger: DialogueTrigger): string {
  const descriptions: Record<DialogueTrigger, string> = {
    gameStart: "A new game has started",
    playerRaise: "The player just raised the bet",
    playerCall: "The player called the bet",
    playerFold: "The player folded",
    playerCheck: "The player checked",
    botWins: "You won the round",
    botLoses: "You lost the round",
    botFolds: "You folded this round",
    botRaises: "You just raised the bet",
    showdownStart: "Showdown has begun — time to build a word",
    showdownResult: "The showdown results are in",
    playerChats: "The player sent a chat message",
  };
  return descriptions[trigger];
}

// ---------------------------------------------------------------------------
// Should the AI speak for this trigger and personality?
// ---------------------------------------------------------------------------

export function shouldGenerateDialogue(
  personality: AIPersonality,
  trigger: DialogueTrigger,
  randomValue: number,
): boolean {
  const profile = getDialogueProfile(personality);
  const chattiness = profile.chattiness[trigger] ?? 0;
  return randomValue < chattiness;
}

// ---------------------------------------------------------------------------
// Get a random reaction for a trigger
// ---------------------------------------------------------------------------

export function getRandomReaction(
  personality: AIPersonality,
  trigger: DialogueTrigger,
  randomFn: () => number = Math.random,
): string | null {
  const profile = getDialogueProfile(personality);
  const reactions = profile.reactions[trigger];
  if (!reactions || reactions.length === 0) {
    return null;
  }
  return reactions[Math.floor(randomFn() * reactions.length)];
}

// ---------------------------------------------------------------------------
// All dialogue trigger values (for iteration/testing)
// ---------------------------------------------------------------------------

export const ALL_DIALOGUE_TRIGGERS: DialogueTrigger[] = [
  "gameStart",
  "playerRaise",
  "playerCall",
  "playerFold",
  "playerCheck",
  "botWins",
  "botLoses",
  "botFolds",
  "botRaises",
  "showdownStart",
  "showdownResult",
  "playerChats",
];