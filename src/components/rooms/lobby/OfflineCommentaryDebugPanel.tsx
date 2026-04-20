import type { OfflineCommentaryModelState } from "@/lib/offline-commentary";

type OfflineCommentaryDebugState = {
  enabled: boolean;
  stageKey: string | null;
  attemptedStageCount: number;
  botCount: number;
  lastOutcome: string | null;
  speakerName: string | null;
  parsedMessage: string | null;
  rawResponse: string | null;
  prompt: string | null;
  error: string | null;
};

type OfflineCommentaryDebugPanelProps = {
  modelState: OfflineCommentaryModelState;
  debugState: OfflineCommentaryDebugState;
};

function formatSnippet(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  return value.length > 140 ? `${value.slice(0, 140)}...` : value;
}

export function OfflineCommentaryDebugPanel({
  modelState,
  debugState,
}: OfflineCommentaryDebugPanelProps) {
  return (
    <div className="fixed bottom-4 left-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-amber-700/70 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur-sm">
      <div className="text-sm font-semibold text-amber-200">AI Rival Debug</div>
      <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
        <span className="text-slate-400">Model</span>
        <span>{modelState.status}</span>
        <span className="text-slate-400">Cached</span>
        <span>{modelState.hasLoadedBefore ? "yes" : "no"}</span>
        <span className="text-slate-400">Progress</span>
        <span>{modelState.progress !== null ? `${modelState.progress}%` : "-"}</span>
        <span className="text-slate-400">Enabled</span>
        <span>{debugState.enabled ? "yes" : "no"}</span>
        <span className="text-slate-400">Stage</span>
        <span>{debugState.stageKey ?? "-"}</span>
        <span className="text-slate-400">Attempts</span>
        <span>{debugState.attemptedStageCount}</span>
        <span className="text-slate-400">Bots</span>
        <span>{debugState.botCount}</span>
        <span className="text-slate-400">Outcome</span>
        <span>{debugState.lastOutcome}</span>
        <span className="text-slate-400">Speaker</span>
        <span>{debugState.speakerName ?? "-"}</span>
        <span className="text-slate-400">Message</span>
        <span>{formatSnippet(debugState.parsedMessage, "-")}</span>
      </div>

      <div className="mt-3 space-y-2 text-[11px] leading-5 text-slate-200">
        <div>
          <div className="text-slate-400">Loader</div>
          <div>{formatSnippet(modelState.progressLabel, "-")}</div>
        </div>
        <div>
          <div className="text-slate-400">Raw response</div>
          <div>{formatSnippet(debugState.rawResponse, "-")}</div>
        </div>
        <div>
          <div className="text-slate-400">Prompt</div>
          <div>{formatSnippet(debugState.prompt, "-")}</div>
        </div>
        {debugState.error ? (
          <div>
            <div className="text-slate-400">Error</div>
            <div className="text-rose-300">{debugState.error}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
