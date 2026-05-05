import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import type { Doc } from "./_generated/dataModel";

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
  component: v.optional(v.string()),
  operation: v.optional(v.string()),
  decisionSource: v.optional(v.string()),
  latencyMs: v.optional(v.number()),
  provider: v.optional(v.string()),
  promptTemplate: v.optional(v.string()),
  cacheStatus: v.optional(v.string()),
  qualityFlags: v.optional(v.array(v.string())),
  action: v.optional(v.string()),
  executedAction: v.optional(v.string()),
  actionOverrideReason: v.optional(v.string()),
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
  bluffDetected: v.optional(v.boolean()),
  believesPlayer: v.optional(v.union(v.literal(true), v.literal(false), v.null())),
  llmWord: v.optional(v.string()),
  validationResult: v.optional(v.string()),
  fallbackReason: v.optional(v.string()),
  inputPrompt: v.optional(v.string()),
  outputRaw: v.optional(v.string()),
  outputParsed: v.optional(v.string()),
  usedFallback: v.optional(v.boolean()),
  dialogueTrigger: v.optional(v.string()),
  dialogueMessage: v.optional(v.string()),
  dialogueSource: v.optional(v.string()),
  dialogueSent: v.optional(v.boolean()),
  dialogueSuppressedReason: v.optional(v.string()),
  success: v.optional(v.boolean()),
  error: v.optional(v.string()),
  metadata: v.optional(v.any()),
};

export const insertGameTrace = internalMutation({
  args: traceInputValidator,
  handler: async (ctx, args) => {
    const normalized = withTraceDefaults(args);
    return await ctx.db.insert("gameTraces", stripUndefined({
      ...args,
      ...normalized,
      success: args.success ?? true,
      createdAt: Date.now(),
    }) as any);
  },
});

export const getTraces = query({
  args: {
    category: v.optional(traceCategoryValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("gameTraces")
        .withIndex("by_category_createdAt", (q) =>
          q.eq("category", args.category!),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("gameTraces")
      .withIndex("by_createdAt")
      .order("desc")
      .paginate(args.paginationOpts);
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

function withTraceDefaults(args: {
  category: string;
  component?: string;
  operation?: string;
  decisionSource?: string;
  usedFallback?: boolean;
  cacheStatus?: string;
  provider?: string;
  actionCacheHit?: boolean;
}): Partial<Doc<"gameTraces">> {
  const isAiTrace = args.category.startsWith("ai_");
  const component = args.component ?? getDefaultComponent(args.category);
  const operation = args.operation ?? args.category;
  const decisionSource =
    args.decisionSource ??
    getDefaultDecisionSource({
      category: args.category,
      usedFallback: args.usedFallback,
      cacheStatus: args.cacheStatus,
      provider: args.provider,
    });

  return {
    component,
    operation,
    decisionSource,
    provider: args.provider ?? (isAiTrace && !args.usedFallback ? "openrouter" : undefined),
    cacheStatus: args.cacheStatus ?? (args.actionCacheHit ? "hit" : undefined),
  };
}

function getDefaultComponent(category: string) {
  if (category === "ai_dialogue") return "dialogue";
  if (category.startsWith("ai_")) return "ai";
  if (category === "showdown_submit") return "showdown";
  return "game";
}

function getDefaultDecisionSource(args: {
  category: string;
  usedFallback?: boolean;
  cacheStatus?: string;
  provider?: string;
}) {
  if (!args.category.startsWith("ai_")) return "game";
  if (args.cacheStatus === "hit") return "cache";
  if (args.usedFallback) return "fallback";
  return args.provider ?? "llm";
}
