// ============================================================================
// Tutorial completion reward — STO-239
// ----------------------------------------------------------------------------
// Grants 100 coins the first time an authenticated user completes the
// first bot-game tutorial. Replaying the tutorial cannot grant the reward
// again thanks to an idempotent operation key.
//
// Operation key: tutorial:first-bot-game:{authUserId}
// ============================================================================

import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  buildOperationKey,
  creditWallet,
  OPERATION_NAMESPACES,
} from "./wallet/ledger";
import { FIRST_BOT_GAME_TUTORIAL_ID } from "./rooms/helpers";
import { DEV_BOT_AUTH_PREFIX } from "./games/gamesShared";
import type { SettlementEntry } from "./games/settlement/types";

function isBotAuthUserId(authUserId: string): boolean {
  return authUserId.startsWith(DEV_BOT_AUTH_PREFIX);
}

const TUTORIAL_REWARD_AMOUNT = 100;
const TUTORIAL_REWARD_OPERATION_ID = FIRST_BOT_GAME_TUTORIAL_ID;

type TutorialRewardInput = {
  room: Doc<"rooms"> | null;
  gameId: Id<"games">;
  hands: Array<{ playerId: string; hasFolded: boolean }>;
  playerById: Map<string, Doc<"players">>;
};

export async function awardTutorialCompletionReward(
  ctx: MutationCtx,
  input: TutorialRewardInput,
): Promise<SettlementEntry[]> {
  const entries: SettlementEntry[] = [];
  const { room, gameId, hands, playerById } = input;

  if (!room || room.tutorialId !== FIRST_BOT_GAME_TUTORIAL_ID) {
    return entries;
  }

  for (const hand of hands) {
    const player = playerById.get(hand.playerId);
    if (!player) continue;
    if (isBotAuthUserId(player.authUserId)) continue;

    const opKey = buildOperationKey(
      OPERATION_NAMESPACES.tutorial,
      player.authUserId,
      TUTORIAL_REWARD_OPERATION_ID,
    );

    try {
      const creditResult = await creditWallet(ctx, {
        authUserId: player.authUserId,
        amount: TUTORIAL_REWARD_AMOUNT,
        source: "tutorial",
        operationKey: opKey,
        gameId,
      });
      if (creditResult.status === "applied") {
        entries.push({
          ruleId: "tutorial_completion",
          playerId: hand.playerId,
          authUserId: player.authUserId,
          amount: TUTORIAL_REWARD_AMOUNT,
          description: "Completed the first tutorial",
        });
      }
    } catch {
      // Idempotent: reward already granted.
    }
  }

  return entries;
}

/**
 * Public query so the frontend can check whether the authenticated user
 * has already received the tutorial completion reward.
 */
export const getTutorialRewardStatus = query({
  args: {},
  handler: async (ctx) => {
    const auth = await ctx.auth.getUserIdentity();
    const authUserId = auth?.tokenIdentifier ?? auth?.subject;
    if (!authUserId) return { hasReceived: false };

    const opKey = buildOperationKey(
      OPERATION_NAMESPACES.tutorial,
      authUserId,
      TUTORIAL_REWARD_OPERATION_ID,
    );

    const tx = await ctx.db
      .query("transactions")
      .withIndex("by_operationKey", (q) => q.eq("operationKey", opKey))
      .first();

    return { hasReceived: !!tx };
  },
});
