import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function getGameByRoomHandler(
  ctx: QueryCtx,
  args: { roomId: string },
) {
  const roomId = args.roomId.trim();
  if (!roomId) return null;

  const activeGame = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", roomId).eq("status", "active"),
    )
    .unique();
  if (activeGame) return activeGame;

  const waitingGame = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", roomId).eq("status", "waiting"),
    )
    .unique();
  if (waitingGame) return waitingGame;

  const completed = await ctx.db
    .query("games")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", roomId).eq("status", "completed"),
    )
    .order("desc")
    .take(1);

  return completed[0] ?? null;
}

export async function getPlayerHandsHandler(
  ctx: QueryCtx,
  args: { gameId: Doc<"games">["_id"] },
) {
  const hands = await ctx.db
    .query("playerHands")
    .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
    .collect();

  hands.sort((a, b) => a.playerId.localeCompare(b.playerId));
  return hands;
}

export async function internalGetGameRuntimeStateHandler(
  ctx: QueryCtx,
  args: { gameId: Doc<"games">["_id"] },
): Promise<{
  game: Doc<"games">;
  room: Doc<"rooms"> | null;
  hands: Doc<"playerHands">[];
  players: Doc<"players">[];
} | null> {
  const game = await ctx.db.get(args.gameId);
  if (!game) return null;

  const room = await ctx.db.get(game.roomId as Doc<"rooms">["_id"]);

  const hands = await ctx.db
    .query("playerHands")
    .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
    .collect();

  const players = await ctx.db
    .query("players")
    .withIndex("roomId", (q) => q.eq("roomId", game.roomId as Doc<"players">["roomId"]))
    .collect();

  return { game, room, hands, players };
}
