import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { RiverRunPlayRun, SelectedTile } from "./types";

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
  const [selectedTiles, setSelectedTiles] = useState<SelectedTile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTiles([]);
    setSubmitError(null);
  }, [run.phase, run.updatedAt]);

  const selectedWord = useMemo(
    () => selectedTiles.map((t) => t.letter).join(""),
    [selectedTiles],
  );

  const selectedScorePreview = useMemo(() => {
    if (selectedTiles.length === 0) return 0;
    const letterSum = selectedTiles.reduce((sum, t) => {
      const mult = t.multiplier === "3L" ? 3 : t.multiplier === "2L" ? 2 : 1;
      return sum + t.baseValue * mult;
    }, 0);
    const lengthBonus = LENGTH_BONUS[selectedTiles.length] ?? 0;
    return letterSum + lengthBonus;
  }, [selectedTiles]);

  const selectedIndexes = useMemo(
    () => new Set(selectedTiles.map((t) => t.index)),
    [selectedTiles],
  );

  const activeSubmission = useMemo(
    () => run.submissions.find((s) => s.phase === run.phase),
    [run.submissions, run.phase],
  );

  function addTile(tile: SelectedTile) {
    if (!run.canSubmit || selectedIndexes.has(tile.index)) return;
    setSelectedTiles((prev) => [...prev, tile]);
    setSubmitError(null);
  }

  function removeTile(key: string) {
    setSelectedTiles((prev) => prev.filter((t) => t.key !== key));
    setSubmitError(null);
  }

  function clearTiles() {
    setSelectedTiles([]);
    setSubmitError(null);
  }

  async function submit() {
    if (!selectedWord || isSubmitting || !run.canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitPhaseWord({
        code: run.roomCode,
        word: selectedWord,
      });
      if (!result.submission.valid && result.submission.invalidReason) {
        setSubmitError(result.submission.invalidReason);
      }
      setSelectedTiles([]);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not submit word.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    selectedTiles,
    selectedWord,
    selectedScorePreview,
    selectedIndexes,
    activeSubmission,
    isSubmitting,
    submitError,
    addTile,
    removeTile,
    clearTiles,
    submit,
  };
}
