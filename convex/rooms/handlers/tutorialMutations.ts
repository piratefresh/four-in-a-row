import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import {
  createTutorialBotRoomHandler,
  restartTutorialRoomHandler,
  startTutorialShowdownHandler,
  resumeTutorialBettingHandler,
} from "../tutorial";

export const createTutorialBotRoom = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return createTutorialBotRoomHandler(ctx, args);
  },
});

export const restartTutorialRoom = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return restartTutorialRoomHandler(ctx, args);
  },
});

export const startTutorialShowdown = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return startTutorialShowdownHandler(ctx, args);
  },
});

export const resumeTutorialBetting = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return resumeTutorialBettingHandler(ctx, args);
  },
});
