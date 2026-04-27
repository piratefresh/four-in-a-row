/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

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
import type * as auth from "../auth.js";
import type * as clearOldGames from "../clearOldGames.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as csw24 from "../csw24.js";
import type * as debugBots from "../debugBots.js";
import type * as emails from "../emails.js";
import type * as embeddings from "../embeddings.js";
import type * as gameRules from "../gameRules.js";
import type * as gameState from "../gameState.js";
import type * as games from "../games.js";
import type * as games_gamesBetting from "../games/gamesBetting.js";
import type * as games_gamesProgression from "../games/gamesProgression.js";
import type * as games_gamesRuntime from "../games/gamesRuntime.js";
import type * as games_gamesScoring from "../games/gamesScoring.js";
import type * as games_gamesSetup from "../games/gamesSetup.js";
import type * as games_gamesShared from "../games/gamesShared.js";
import type * as games_gamesShowdown from "../games/gamesShowdown.js";
import type * as http from "../http.js";
import type * as inspectGame from "../inspectGame.js";
import type * as messages from "../messages.js";
import type * as openRouterClient from "../openRouterClient.js";
import type * as playerStats from "../playerStats.js";
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
import type * as showdownSolver from "../showdownSolver.js";
import type * as simpleBots from "../simpleBots.js";
import type * as stats from "../stats.js";
import type * as testDeck from "../testDeck.js";
import type * as validateWord from "../validateWord.js";
import type * as verifyUser from "../verifyUser.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
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
  auth: typeof auth;
  clearOldGames: typeof clearOldGames;
  constants: typeof constants;
  crons: typeof crons;
  csw24: typeof csw24;
  debugBots: typeof debugBots;
  emails: typeof emails;
  embeddings: typeof embeddings;
  gameRules: typeof gameRules;
  gameState: typeof gameState;
  games: typeof games;
  "games/gamesBetting": typeof games_gamesBetting;
  "games/gamesProgression": typeof games_gamesProgression;
  "games/gamesRuntime": typeof games_gamesRuntime;
  "games/gamesScoring": typeof games_gamesScoring;
  "games/gamesSetup": typeof games_gamesSetup;
  "games/gamesShared": typeof games_gamesShared;
  "games/gamesShowdown": typeof games_gamesShowdown;
  http: typeof http;
  inspectGame: typeof inspectGame;
  messages: typeof messages;
  openRouterClient: typeof openRouterClient;
  playerStats: typeof playerStats;
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
  showdownSolver: typeof showdownSolver;
  simpleBots: typeof simpleBots;
  stats: typeof stats;
  testDeck: typeof testDeck;
  validateWord: typeof validateWord;
  verifyUser: typeof verifyUser;
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
