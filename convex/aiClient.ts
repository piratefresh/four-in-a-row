import OpenAI from "openai";

const DEFAULT_NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_NVIDIA_NIM_MODEL = "google/gemma-3-27b-it";

export function getRequiredNvidiaNimApiKey(): string {
  const apiKey = process.env.NVIDIA_NIM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("NVIDIA_NIM_API_KEY is required for NVIDIA NIM requests.");
  }
  return apiKey;
}

export function isNvidiaNimConfigured(): boolean {
  return Boolean(process.env.NVIDIA_NIM_API_KEY?.trim());
}

export function getConfiguredNvidiaNimModel(defaultModel?: string): string {
  return (
    process.env.NVIDIA_NIM_MODEL?.trim() ||
    defaultModel ||
    DEFAULT_NVIDIA_NIM_MODEL
  );
}

export function getConfiguredNvidiaNimBaseUrl(): string {
  return process.env.NVIDIA_NIM_BASE_URL?.trim() || DEFAULT_NVIDIA_NIM_BASE_URL;
}

export async function callNvidiaNimChat(args: {
  model?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = getRequiredNvidiaNimApiKey();
  const model = getConfiguredNvidiaNimModel(args.model);
  const baseUrl = getConfiguredNvidiaNimBaseUrl();
  const timeoutMs = args.timeoutMs ?? 15_000;
  const startedAt = Date.now();

  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl,
    timeout: timeoutMs,
    maxRetries: 0,
  });

  console.log("[aiClient] Starting NVIDIA NIM chat completion request", {
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
    console.error("[aiClient] NVIDIA NIM chat completion request failed", {
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

  console.log("[aiClient] NVIDIA NIM chat completion request completed", {
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

  throw new Error("NVIDIA NIM returned an empty chat completion response.");
}
