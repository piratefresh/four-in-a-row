/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as achievements from "../achievements.js";
import type * as achievements_definitions from "../achievements/definitions.js";
import type * as achievements_engine from "../achievements/engine.js";
import type * as activityFeed from "../activityFeed.js";
import type * as ai from "../ai.js";
import type * as aiActionsCache from "../aiActionsCache.js";
import type * as aiBettingConstants from "../aiBettingConstants.js";
import type * as aiCache from "../aiCache.js";
import type * as aiDialogue from "../aiDialogue.js";
import type * as aiPersonalities from "../aiPersonalities.js";
import type * as aiPrompts from "../aiPrompts.js";
import type * as aiStrategy from "../aiStrategy.js";
import type * as aiTools from "../aiTools.js";
import type * as aiTracing from "../aiTracing.js";
import type * as ai_aiBetting from "../ai/aiBetting.js";
import type * as ai_aiShared from "../ai/aiShared.js";
import type * as ai_aiShowdown from "../ai/aiShowdown.js";
import type * as ai_bettingConstants from "../ai/bettingConstants.js";
import type * as ai_dialogue from "../ai/dialogue.js";
import type * as ai_personalities from "../ai/personalities.js";
import type * as ai_prompts from "../ai/prompts.js";
import type * as ai_strategy from "../ai/strategy.js";
import type * as ai_tools from "../ai/tools.js";
import type * as auth from "../auth.js";
import type * as clearOldGames from "../clearOldGames.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as csw24 from "../csw24.js";
import type * as debugBots from "../debugBots.js";
import type * as emails from "../emails.js";
import type * as embeddings from "../embeddings.js";
import type * as feedback from "../feedback.js";
import type * as friendships_index from "../friendships/index.js";
import type * as friendships_notifications from "../friendships/notifications.js";
import type * as friendships_requests from "../friendships/requests.js";
import type * as gameConfig from "../gameConfig.js";
import type * as gameRules from "../gameRules.js";
import type * as gameState from "../gameState.js";
import type * as games from "../games.js";
import type * as games_gamesBetting from "../games/gamesBetting.js";
import type * as games_gamesBotDialogue from "../games/gamesBotDialogue.js";
import type * as games_gamesBotTurn from "../games/gamesBotTurn.js";
import type * as games_gamesProgression from "../games/gamesProgression.js";
import type * as games_gamesRewards from "../games/gamesRewards.js";
import type * as games_gamesRuntime from "../games/gamesRuntime.js";
import type * as games_gamesScoring from "../games/gamesScoring.js";
import type * as games_gamesSettlement from "../games/gamesSettlement.js";
import type * as games_gamesSetup from "../games/gamesSetup.js";
import type * as games_gamesShared from "../games/gamesShared.js";
import type * as games_gamesShowdown from "../games/gamesShowdown.js";
import type * as games_gamesTrace from "../games/gamesTrace.js";
import type * as games_settlement_context from "../games/settlement/context.js";
import type * as games_settlement_types from "../games/settlement/types.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as inspectGame from "../inspectGame.js";
import type * as loginStreaks from "../loginStreaks.js";
import type * as messages from "../messages.js";
import type * as openRouterClient from "../openRouterClient.js";
import type * as playerStats from "../playerStats.js";
import type * as reasoningRedaction from "../reasoningRedaction.js";
import type * as riverRun from "../riverRun.js";
import type * as riverRunState from "../riverRunState.js";
import type * as riverRun_access from "../riverRun/access.js";
import type * as riverRun_container from "../riverRun/container.js";
import type * as riverRun_lifecycle from "../riverRun/lifecycle.js";
import type * as riverRun_progression from "../riverRun/progression.js";
import type * as riverRun_scoring from "../riverRun/scoring.js";
import type * as riverRun_views from "../riverRun/views.js";
import type * as rooms from "../rooms.js";
import type * as rooms_handlers_debugMutations from "../rooms/handlers/debugMutations.js";
import type * as rooms_handlers_index from "../rooms/handlers/index.js";
import type * as rooms_handlers_maintenanceMutations from "../rooms/handlers/maintenanceMutations.js";
import type * as rooms_handlers_playerMutations from "../rooms/handlers/playerMutations.js";
import type * as rooms_handlers_queries from "../rooms/handlers/queries.js";
import type * as rooms_handlers_roomMutations from "../rooms/handlers/roomMutations.js";
import type * as rooms_handlers_tutorialMutations from "../rooms/handlers/tutorialMutations.js";
import type * as rooms_helpers from "../rooms/helpers.js";
import type * as rooms_lifecycle from "../rooms/lifecycle.js";
import type * as rooms_players from "../rooms/players.js";
import type * as rooms_tutorial from "../rooms/tutorial.js";
import type * as schema_games from "../schema/games.js";
import type * as showdownSolver from "../showdownSolver.js";
import type * as simpleBots from "../simpleBots.js";
import type * as stats from "../stats.js";
import type * as statsCache from "../statsCache.js";
import type * as stickerCatalog from "../stickerCatalog.js";
import type * as stickers from "../stickers.js";
import type * as testDeck from "../testDeck.js";
import type * as tutorialBots from "../tutorialBots.js";
import type * as tutorialDeck from "../tutorialDeck.js";
import type * as tutorialReward from "../tutorialReward.js";
import type * as userPreferences from "../userPreferences.js";
import type * as validateWord from "../validateWord.js";
import type * as verifyUser from "../verifyUser.js";
import type * as wallet from "../wallet.js";
import type * as wallet_ledger from "../wallet/ledger.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  achievements: typeof achievements;
  "achievements/definitions": typeof achievements_definitions;
  "achievements/engine": typeof achievements_engine;
  activityFeed: typeof activityFeed;
  ai: typeof ai;
  aiActionsCache: typeof aiActionsCache;
  aiBettingConstants: typeof aiBettingConstants;
  aiCache: typeof aiCache;
  aiDialogue: typeof aiDialogue;
  aiPersonalities: typeof aiPersonalities;
  aiPrompts: typeof aiPrompts;
  aiStrategy: typeof aiStrategy;
  aiTools: typeof aiTools;
  aiTracing: typeof aiTracing;
  "ai/aiBetting": typeof ai_aiBetting;
  "ai/aiShared": typeof ai_aiShared;
  "ai/aiShowdown": typeof ai_aiShowdown;
  "ai/bettingConstants": typeof ai_bettingConstants;
  "ai/dialogue": typeof ai_dialogue;
  "ai/personalities": typeof ai_personalities;
  "ai/prompts": typeof ai_prompts;
  "ai/strategy": typeof ai_strategy;
  "ai/tools": typeof ai_tools;
  auth: typeof auth;
  clearOldGames: typeof clearOldGames;
  constants: typeof constants;
  crons: typeof crons;
  csw24: typeof csw24;
  debugBots: typeof debugBots;
  emails: typeof emails;
  embeddings: typeof embeddings;
  feedback: typeof feedback;
  "friendships/index": typeof friendships_index;
  "friendships/notifications": typeof friendships_notifications;
  "friendships/requests": typeof friendships_requests;
  gameConfig: typeof gameConfig;
  gameRules: typeof gameRules;
  gameState: typeof gameState;
  games: typeof games;
  "games/gamesBetting": typeof games_gamesBetting;
  "games/gamesBotDialogue": typeof games_gamesBotDialogue;
  "games/gamesBotTurn": typeof games_gamesBotTurn;
  "games/gamesProgression": typeof games_gamesProgression;
  "games/gamesRewards": typeof games_gamesRewards;
  "games/gamesRuntime": typeof games_gamesRuntime;
  "games/gamesScoring": typeof games_gamesScoring;
  "games/gamesSettlement": typeof games_gamesSettlement;
  "games/gamesSetup": typeof games_gamesSetup;
  "games/gamesShared": typeof games_gamesShared;
  "games/gamesShowdown": typeof games_gamesShowdown;
  "games/gamesTrace": typeof games_gamesTrace;
  "games/settlement/context": typeof games_settlement_context;
  "games/settlement/types": typeof games_settlement_types;
  http: typeof http;
  identity: typeof identity;
  inspectGame: typeof inspectGame;
  loginStreaks: typeof loginStreaks;
  messages: typeof messages;
  openRouterClient: typeof openRouterClient;
  playerStats: typeof playerStats;
  reasoningRedaction: typeof reasoningRedaction;
  riverRun: typeof riverRun;
  riverRunState: typeof riverRunState;
  "riverRun/access": typeof riverRun_access;
  "riverRun/container": typeof riverRun_container;
  "riverRun/lifecycle": typeof riverRun_lifecycle;
  "riverRun/progression": typeof riverRun_progression;
  "riverRun/scoring": typeof riverRun_scoring;
  "riverRun/views": typeof riverRun_views;
  rooms: typeof rooms;
  "rooms/handlers/debugMutations": typeof rooms_handlers_debugMutations;
  "rooms/handlers/index": typeof rooms_handlers_index;
  "rooms/handlers/maintenanceMutations": typeof rooms_handlers_maintenanceMutations;
  "rooms/handlers/playerMutations": typeof rooms_handlers_playerMutations;
  "rooms/handlers/queries": typeof rooms_handlers_queries;
  "rooms/handlers/roomMutations": typeof rooms_handlers_roomMutations;
  "rooms/handlers/tutorialMutations": typeof rooms_handlers_tutorialMutations;
  "rooms/helpers": typeof rooms_helpers;
  "rooms/lifecycle": typeof rooms_lifecycle;
  "rooms/players": typeof rooms_players;
  "rooms/tutorial": typeof rooms_tutorial;
  "schema/games": typeof schema_games;
  showdownSolver: typeof showdownSolver;
  simpleBots: typeof simpleBots;
  stats: typeof stats;
  statsCache: typeof statsCache;
  stickerCatalog: typeof stickerCatalog;
  stickers: typeof stickers;
  testDeck: typeof testDeck;
  tutorialBots: typeof tutorialBots;
  tutorialDeck: typeof tutorialDeck;
  tutorialReward: typeof tutorialReward;
  userPreferences: typeof userPreferences;
  validateWord: typeof validateWord;
  verifyUser: typeof verifyUser;
  wallet: typeof wallet;
  "wallet/ledger": typeof wallet_ledger;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
