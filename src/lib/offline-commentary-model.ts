import { useSyncExternalStore } from "react";
import type { OfflineCommentaryModelState } from "./offline-commentary";

type CommentaryBackend = "webgpu" | "wasm";

type PipelineFactoryResult = {
  pipeline: (
    task: string,
    model: string,
    options: Record<string, unknown>,
  ) => Promise<(prompt: string, options: Record<string, unknown>) => Promise<unknown>>;
  env?: {
    allowLocalModels?: boolean;
    allowRemoteModels?: boolean;
    backends?: {
      onnx?: {
        wasm?: {
          proxy?: boolean;
        };
      };
    };
  };
};

type CommentaryGenerator = (
  prompt: string,
  options: Record<string, unknown>,
) => Promise<unknown>;

type TransformersProgressInfo = {
  status:
    | "initiate"
    | "download"
    | "progress"
    | "progress_total"
    | "done"
    | "ready";
  file?: string;
  progress?: number;
};

const COMMENTARY_MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";
const COMMENTARY_MODEL_READY_STORAGE_KEY =
  "offline-rival-commentary-model-ready";
const WEBGPU_RUNTIME_ERROR_PATTERNS = [
  "failed to download data from buffer",
  "mapping webgpu buffer failed",
  "invalid buffer",
  "ortrun()",
  "webgpu",
] as const;

let generator: CommentaryGenerator | null = null;
let preloadPromise: Promise<CommentaryGenerator | null> | null = null;
let activeBackend: CommentaryBackend | null = null;
const disabledBackends = new Set<CommentaryBackend>();
const listeners = new Set<() => void>();

function readPersistedModelReadyFlag() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(COMMENTARY_MODEL_READY_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writePersistedModelReadyFlag(value: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (value) {
      window.localStorage.setItem(COMMENTARY_MODEL_READY_STORAGE_KEY, "1");
      return;
    }

    window.localStorage.removeItem(COMMENTARY_MODEL_READY_STORAGE_KEY);
  } catch {
    // Ignore storage failures. The model can still load without the persisted hint.
  }
}

function createInitialState(): OfflineCommentaryModelState {
  return {
    status: "idle",
    error: null,
    progress: null,
    progressLabel: null,
    currentFile: null,
    hasLoadedBefore: readPersistedModelReadyFlag(),
  };
}

let state: OfflineCommentaryModelState = createInitialState();

function emitState() {
  for (const listener of listeners) {
    listener();
  }
}

function updateState(nextState: OfflineCommentaryModelState) {
  state = nextState;
  emitState();
}

function patchState(partialState: Partial<OfflineCommentaryModelState>) {
  state = {
    ...state,
    ...partialState,
  };
  emitState();
}

function formatProgressLabel(progressInfo: TransformersProgressInfo) {
  switch (progressInfo.status) {
    case "initiate":
      return "Preparing model files...";
    case "download":
      return "Starting download...";
    case "progress":
    case "progress_total":
      return progressInfo.file
        ? `Downloading ${progressInfo.file}...`
        : "Downloading model...";
    case "done":
      return "Finishing download...";
    case "ready":
      return "AI rival ready.";
    default:
      return "Loading AI rival...";
  }
}

function hasWebGpuSupport() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return Boolean((navigator as Navigator & { gpu?: unknown }).gpu);
}

function getBackendOrder(preferredBackend?: CommentaryBackend) {
  const orderedBackends = new Set<CommentaryBackend>();

  if (preferredBackend && !disabledBackends.has(preferredBackend)) {
    orderedBackends.add(preferredBackend);
  }

  if (hasWebGpuSupport() && !disabledBackends.has("webgpu")) {
    orderedBackends.add("webgpu");
  }

  if (!disabledBackends.has("wasm")) {
    orderedBackends.add("wasm");
  }

  return [...orderedBackends];
}

function getBackendLabel(backend: CommentaryBackend) {
  return backend === "webgpu" ? "GPU" : "CPU";
}

function getBackendDtype(backend: CommentaryBackend) {
  return backend === "webgpu" ? "q4" : "q8";
}

function isRecoverableWebGpuExecutionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return WEBGPU_RUNTIME_ERROR_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  );
}

async function loadGeneratorForBackend(
  transformers: PipelineFactoryResult,
  backend: CommentaryBackend,
) {
  return transformers.pipeline("text-generation", COMMENTARY_MODEL_ID, {
    device: backend,
    dtype: getBackendDtype(backend),
    progress_callback: (progressInfo: TransformersProgressInfo) => {
      patchState({
        status: progressInfo.status === "ready" ? "ready" : "loading",
        progress:
          typeof progressInfo.progress === "number"
            ? Math.max(0, Math.min(100, Math.round(progressInfo.progress)))
            : state.progress,
        progressLabel:
          progressInfo.status === "ready"
            ? `AI rival ready on ${getBackendLabel(backend)}.`
            : formatProgressLabel(progressInfo),
        currentFile: progressInfo.file ?? state.currentFile,
        error: null,
        hasLoadedBefore: state.hasLoadedBefore,
      });
    },
  });
}

export function getOfflineCommentaryModelState() {
  return state;
}

export function subscribeOfflineCommentaryModelState(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useOfflineCommentaryModelState() {
  return useSyncExternalStore(
    subscribeOfflineCommentaryModelState,
    getOfflineCommentaryModelState,
    getOfflineCommentaryModelState,
  );
}

export async function preloadOfflineCommentaryModel(
  preferredBackend?: CommentaryBackend,
) {
  if (generator) {
    if (!state.hasLoadedBefore) {
      patchState({ hasLoadedBefore: true });
    }
    return generator;
  }

  if (preloadPromise) {
    return preloadPromise;
  }

  const hasLoadedBefore = state.hasLoadedBefore || readPersistedModelReadyFlag();
  const backendOrder = getBackendOrder(preferredBackend);

  if (backendOrder.length === 0) {
    updateState({
      status: "unsupported",
      error: "No supported AI commentary backend is available in this browser.",
      progress: null,
      progressLabel: null,
      currentFile: null,
      hasLoadedBefore,
    });
    return null;
  }

  updateState({
    status: "loading",
    error: null,
    progress: 0,
    progressLabel: "Preparing model files...",
    currentFile: null,
    hasLoadedBefore,
  });

  preloadPromise = (async () => {
    try {
      const transformers = (await import(
        "@huggingface/transformers"
      )) as PipelineFactoryResult;
      if (transformers.env) {
        transformers.env.allowLocalModels = false;
        transformers.env.allowRemoteModels = true;
        if (transformers.env.backends?.onnx?.wasm) {
          transformers.env.backends.onnx.wasm.proxy = false;
        }
      }

      let lastError: unknown = null;
      for (const [index, backend] of backendOrder.entries()) {
        try {
          generator = await loadGeneratorForBackend(transformers, backend);
          activeBackend = backend;
          writePersistedModelReadyFlag(true);
          updateState({
            status: "ready",
            error: null,
            progress: 100,
            progressLabel: `AI rival ready on ${getBackendLabel(backend)}.`,
            currentFile: null,
            hasLoadedBefore: true,
          });
          return generator;
        } catch (error) {
          lastError = error;
          if (backend === "webgpu") {
            disabledBackends.add("webgpu");
          }
          activeBackend = null;
          generator = null;

          const nextBackend = backendOrder[index + 1];
          if (nextBackend) {
            patchState({
              status: "loading",
              error: null,
              progressLabel: `${getBackendLabel(backend)} failed. Falling back to ${getBackendLabel(nextBackend)}.`,
              currentFile: null,
              hasLoadedBefore,
            });
          }
        }
      }

      throw lastError;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load the offline commentary model.";
      updateState({
        status: "error",
        error: message,
        progress: null,
        progressLabel: null,
        currentFile: null,
        hasLoadedBefore,
      });
      return null;
    } finally {
      preloadPromise = null;
    }
  })();

  return preloadPromise;
}

export async function generateOfflineCommentaryText(prompt: string) {
  const loadedGenerator = generator ?? (await preloadOfflineCommentaryModel());
  if (!loadedGenerator) {
    return null;
  }

  const runGeneration = async (currentGenerator: CommentaryGenerator) =>
    currentGenerator(prompt, {
      max_new_tokens: 40,
      temperature: 0.6,
      top_p: 0.9,
      do_sample: true,
      return_full_text: false,
    });

  let result: unknown;

  try {
    result = await runGeneration(loadedGenerator);
  } catch (error) {
    if (activeBackend === "webgpu" && isRecoverableWebGpuExecutionError(error)) {
      disabledBackends.add("webgpu");
      generator = null;
      activeBackend = null;
      patchState({
        status: "loading",
        error: null,
        progress: state.progress,
        progressLabel: "GPU failed. Switching AI rival to CPU fallback...",
        currentFile: null,
        hasLoadedBefore: state.hasLoadedBefore,
      });

      const fallbackGenerator = await preloadOfflineCommentaryModel("wasm");
      if (!fallbackGenerator) {
        return null;
      }

      result = await runGeneration(fallbackGenerator);
    } else {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to run the offline commentary model.";
      patchState({
        status: "error",
        error: message,
        progress: null,
        progressLabel: null,
        currentFile: null,
        hasLoadedBefore: state.hasLoadedBefore,
      });
      throw error;
    }
  }

  const firstItem = Array.isArray(result) ? result[0] : result;
  if (typeof firstItem === "string") {
    return firstItem;
  }

  if (
    firstItem &&
    typeof firstItem === "object" &&
    "generated_text" in firstItem &&
    typeof firstItem.generated_text === "string"
  ) {
    return firstItem.generated_text;
  }

  return null;
}

export function resetOfflineCommentaryModelForTests() {
  generator = null;
  preloadPromise = null;
  activeBackend = null;
  disabledBackends.clear();
  writePersistedModelReadyFlag(false);
  updateState(createInitialState());
}
