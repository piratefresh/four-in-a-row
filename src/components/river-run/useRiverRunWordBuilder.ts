import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { api } from "../../../convex/_generated/api";
import type { RiverRunPlayRun, TileMultiplier } from "./types";

export type RiverRunBuilderTile = {
  id: string;
  letter?: string;
  letters?: string[];
  baseValue?: number;
  baseValues?: number[];
  multiplier?: TileMultiplier;
  isChoice: boolean;
  disabled: boolean;
  tileIndex: number;
};

function sortDisabledToEnd(tiles: RiverRunBuilderTile[]): RiverRunBuilderTile[] {
  return [...tiles].sort(
    (a, b) => Number(!!a.disabled) - Number(!!b.disabled),
  );
}

const LENGTH_BONUS: Record<number, number> = {
  2: 0,
  3: 3,
  4: 6,
  5: 10,
  6: 15,
  7: 25,
};

export function useRiverRunWordBuilder(run: RiverRunPlayRun) {
  const submitPhaseWord = useMutation(api.riverRun.submitPhaseWord);
  const [builderTiles, setBuilderTiles] = useState<RiverRunBuilderTile[]>([]);
  const [activeTile, setActiveTile] = useState<RiverRunBuilderTile | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [choiceSelections, setChoiceSelections] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const revealed = run.tiles.filter((t) => t.revealed);

    const nextTiles: RiverRunBuilderTile[] = revealed.map((entry) => {
      if (entry.tile.kind === "single") {
        return {
          id: `rr-${entry.index}-${entry.tile.letter}`,
          letter: entry.tile.letter,
          baseValue: entry.tile.baseValue,
          multiplier: entry.tile.multiplier,
          isChoice: false,
          disabled: true,
          tileIndex: entry.index,
        };
      }
      return {
        id: `rr-${entry.index}-choice`,
        letters: entry.tile.options,
        baseValues: entry.tile.baseValues,
        multiplier: entry.tile.multiplier,
        isChoice: true,
        disabled: true,
        tileIndex: entry.index,
      };
    });

    setBuilderTiles((prev) => {
      const nextById = new Map(nextTiles.map((t) => [t.id, t]));
      const preserved: RiverRunBuilderTile[] = [];

      for (const prevTile of prev) {
        const next = nextById.get(prevTile.id);
        if (next) {
          preserved.push({ ...next, disabled: prevTile.disabled });
        }
      }

      const preservedIds = new Set(preserved.map((t) => t.id));
      const missing = nextTiles.filter((t) => !preservedIds.has(t.id));
      return sortDisabledToEnd([...preserved, ...missing]);
    });

    setChoiceSelections({});
    setSubmitError(null);
    setActiveTile(null);
  }, [run.phase, run.updatedAt]);

  const enabledTiles = useMemo(
    () => builderTiles.filter((t) => !t.disabled),
    [builderTiles],
  );

  const revealedCount = run.tiles.filter((t) => t.revealed).length;

  const wordPreview = useMemo(
    () =>
      enabledTiles
        .map((t) => {
          if (t.isChoice) {
            return choiceSelections[t.id] || "";
          }
          return t.letter ?? "";
        })
        .join(""),
    [enabledTiles, choiceSelections],
  );

  const hasUnresolvedChoices = useMemo(
    () => enabledTiles.some((t) => t.isChoice && !choiceSelections[t.id]),
    [enabledTiles, choiceSelections],
  );

  const wordScorePreview = useMemo(() => {
    if (enabledTiles.length === 0) return null;

    let letterPoints = 0;
    for (const t of enabledTiles) {
      if (t.isChoice) {
        const selected = choiceSelections[t.id];
        if (!selected) continue;
        const idx = t.letters?.indexOf(selected) ?? 0;
        const val = t.baseValues?.[idx] ?? 1;
        const mult = t.multiplier === "3L" ? 3 : t.multiplier === "2L" ? 2 : 1;
        letterPoints += val * mult;
      } else {
        const mult = t.multiplier === "3L" ? 3 : t.multiplier === "2L" ? 2 : 1;
        letterPoints += (t.baseValue ?? 1) * mult;
      }
    }

    const lengthBonus = LENGTH_BONUS[enabledTiles.length] ?? 0;
    return { total: letterPoints + lengthBonus, letterPoints, lengthBonus };
  }, [enabledTiles, choiceSelections]);

  const activeSubmission = useMemo(
    () => run.submissions.find((s) => s.phase === run.phase),
    [run.submissions, run.phase],
  );

  function handleToggleDisabled(id: string) {
    setBuilderTiles((prev) => {
      const tile = prev.find((t) => t.id === id);
      if (tile && !tile.disabled && tile.isChoice) {
        setChoiceSelections((selections) => {
          const { [id]: _, ...rest } = selections;
          return rest;
        });
      }
      return sortDisabledToEnd(
        prev.map((t) =>
          t.id === id ? { ...t, disabled: !t.disabled } : t,
        ),
      );
    });
    setSubmitError(null);
  }

  function handleChoiceSelect(tileId: string, letter: string) {
    setChoiceSelections((prev) => ({ ...prev, [tileId]: letter }));
  }

  function handleDragStart({ active }: DragStartEvent) {
    const tile =
      builderTiles.find((t) => t.id === String(active.id)) ?? null;
    setActiveTile(tile);
  }

  function handleDragCancel() {
    setActiveTile(null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTile(null);
    if (!over || active.id === over.id) return;
    setBuilderTiles((prev) => {
      const oldIdx = prev.findIndex((t) => t.id === active.id);
      const newIdx = prev.findIndex((t) => t.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      return sortDisabledToEnd(arrayMove(prev, oldIdx, newIdx));
    });
  }

  async function handleSubmitWord() {
    if (
      !wordPreview ||
      wordPreview.length < 2 ||
      isSubmitting ||
      !run.canSubmit ||
      hasUnresolvedChoices
    ) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitPhaseWord({
        code: run.roomCode,
        word: wordPreview,
      });
      if (!result.submission.valid && result.submission.invalidReason) {
        setSubmitError(result.submission.invalidReason);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not submit word.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    builderTiles,
    choiceSelections,
    wordPreview,
    wordScorePreview,
    activeTile,
    activeSubmission,
    isSubmitting,
    submitError,
    hasUnresolvedChoices,
    revealedCount,
    handleToggleDisabled,
    handleChoiceSelect,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
    handleSubmitWord,
  };
}
