import { useEffect, useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { BuilderTile, PlayerHand, Tile } from "../board/RoomHandsBoard.types";
import type {
  DragCancelEvent,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Id } from "../../../../convex/_generated/dataModel";
import { calculateShowdownPreviewScore } from "../../../lib/showdownScore";

function sortDisabledToEnd(tiles: BuilderTile[]) {
  return [...tiles].sort((a, b) => Number(!!a.disabled) - Number(!!b.disabled));
}

function shuffleTiles(tiles: BuilderTile[]) {
  const shuffled = [...tiles];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function useRoomWordBuilder({
  gameId,
  bottomHand,
  communityTiles,
}: {
  gameId: Id<"games">;
  bottomHand?: PlayerHand;
  communityTiles: Tile[];
}) {
  const submitWord = useAction(api.games.submitWord);
  const wordSubmissions = useQuery(api.games.getWordSubmissions, { gameId });
  const [builderTiles, setBuilderTiles] = useState<BuilderTile[]>([]);
  const [activeTile, setActiveTile] = useState<BuilderTile | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [shuffleTick, setShuffleTick] = useState(0);
  const [choiceSelections, setChoiceSelections] = useState<
    Record<string, string>
  >({});
  const enabledBuilderTiles = useMemo(
    () => builderTiles.filter((tile) => !tile.disabled),
    [builderTiles],
  );

  useEffect(() => {
    if (!bottomHand) {
      setBuilderTiles([]);
      setShuffleTick(0);
      return;
    }

    const nextTiles: BuilderTile[] = [
      ...bottomHand.tiles.map((tile, index) => {
        if (tile.kind === "choice") {
          return {
            id: `hand-${bottomHand._id}-${index}-choice-${tile.options.join("/")}`,
            letters: tile.options,
            baseValues: tile.baseValues,
            multiplier: tile.multiplier,
            source: "hand" as const,
            disabled: true,
            isChoice: true,
            cardIndex: index,
          };
        }
        return {
          id: `hand-${bottomHand._id}-${index}-${tile.letter}-${tile.baseValue}`,
          letter: tile.letter,
          baseValue: tile.baseValue,
          multiplier: tile.multiplier,
          source: "hand" as const,
          disabled: true,
          cardIndex: index,
        };
      }),
      ...communityTiles
        .filter((tile) => tile.revealed)
        .map((tile, index) => {
          if (tile.kind === "choice") {
            return {
              id: `community-${index}-choice-${tile.options.join("/")}`,
              letters: tile.options,
              baseValues: tile.baseValues,
              multiplier: tile.multiplier,
              source: "community" as const,
              disabled: true,
              isChoice: true,
              cardIndex: index,
            };
          }
          return {
            id: `community-${index}-${tile.letter}-${tile.baseValue}`,
            letter: tile.letter,
            baseValue: tile.baseValue,
            multiplier: tile.multiplier,
            source: "community" as const,
            disabled: true,
            cardIndex: index,
          };
        }),
    ];

    setBuilderTiles((previous) => {
      const nextById = new Map(nextTiles.map((tile) => [tile.id, tile]));
      const preserved: BuilderTile[] = [];

      for (const prevTile of previous) {
        const nextTile = nextById.get(prevTile.id);
        if (nextTile) {
          preserved.push({ ...nextTile, disabled: prevTile.disabled });
        }
      }

      const preservedIds = new Set(preserved.map((tile) => tile.id));
      const missing = nextTiles.filter((tile) => !preservedIds.has(tile.id));
      return sortDisabledToEnd([...preserved, ...missing]);
    });
  }, [bottomHand, communityTiles]);

  const wordPreview = useMemo(
    () =>
      enabledBuilderTiles
        .map((tile) => {
          if (tile.isChoice) {
            return choiceSelections[tile.id] || `[${tile.letters?.[0]}]`;
          }
          return tile.letter ?? "";
        })
        .join(""),
    [choiceSelections, enabledBuilderTiles],
  );

  const unresolvedChoices = useMemo(
    () =>
      enabledBuilderTiles
        .filter((tile) => tile.isChoice)
        .filter((tile) => !choiceSelections[tile.id]),
    [choiceSelections, enabledBuilderTiles],
  );

  const hasUnresolvedChoices = unresolvedChoices.length > 0;

  const resolvedPreviewTiles = useMemo(() => {
    const previewTiles = enabledBuilderTiles.map((tile) => {
      if (tile.isChoice) {
        const selectedLetter = choiceSelections[tile.id];
        if (!selectedLetter) return null;

        const optionIndex = tile.letters?.indexOf(selectedLetter) ?? 0;

        return {
          letter: selectedLetter,
          baseValue: tile.baseValues?.[optionIndex] ?? 1,
          multiplier: tile.multiplier,
          source: tile.source,
          cardIndex: tile.cardIndex,
          wasChoice: true,
        };
      }

      if (!tile.letter || typeof tile.baseValue !== "number") {
        return null;
      }

      return {
        letter: tile.letter,
        baseValue: tile.baseValue,
        multiplier: tile.multiplier,
        source: tile.source,
        cardIndex: tile.cardIndex,
        wasChoice: false,
      };
    });

    return previewTiles.every((tile) => tile !== null) ? previewTiles : null;
  }, [choiceSelections, enabledBuilderTiles]);

  const wordScorePreview = useMemo(() => {
    if (!resolvedPreviewTiles) return null;
    return calculateShowdownPreviewScore(resolvedPreviewTiles);
  }, [resolvedPreviewTiles]);

  const mySubmission = useMemo(() => {
    if (!bottomHand || !wordSubmissions?.submissions) return null;
    return wordSubmissions.submissions.find(
      (submission) => submission.playerId === bottomHand.playerId,
    );
  }, [bottomHand, wordSubmissions]);

  useEffect(() => {
    if (!mySubmission || !wordSubmissions?.isCompleted) {
      setShowReveal(false);
      return;
    }

    const revealTimer = window.setTimeout(() => {
      setShowReveal(true);
    }, 500);

    return () => {
      window.clearTimeout(revealTimer);
    };
  }, [mySubmission, wordSubmissions?.isCompleted]);

  const otherSubmissions = useMemo(() => {
    if (!bottomHand || !wordSubmissions?.submissions) return [];
    return wordSubmissions.submissions.filter(
      (submission) => submission.playerId !== bottomHand.playerId,
    );
  }, [bottomHand, wordSubmissions]);

  const handleToggleDisabled = (id: string) => {
    setBuilderTiles((previous) => {
      const tile = previous.find((item) => item.id === id);
      if (tile && !tile.disabled) {
        setChoiceSelections((selections) => {
          const { [id]: _, ...rest } = selections;
          return rest;
        });
      }
      return sortDisabledToEnd(
        previous.map((tile) =>
          tile.id === id ? { ...tile, disabled: !tile.disabled } : tile,
        ),
      );
    });
  };

  const handleChoiceSelect = (tileId: string, letter: string) => {
    setChoiceSelections((previous) => ({
      ...previous,
      [tileId]: letter,
    }));
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    const tile =
      builderTiles.find((item) => item.id === String(active.id)) ?? null;
    setActiveTile(tile);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveTile(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTile(null);
    if (!over || active.id === over.id) return;
    setBuilderTiles((previous) => {
      const oldIndex = previous.findIndex((item) => item.id === active.id);
      const newIndex = previous.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return previous;
      return sortDisabledToEnd(arrayMove(previous, oldIndex, newIndex));
    });
  };

  const handleShuffleTiles = () => {
    setBuilderTiles((previous) => {
      const enabledTiles = previous.filter((tile) => !tile.disabled);
      const disabledTiles = previous.filter((tile) => tile.disabled);
      return [...shuffleTiles(enabledTiles), ...shuffleTiles(disabledTiles)];
    });
    setShuffleTick((previous) => previous + 1);
  };

  const handleSubmitWord = async () => {
    if (!wordPreview || wordPreview.length < 2) {
      setValidationError("Word must be at least 2 letters");
      return;
    }

    if (hasUnresolvedChoices) {
      setValidationError("Please select a letter for each choice card");
      return;
    }

    if (!bottomHand) {
      setValidationError("No player hand available");
      return;
    }

    if (bottomHand.hasFolded) {
      setValidationError("Cannot submit word after folding");
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      if (!resolvedPreviewTiles) {
        setValidationError("Please select a letter for each choice card");
        setIsValidating(false);
        return;
      }

      const tiles = resolvedPreviewTiles;

      const choiceResolutions: {
        hand?: Record<string, string>;
        community?: Record<string, string>;
      } = {};

      enabledBuilderTiles.forEach((tile) => {
        if (tile.isChoice && tile.cardIndex !== undefined) {
          const selectedLetter = choiceSelections[tile.id];
          const resolutionKey = tile.source === "hand" ? "hand" : "community";
          if (!choiceResolutions[resolutionKey]) {
            choiceResolutions[resolutionKey] = {};
          }
          choiceResolutions[resolutionKey]![String(tile.cardIndex)] =
            selectedLetter;
        }
      });

      const result = await submitWord({
        gameId,
        playerId: bottomHand.playerId,
        word: wordPreview.replace(/\[|\]/g, ""),
        tiles,
        choiceResolutions:
          Object.keys(choiceResolutions).length > 0
            ? choiceResolutions
            : undefined,
      });

      if (result?.forfeited) {
        setValidationError(
          result.message ?? "Invalid word. Submitted with 0 points.",
        );
      }

      setIsValidating(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error submitting word. Please try again.";
      setValidationError(message);
      setIsValidating(false);
    }
  };

  return {
    activeTile,
    builderTiles,
    choiceSelections,
    handleChoiceSelect,
    handleDragCancel,
    handleDragEnd,
    handleDragStart,
    handleShuffleTiles,
    handleSubmitWord,
    handleToggleDisabled,
    hasUnresolvedChoices,
    isValidating,
    mySubmission,
    otherSubmissions,
    setActiveTile,
    shuffleTick,
    showReveal,
    validationError,
    wordPreview,
    wordScorePreview,
    wordSubmissions,
  };
}
