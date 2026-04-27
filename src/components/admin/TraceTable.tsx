import { Fragment, useMemo, useState } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TraceDetail } from "./TraceDetail";
import type {
  TraceCategory,
  TraceComponentFilter,
  TraceDecisionSourceFilter,
  TraceGroup,
} from "./TraceFilters";

type TraceTableProps = {
  traces: Doc<"gameTraces">[];
  group: TraceGroup;
  component: TraceComponentFilter;
  decisionSource: TraceDecisionSourceFilter;
  difficulty: string;
  character: string;
  gameId: string;
  search: string;
  botOnly: boolean;
  fallbackOnly: boolean;
  failedOnly: boolean;
};

const CATEGORY_STYLES: Record<TraceCategory, string> = {
  game_start: "border-blue-400/30 bg-blue-400/15 text-blue-100",
  game_action: "border-zinc-400/30 bg-zinc-400/10 text-zinc-100",
  stage_change: "border-violet-400/30 bg-violet-400/15 text-violet-100",
  showdown_submit: "border-yellow-400/30 bg-yellow-400/15 text-yellow-100",
  game_complete: "border-emerald-400/30 bg-emerald-400/15 text-emerald-100",
  ai_betting: "border-orange-400/30 bg-orange-400/15 text-orange-100",
  ai_showdown: "border-cyan-400/30 bg-cyan-400/15 text-cyan-100",
  ai_dialogue: "border-pink-400/30 bg-pink-400/15 text-pink-100",
};

const GROUP_CATEGORIES: Record<TraceGroup, TraceCategory[]> = {
  all: [],
  game: ["game_start", "game_action", "stage_change", "showdown_submit", "game_complete"],
  ai: ["ai_betting", "ai_showdown"],
  dialogue: ["ai_dialogue"],
};

export function TraceTable({
  traces,
  group,
  component,
  decisionSource,
  difficulty,
  character,
  gameId,
  search,
  botOnly,
  fallbackOnly,
  failedOnly,
}: TraceTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filteredTraces = useMemo(() => {
    const groupCategories = GROUP_CATEGORIES[group];
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedDifficulty = difficulty.trim().toLowerCase();
    const normalizedCharacter = character.trim().toLowerCase();
    const normalizedGameId = gameId.trim().toLowerCase();

    return traces.filter((trace) => {
      if (
        groupCategories.length > 0 &&
        !groupCategories.includes(trace.category)
      ) {
        return false;
      }
      if (component !== "all" && trace.component !== component) return false;
      if (
        decisionSource !== "all" &&
        trace.decisionSource !== decisionSource
      ) {
        return false;
      }
      if (
        normalizedDifficulty &&
        trace.difficulty?.toLowerCase() !== normalizedDifficulty
      ) {
        return false;
      }
      if (
        normalizedCharacter &&
        ![trace.characterId, trace.playerName, trace.personality]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedCharacter),
          )
      ) {
        return false;
      }
      if (
        normalizedGameId &&
        !String(trace.gameId).toLowerCase().includes(normalizedGameId)
      ) {
        return false;
      }
      if (botOnly && !trace.isBot) return false;
      if (fallbackOnly && !trace.usedFallback) return false;
      if (failedOnly && trace.success) return false;
      if (!normalizedSearch) return true;

      return [
        trace.category,
        trace.component,
        trace.operation,
        trace.decisionSource,
        trace.playerName,
        trace.playerId,
        trace.characterId,
        trace.action,
        trace.executedAction,
        trace.actionOverrideReason,
        trace.stage,
        trace.wordSubmitted,
        trace.winnerWord,
        trace.dialogueMessage,
        trace.dialogueSource,
        trace.fallbackReason,
        trace.validationResult,
        trace.inputPrompt,
        trace.outputRaw,
        trace.outputParsed,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [
    botOnly,
    character,
    component,
    decisionSource,
    difficulty,
    failedOnly,
    fallbackOnly,
    gameId,
    group,
    search,
    traces,
  ]);

  if (filteredTraces.length === 0) {
    return (
      <div className="grid min-h-80 place-items-center rounded-md border border-white/10 bg-[#0c0d10] text-center">
        <div>
          <p className="text-sm font-semibold text-white">No traces found.</p>
          <p className="mt-1 text-sm text-white/45">
            Start a dev game with bots to populate this stream.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-[#0c0d10]">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="w-9 text-white/45" />
            <TableHead className="text-white/45">Time</TableHead>
            <TableHead className="text-white/45">Category</TableHead>
            <TableHead className="text-white/45">Player</TableHead>
            <TableHead className="text-white/45">Action / Word</TableHead>
            <TableHead className="text-white/45">Stage</TableHead>
            <TableHead className="text-white/45">Details</TableHead>
            <TableHead className="text-right text-white/45">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTraces.map((trace) => {
            const expanded = expandedId === trace._id;
            return (
              <Fragment key={trace._id}>
                <TableRow
                  aria-expanded={expanded}
                  onClick={() => setExpandedId(expanded ? null : trace._id)}
                  className="cursor-pointer border-white/10 hover:bg-white/[0.04]"
                >
                  <TableCell className="text-white/50">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-white/65">
                    {formatTime(trace.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`rounded-sm px-2 py-0.5 font-mono text-[11px] ${CATEGORY_STYLES[trace.category]}`}
                    >
                      {trace.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-44 truncate text-white/80">
                    {trace.isBot ? "AI " : ""}
                    {trace.playerName ?? trace.playerId ?? "-"}
                  </TableCell>
                  <TableCell className="max-w-56 truncate font-mono text-xs text-white/80">
                    {getPrimarySignal(trace)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-white/65">
                    {trace.stage ?? "-"}
                  </TableCell>
                  <TableCell className="max-w-96 truncate text-white/55">
                    {getTraceDetails(trace)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`rounded-sm px-2 py-1 text-[11px] ${
                        trace.success
                          ? "bg-emerald-400/10 text-emerald-100"
                          : "bg-red-400/10 text-red-100"
                      }`}
                    >
                      {trace.success ? "ok" : "failed"}
                    </span>
                  </TableCell>
                </TableRow>
                {expanded ? (
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableCell colSpan={8} className="p-0">
                      <TraceDetail trace={trace} />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function getPrimarySignal(trace: Doc<"gameTraces">) {
  if (trace.wordSubmitted) return `${trace.wordSubmitted} (${trace.wordScore ?? 0})`;
  if (trace.winnerId) return `winner ${trace.winnerWord ?? trace.winnerId}`;
  if (trace.action === "raise" && trace.raiseAmount) return `raise to ${trace.raiseAmount}`;
  if (trace.action) return trace.action;
  if (trace.category === "stage_change") {
    return `${trace.previousStage ?? "-"} -> ${trace.stage ?? "-"}`;
  }
  if (trace.category === "game_start") return "new hand";
  return "-";
}

function getTraceDetails(trace: Doc<"gameTraces">) {
  if (trace.dialogueMessage) return trace.dialogueMessage;
  if (trace.error) return trace.error;
  if (trace.actionOverrideReason) return trace.actionOverrideReason;
  if (trace.fallbackReason) return `fallback: ${trace.fallbackReason}`;
  if (trace.validationResult) return `validation: ${trace.validationResult}`;
  if (trace.handStrength !== undefined) {
    const bluff = trace.isBluffing ? "bluff" : "no bluff";
    return `HS ${trace.handStrength.toFixed(2)} . ${bluff}`;
  }
  if (trace.potBefore !== undefined || trace.potAfter !== undefined) {
    return `Pot ${trace.potBefore ?? "-"} -> ${trace.potAfter ?? "-"}`;
  }
  if (trace.tilesRevealed) return `Tiles ${trace.tilesRevealed}`;
  if (trace.usedFallback) return "fallback";
  return "-";
}
