import { query } from "../_generated/server";
import { requireVerifiedUser } from "../verifyUser";
import { countPendingIncoming } from "./requests";

export const pendingNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const { authUserId } = await requireVerifiedUser(ctx);

    const friendRequests = await countPendingIncoming(ctx, authUserId);

    return {
      friendRequests,
      gameInvites: 0,
    };
  },
});
