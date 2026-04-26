import type { Doc } from "../../../convex/_generated/dataModel";
import type { ReactNode } from "react";

type TraceDetailProps = {
  trace: Doc<"gameTraces">;
};

export function TraceDetail({ trace }: TraceDetailProps) {
  return (
    <div className="grid gap-3 border-t border-white/10 bg-black/30 p-4 text-xs text-white/75 lg:grid-cols-3">
      <DetailSection title="Context">
        <DetailItem label="Game" value={trace.gameId} />
        <DetailItem label="Room" value={trace.roomId ?? "-"} />
        <DetailItem label="Stage" value={trace.stage ?? "-"} />
        <DetailItem label="Player" value={trace.playerName ?? trace.playerId ?? "-"} />
        <DetailItem label="Character" value={trace.characterId ?? "-"} />
      </DetailSection>

      <DetailSection title="Signals">
        <DetailItem label="Action" value={trace.action ?? "-"} />
        <DetailItem label="Word" value={trace.wordSubmitted ?? "-"} />
        <DetailItem label="Score" value={trace.wordScore ?? trace.winnerScore ?? "-"} />
        <DetailItem label="Hand strength" value={formatNumber(trace.handStrength)} />
        <DetailItem label="Rate of return" value={formatNumber(trace.rateOfReturn, { infinity: true })} />
        <DetailItem label="Pot odds" value={formatNumber(trace.potOdds)} />
        <DetailItem label="Chip risk" value={formatNumber(trace.chipRisk)} />
        <DetailItem label="FCR bucket" value={trace.fcrBucket ?? "-"} />
        <DetailItem label="Probabilistic action" value={trace.probabilisticAction ?? "-"} />
        <DetailItem label="Cache hit" value={trace.actionCacheHit === undefined ? "-" : trace.actionCacheHit ? "Yes" : "No"} />
        <DetailItem label="Fallback" value={trace.usedFallback === undefined ? "-" : trace.usedFallback ? "Yes" : "No"} />
      </DetailSection>

      <DetailSection title="Payload">
        <DetailItem label="Model" value={trace.model ?? "-"} />
        <DetailItem label="Difficulty" value={trace.difficulty ?? "-"} />
        <DetailItem label="Success" value={trace.success ? "Yes" : "No"} />
        <DetailItem label="Error" value={trace.error ?? "-"} />
      </DetailSection>

      {trace.inputPrompt ? (
        <PreBlock title="Prompt" value={trace.inputPrompt} />
      ) : null}
      {trace.outputRaw ? <PreBlock title="Raw Output" value={trace.outputRaw} /> : null}
      {trace.outputParsed ? (
        <PreBlock title="Parsed Output" value={trace.outputParsed} />
      ) : null}
      {trace.metadata !== undefined ? (
        <PreBlock title="Metadata" value={JSON.stringify(trace.metadata, null, 2)} />
      ) : null}
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-sm border border-white/10 bg-[#0c0d10] p-3">
      <h4 className="mb-2 text-[11px] font-semibold uppercase text-white/45">
        {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex min-w-0 justify-between gap-3">
      <span className="text-white/40">{label}</span>
      <span className="truncate text-right font-mono text-white/80">{value}</span>
    </div>
  );
}

function PreBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="lg:col-span-3">
      <h4 className="mb-2 text-[11px] font-semibold uppercase text-white/45">
        {title}
      </h4>
      <pre className="max-h-72 overflow-auto rounded-sm border border-white/10 bg-[#050608] p-3 font-mono text-[11px] leading-relaxed text-white/70">
        {value}
      </pre>
    </div>
  );
}

function formatNumber(value: number | undefined, options?: { infinity?: boolean }) {
  if (value === undefined) return "-";
  if (options?.infinity && value === Infinity) return "∞";
  return value.toFixed(3);
}
