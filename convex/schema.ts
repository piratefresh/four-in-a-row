import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "./schema.auth";
import {
  gameDeckTileValidator,
  gameStageValidator,
  gameStatusValidator,
  gameTileValidator,
} from "./gameState";
import { roomConfigValidator, resolvedGameConfigValidator } from "./gameConfig";
import {
  riverRunPhaseValidator,
  riverRunSubmissionValidator,
  riverRunStatusValidator,
  riverRunTileValidator,
} from "./riverRunState";

export const EMBEDDING_DIMENSIONS = 1024;
export const RAG_SIMILARITY_THRESHOLD = 0.9;
export const RAG_TOP_K = 5;

export const appTables = {
  rooms: defineTable({
    code: v.string(),
    title: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("closed")),
    mode: v.optional(v.union(v.literal("riverRunSolo"))),
    maxPlayers: v.number(),
    tutorialId: v.optional(v.union(v.literal("first-bot-game"))),
    isBotGame: v.optional(v.boolean()),
    difficulty: v.optional(v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    )),
    config: v.optional(roomConfigValidator),
    hostPlayerId: v.optional(v.id("players")),
    nextRoomId: v.optional(v.id("rooms")),
    sourceRoomId: v.optional(v.id("rooms")),
    createdAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index("code", ["code"])
    .index("sourceRoomId", ["sourceRoomId"])
    .index("status_lastActiveAt", ["status", "lastActiveAt"]),
  players: defineTable({
    roomId: v.id("rooms"),
    authUserId: v.string(),
    name: v.string(),
    seatIndex: v.number(),
    isHost: v.boolean(),
    status: v.union(v.literal("active"), v.literal("left")),
    readyStatus: v.optional(v.boolean()),
    lastSeenAt: v.number(),
  })
    .index("roomId", ["roomId"])
    .index("roomId_status", ["roomId", "status"])
    .index("roomId_seatIndex", ["roomId", "seatIndex"])
    .index("authUserId_status", ["authUserId", "status"]),
  messages: defineTable({
    roomId: v.id("rooms"),
    playerId: v.optional(v.id("players")),
    senderAuthUserId: v.optional(v.string()),
    senderName: v.string(),
    text: v.string(),
    type: v.union(v.literal("player"), v.literal("ai"), v.literal("system")),
    createdAt: v.number(),
    repliedByBots: v.optional(v.array(v.string())),
  }).index("roomId_createdAt", ["roomId", "createdAt"]),
  games: defineTable({
    roomId: v.string(),
    stage: gameStageValidator,
    communityTiles: v.array(gameTileValidator),
    deck: v.array(gameDeckTileValidator),
    pot: v.number(),
    currentBet: v.number(),
    currentPlayerIndex: v.number(),
    dealerButtonIndex: v.optional(v.number()),
    smallBlindIndex: v.optional(v.number()),
    bigBlindIndex: v.optional(v.number()),
    raisesThisRound: v.optional(v.number()),
    status: gameStatusValidator,
    winnerId: v.optional(v.string()),
    winningWord: v.optional(v.string()),
    winningScore: v.optional(v.number()),
    winningScoreBreakdown: v.optional(
      v.object({
        basePoints: v.number(),
        multiplierBonus: v.number(),
        fullRackBonus: v.number(),
      }),
    ),
    showdownStartedAt: v.optional(v.number()),
    turnStartedAt: v.optional(v.number()),
    turnClockCalledAt: v.optional(v.number()),
    turnClockExpiresAt: v.optional(v.number()),
    turnClockCallerPlayerId: v.optional(v.string()),
    turnClockTargetPlayerId: v.optional(v.string()),
    lastBotTurnScheduledAt: v.optional(v.number()),
    config: v.optional(resolvedGameConfigValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_status", ["roomId", "status"]),
  playerHands: defineTable({
    gameId: v.id("games"),
    playerId: v.string(),
    tiles: v.array(gameDeckTileValidator),
    chips: v.number(),
    betThisRound: v.number(),
    totalBet: v.number(),
    hasActed: v.boolean(),
    hasFolded: v.boolean(),
    lastAction: v.optional(
      v.union(
        v.literal("check"),
        v.literal("call"),
        v.literal("raise"),
        v.literal("fold"),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_player", ["playerId"]),
  wordSubmissions: defineTable({
    gameId: v.id("games"),
    playerId: v.string(),
    stage: gameStageValidator,
    word: v.string(),
    tiles: v.array(
      v.object({
        letter: v.string(),
        baseValue: v.number(),
        multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
        source: v.union(v.literal("hand"), v.literal("community")),
        // For resolved choice cards - which card index and which option was chosen
        cardIndex: v.optional(v.number()),
        wasChoice: v.optional(v.boolean()),
      }),
    ),
    // Map of card indices to selected letter choices (for choice cards used in submission)
    choiceResolutions: v.optional(
      v.object({
        hand: v.optional(v.record(v.string(), v.string())), // handCardIndex -> selectedLetter
        community: v.optional(v.record(v.string(), v.string())), // communityCardIndex -> selectedLetter
      }),
    ),
    score: v.number(),
    scoreBreakdown: v.object({
      basePoints: v.number(),
      multiplierBonus: v.number(),
      fullRackBonus: v.number(),
    }),
    createdAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_player", ["gameId", "playerId"])
    .index("by_player", ["playerId"]),
  riverRunRuns: defineTable({
    roomId: v.id("rooms"),
    playerId: v.id("players"),
    authUserId: v.string(),
    targetCurve: v.array(v.number()),
    targetIndex: v.number(),
    currentTarget: v.number(),
    phase: riverRunPhaseValidator,
    tiles: v.array(riverRunTileValidator),
    submissions: v.optional(v.array(riverRunSubmissionValidator)),
    credits: v.number(),
    handScore: v.number(),
    totalScore: v.number(),
    status: riverRunStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_roomId", ["roomId"])
    .index("by_playerId", ["playerId"])
    .index("by_authUserId_and_status", ["authUserId", "status"]),
  playerStats: defineTable({
    authUserId: v.optional(v.string()),
    characterId: v.optional(v.string()),
    playerName: v.string(),
    isBot: v.boolean(),
    // Game outcomes
    gamesPlayed: v.number(),
    gamesWon: v.number(),
    winRate: v.number(),
    // Chips
    totalChipsWon: v.number(),
    totalChipsLost: v.number(),
    bestChipFinish: v.number(),
    // Showdown
    showdownsReached: v.number(),
    showdownsWon: v.number(),
    wordsSubmitted: v.number(),
    avgWordScore: v.number(),
    bestWord: v.optional(v.string()),
    bestWordScore: v.optional(v.number()),
    longestWord: v.optional(v.string()),
    // Betting actions
    totalChecks: v.number(),
    totalCalls: v.number(),
    totalRaises: v.number(),
    totalFolds: v.number(),
    // AI-specific
    totalBluffs: v.optional(v.number()),
    totalFallbacks: v.optional(v.number()),
    avgHandStrength: v.optional(v.number()),
    totalAiDecisions: v.optional(v.number()),
    totalAiSuccesses: v.optional(v.number()),
    totalAiFailures: v.optional(v.number()),
    avgLatencyMs: v.optional(v.number()),
    totalAiLatencySamples: v.optional(v.number()),
    totalHandStrengthSamples: v.optional(v.number()),
    // Timestamps
    lastGameAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_characterId", ["characterId"])
    .index("by_isBot", ["isBot"])
    .index("by_winRate", ["winRate"]),
  userPreferences: defineTable({
    authUserId: v.string(),
    showInGameHelper: v.boolean(),
    updatedAt: v.number(),
  }).index("by_authUserId", ["authUserId"]),
  gameTraces: defineTable({
    gameId: v.id("games"),
    roomId: v.optional(v.id("rooms")),
    category: v.union(
      v.literal("game_start"),
      v.literal("game_action"),
      v.literal("stage_change"),
      v.literal("showdown_submit"),
      v.literal("game_complete"),
      v.literal("ai_betting"),
      v.literal("ai_showdown"),
      v.literal("ai_dialogue"),
    ),
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
    success: v.boolean(),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_gameId_createdAt", ["gameId", "createdAt"])
    .index("by_category_createdAt", ["category", "createdAt"])
    .index("by_component_createdAt", ["component", "createdAt"])
    .index("by_characterId_createdAt", ["characterId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),
  playerStatRollups: defineTable({
    gameId: v.id("games"),
    createdAt: v.number(),
  }).index("by_gameId", ["gameId"]),
  aiActionsCache: defineTable({
    personality: v.string(),
    trigger: v.string(),
    gameStage: v.string(),
    contextText: v.string(),
    embedding: v.array(v.float64()),
    action: v.string(),
    raiseAmount: v.optional(v.number()),
    wordSubmitted: v.optional(v.string()),
    handStrength: v.number(),
    rateOfReturn: v.optional(v.number()),
    reasoning: v.string(),
    approved: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_personality_trigger", ["personality", "trigger"])
    .index("by_approved", ["approved"])
    .index("by_approved_createdAt", ["approved", "createdAt"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1024,
      filterFields: ["personality", "trigger", "approved"],
    }),
  aiDialogueCache: defineTable({
    personality: v.string(),
    trigger: v.string(),
    contextText: v.string(),
    embedding: v.array(v.float64()),
    responseText: v.string(),
    createdAt: v.number(),
  })
     .index("by_personality_trigger", ["personality", "trigger"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1024,
      filterFields: ["personality", "trigger"],
    }),
  friendRequests: defineTable({
    fromUserId: v.string(),
    toUserId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_from_status", ["fromUserId", "status"])
    .index("by_to_status", ["toUserId", "status"])
    .index("by_pair", ["fromUserId", "toUserId"]),
  friendships: defineTable({
    userA: v.string(),
    userB: v.string(),
    createdAt: v.number(),
  })
    .index("by_userA", ["userA"])
    .index("by_userB", ["userB"]),
};

export const tables = {
  ...authTables,
  ...appTables,
};

const schema = defineSchema(tables);

export default schema;
