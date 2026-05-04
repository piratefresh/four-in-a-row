import { query } from "../_generated/server";
import { getVerifiedUserId } from "../verifyUser";
import { countPendingIncoming } from "./requests";

export const pendingNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getVerifiedUserId(ctx);

    if (!authUserId) {
      return { friendRequests: 0, gameInvites: 0 };
    }

    const friendRequests = await countPendingIncoming(ctx, authUserId);

    return {
      friendRequests,
      gameInvites: 0,
    };
  },
});
