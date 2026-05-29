/**
 * OpenRouter Client for Convex Backend
 *
 * Provides OpenAI-compatible interface to OpenRouter API
 * Supports z-ai/glm-4.5-air:free and other models
 */

import OpenAI from "openai";

const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_OPENROUTER_MODEL = "deepseek/deepseek-v4-flash";

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
  responseFormat?: { type: "json_object" };
  tools?: Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  toolChoice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
}): Promise<{ content: string; latencyMs: number; toolCalls?: Array<{ name: string; arguments: string }> }> {
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
    hasTools: !!args.tools,
    toolCount: args.tools?.length ?? 0,
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
      response_format: args.responseFormat,
      tools: args.tools,
      tool_choice: args.toolChoice ?? "auto",
    } as any);
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
    hasToolCalls: !!response.choices[0]?.message?.tool_calls?.length,
  });

  const message = response.choices[0]?.message;
  const content = typeof message?.content === "string" ? message.content.trim() : "";

  // Extract native tool calls from the response
  const toolCalls = message?.tool_calls
    ?.filter((tc: any) => tc.type === "function")
    .map((tc: any) => ({
      name: tc.function.name,
      arguments: tc.function.arguments,
    }));

  if (toolCalls && toolCalls.length > 0) {
    return { content: content || "", latencyMs: Date.now() - startedAt, toolCalls };
  }

  if (content) {
    return { content, latencyMs: Date.now() - startedAt };
  }

  if (Array.isArray(message?.content)) {
    const text = (message!.content as any[])
      .flatMap((part) => ("text" in part && typeof part.text === "string" ? [part.text] : []))
      .join("\n")
      .trim();
    if (text) {
      return { content: text, latencyMs: Date.now() - startedAt };
    }
  }

  throw new Error("OpenRouter returned an empty chat completion response.");
}
