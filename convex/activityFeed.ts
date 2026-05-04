import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

async function getHumanPlayersForRoom(ctx: MutationCtx, roomId: Id<"rooms">) {
  const players = await ctx.db
    .query("players")
    .withIndex("roomId", (q) => q.eq("roomId", roomId))
    .collect();
  return players.filter(
    (p) => p.authUserId && !p.authUserId.startsWith("dev-bot:"),
  );
}

export async function recordGameStart(
  ctx: MutationCtx,
  gameId: Id<"games">,
) {
  const game = await ctx.db.get(gameId);
  if (!game) return;

  const room = await ctx.db.get(game.roomId as Id<"rooms">);
  if (!room || room.tutorialId) return;

  const hostPlayer = room.hostPlayerId
    ? await ctx.db.get(room.hostPlayerId)
    : null;
  const hostName = hostPlayer?.name ?? "A player";

  let text: string;
  if (room.isBotGame) {
    const difficulty = room.difficulty ?? "medium";
    text = `${hostName} started an offline game (${difficulty})`;
  } else {
    text = `${hostName} started a game`;
  }

  await ctx.db.insert("activityFeed", {
    displayText: text,
    type: "game_started",
    createdAt: Date.now(),
  });
}

export async function recordGameCompletion(
  ctx: MutationCtx,
  gameId: Id<"games">,
) {
  const game = await ctx.db.get(gameId);
  if (!game) return;

  const roomId = game.roomId as Id<"rooms">;
  const room = await ctx.db.get(roomId);
  if (!room || room.tutorialId) return;

  const humans = await getHumanPlayersForRoom(ctx, roomId);
  if (humans.length === 0) return;

  const submissions = await ctx.db
    .query("wordSubmissions")
    .withIndex("by_game", (q) => q.eq("gameId", gameId))
    .collect();
  const submissionMap = new Map<string, (typeof submissions)[number]>();
  for (const sub of submissions) {
    const existing = submissionMap.get(sub.playerId);
    if (!existing || sub.createdAt > existing.createdAt) {
      submissionMap.set(sub.playerId, sub);
    }
  }

  const now = Date.now();

  if (room.isBotGame) {
    const diff = room.difficulty ?? "medium";
    for (const human of humans) {
      const won = game.winnerId && String(human._id) === game.winnerId;
      const sub = submissionMap.get(String(human._id));
      if (won) {
        const word = sub ? `'${sub.word}'` : "";
        const text = word
          ? `${human.name} won an offline game (${diff}) with ${word}`
          : `${human.name} won an offline game (${diff})`;
        await ctx.db.insert("activityFeed", {
          displayText: text,
          type: "game_completed",
          createdAt: now,
        });
      } else {
        const word = sub ? `'${sub.word}'` : "";
        const text = word
          ? `${human.name} lost an offline game (${diff}) with ${word}`
          : `${human.name} lost an offline game (${diff})`;
        await ctx.db.insert("activityFeed", {
          displayText: text,
          type: "game_completed",
          createdAt: now,
        });
      }
    }
  } else {
    for (const human of humans) {
      const won = game.winnerId && String(human._id) === game.winnerId;
      if (!won) continue;
      const sub = submissionMap.get(String(human._id));
      const word = sub ? `'${sub.word}'` : "";
      const text = word
        ? `${human.name} won a match with ${word}`
        : `${human.name} won a match`;
      await ctx.db.insert("activityFeed", {
        displayText: text,
        type: "game_completed",
        createdAt: now,
      });
    }
  }
}

export const getRecentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activityFeed")
      .order("desc")
      .take(args.limit ?? 5);
  },
});

export const cleanupOldActivity = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const entries = await ctx.db
      .query("activityFeed")
      .order("desc")
      .take(200);
    for (const entry of entries) {
      if (entry.createdAt < cutoff) {
        await ctx.db.delete(entry._id);
      }
    }
  },
});
