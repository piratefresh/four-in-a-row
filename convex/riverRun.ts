import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  createSoloRunForCurrentUser,
  submitPhaseWordForCurrentUser,
} from "./riverRun/lifecycle";
import {
  getSoloRunForViewer,
} from "./riverRun/views";

export const createSoloRun = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return createSoloRunForCurrentUser(ctx, args);
  },
});

export const getSoloRunByCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    return getSoloRunForViewer(ctx, { code: args.code });
  },
});

export const getSoloRun = query({
  args: {
    code: v.optional(v.string()),
    runId: v.optional(v.id("riverRunRuns")),
  },
  handler: async (ctx, args) => {
    return getSoloRunForViewer(ctx, args);
  },
});

export const submitPhaseWord = mutation({
  args: {
    code: v.optional(v.string()),
    runId: v.optional(v.id("riverRunRuns")),
    word: v.string(),
  },
  handler: async (ctx, args) => {
    return submitPhaseWordForCurrentUser(ctx, args);
  },
});
