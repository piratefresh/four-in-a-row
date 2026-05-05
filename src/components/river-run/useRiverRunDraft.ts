import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { RiverRunPlayRun } from "./types";

export function useRiverRunDraft(run: RiverRunPlayRun) {
  const submitDraftDiscard = useMutation(api.riverRun.submitDraftDiscard);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedCount = selectedIndices.size;
  const canSubmit = selectedCount === 4;

  function handleToggleTile(index: number) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else if (next.size < 4) {
        next.add(index);
      }
      return next;
    });
    setSubmitError(null);
  }

  async function handleSubmitDraft() {
    if (selectedCount !== 4 || isSubmitting || !run.canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitDraftDiscard({
        code: run.roomCode,
        keptIndices: Array.from(selectedIndices),
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not submit discards.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    selectedIndices,
    isSubmitting,
    submitError,
    handleToggleTile,
    handleSubmitDraft,
    canSubmit,
    selectedCount,
  };
}
