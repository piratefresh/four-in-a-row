/**
 * Embedding generation via OpenRouter
 *
 * Uses qwen/qwen3-embedding-8b (1024-dim Matryoshka) for semantic
 * similarity search in the dialogue RAG cache.
 */

import OpenAI from "openai";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const EMBEDDING_MODEL = "qwen/qwen3-embedding-8b";
const EMBEDDING_DIMENSIONS = 1024;

function getOpenRouterClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required for embedding requests.");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    timeout: 10_000,
    maxRetries: 1,
    defaultHeaders: {
      "HTTP-Referer": process.env.BETTER_AUTH_URL || "http://localhost:3000",
      "X-Title": "Word Poker",
    },
  });
}

export const generateEmbedding = internalAction({
  args: {
    text: v.string(),
  },
  handler: async (_ctx, args): Promise<number[]> => {
    const client = getOpenRouterClient();

    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: args.text,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error("Embedding response contained no data.");
    }

    return embedding as number[];
  },
});
