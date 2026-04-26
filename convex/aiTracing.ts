import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const traceCategoryValidator = v.union(
  v.literal("game_start"),
  v.literal("game_action"),
  v.literal("stage_change"),
  v.literal("showdown_submit"),
  v.literal("game_complete"),
  v.literal("ai_betting"),
  v.literal("ai_showdown"),
  v.literal("ai_dialogue"),
);

const traceInputValidator = {
  gameId: v.id("games"),
  roomId: v.optional(v.id("rooms")),
  category: traceCategoryValidator,
  playerId: v.optional(v.string()),
  playerName: v.optional(v.string()),
  characterId: v.optional(v.string()),
  isBot: v.optional(v.boolean()),
  action: v.optional(v.string()),
  stage: v.optional(v.string()),
  previousStage: v.optional(v.string()),
  tilesRevealed: v.optional(v.string()),
  potBefore: v.optional(v.number()),
  potAfter: v.optional(v.number()),
  chipsBefore: v.optional(v.number()),
  chipsAfter: v.optional(v.number()),
  raiseAmount: v.optional(v.number()),
  wordSubmitted: v.optional(v.string()),
  wordScore: v.optional(v.number()),
  wordScoreBreakdown: v.optional(v.string()),
  winnerId: v.optional(v.string()),
  winnerWord: v.optional(v.string()),
  winnerScore: v.optional(v.number()),
  model: v.optional(v.string()),
  difficulty: v.optional(v.string()),
  personality: v.optional(v.string()),
  handStrength: v.optional(v.number()),
  rateOfReturn: v.optional(v.number()),
  potOdds: v.optional(v.number()),
  chipRisk: v.optional(v.number()),
  probabilisticAction: v.optional(v.string()),
  fcrBucket: v.optional(v.string()),
  actionCacheHit: v.optional(v.boolean()),
  isBluffing: v.optional(v.boolean()),
  inputPrompt: v.optional(v.string()),
  outputRaw: v.optional(v.string()),
  outputParsed: v.optional(v.string()),
  usedFallback: v.optional(v.boolean()),
  dialogueTrigger: v.optional(v.string()),
  dialogueMessage: v.optional(v.string()),
  success: v.optional(v.boolean()),
  error: v.optional(v.string()),
  metadata: v.optional(v.any()),
};

export const insertGameTrace = internalMutation({
  args: traceInputValidator,
  handler: async (ctx, args) => {
    return await ctx.db.insert("gameTraces", stripUndefined({
      ...args,
      success: args.success ?? true,
      createdAt: Date.now(),
    }) as any);
  },
});

export const getTraces = query({
  args: {
    category: v.optional(traceCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 200), 1), 500);
    const traces = args.category
      ? await ctx.db
          .query("gameTraces")
          .withIndex("by_category_createdAt", (q) =>
            q.eq("category", args.category!),
          )
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("gameTraces")
          .withIndex("by_createdAt")
          .order("desc")
          .take(limit);

    return traces;
  },
});

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }

  if (value && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (nestedValue !== undefined) {
        cleaned[key] = stripUndefined(nestedValue);
      }
    }
    return cleaned;
  }

  return value;
}
