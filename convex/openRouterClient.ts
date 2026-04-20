/**
 * OpenRouter Client for Convex Backend
 *
 * Provides OpenAI-compatible interface to OpenRouter API
 * Supports z-ai/glm-4.5-air:free and other models
 */

import OpenAI from "openai";

const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_OPENROUTER_MODEL = "z-ai/glm-4.5-air:free";

export function getRequiredOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required for OpenRouter requests.");
  }
  return apiKey;
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function getConfiguredOpenRouterModel(defaultModel?: string): string {
  return (
    process.env.OPENROUTER_MODEL?.trim() ||
    defaultModel ||
    DEFAULT_OPENROUTER_MODEL
  );
}

export function getConfiguredOpenRouterBaseUrl(): string {
  return process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL;
}

export async function callOpenRouterChat(args: {
  model?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = getRequiredOpenRouterApiKey();
  const model = getConfiguredOpenRouterModel(args.model);
  const baseUrl = getConfiguredOpenRouterBaseUrl();
  const timeoutMs = args.timeoutMs ?? 15_000;
  const startedAt = Date.now();

  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl,
    timeout: timeoutMs,
    maxRetries: 0,
    defaultHeaders: {
      "HTTP-Referer": process.env.BETTER_AUTH_URL || "http://localhost:3000",
      "X-Title": "Word Poker",
    },
  });

  console.log("[openRouterClient] Starting OpenRouter chat completion request", {
    model,
    baseUrl,
    timeoutMs,
    promptLength: args.prompt.length,
    maxTokens: args.maxTokens ?? 500,
    temperature: args.temperature ?? 0.7,
  });

  let response;
  try {
    response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: args.prompt,
        },
      ],
      temperature: args.temperature ?? 0.7,
      max_tokens: args.maxTokens ?? 500,
      stream: false,
    });
  } catch (error) {
    console.error("[openRouterClient] OpenRouter chat completion request failed", {
      model,
      baseUrl,
      timeoutMs,
      durationMs: Date.now() - startedAt,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
              status: "status" in error ? (error as { status?: unknown }).status : undefined,
              headers:
                "headers" in error ? (error as { headers?: unknown }).headers : undefined,
              requestID:
                "requestID" in error
                  ? (error as { requestID?: unknown }).requestID
                  : undefined,
              code: "code" in error ? (error as { code?: unknown }).code : undefined,
              type: "type" in error ? (error as { type?: unknown }).type : undefined,
              cause: "cause" in error ? (error as { cause?: unknown }).cause : undefined,
            }
          : { value: String(error) },
    });
    throw error;
  }

  console.log("[openRouterClient] OpenRouter chat completion request completed", {
    model,
    baseUrl,
    timeoutMs,
    durationMs: Date.now() - startedAt,
    choiceCount: response.choices.length,
    finishReason: response.choices[0]?.finish_reason,
  });

  const content = response.choices[0]?.message?.content;
  if (typeof content === "string" && content.trim()) {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .flatMap((part) => ("text" in part && typeof part.text === "string" ? [part.text] : []))
      .join("\n")
      .trim();
    if (text) {
      return text;
    }
  }

  throw new Error("OpenRouter returned an empty chat completion response.");
}
