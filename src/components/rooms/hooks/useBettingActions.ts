import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useBettingActions(
  gameId: string | undefined,
  playerId: string | null,
  maxRaisesPerRound: number,
  raisesThisRound: number,
  selectedRaiseAmount: number | null,
) {
  const [isBetting, setIsBetting] = useState(false);
  const [gameMessage, setGameMessage] = useState<string | null>(null);

  const check = useMutation(api.games.check);
  const call = useMutation(api.games.call);
  const raise = useMutation(api.games.raise);
  const fold = useMutation(api.games.fold);

  const handleCheck = useCallback(async () => {
    if (!gameId || !playerId) return;
    setIsBetting(true);
    setGameMessage(null);
    try {
      await check({ gameId, playerId });
      setGameMessage("Checked.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to check.";
      setGameMessage(message);
    } finally {
      setIsBetting(false);
    }
  }, [check, gameId, playerId]);

  const handleCall = useCallback(async () => {
    if (!gameId || !playerId) return;
    setIsBetting(true);
    setGameMessage(null);
    try {
      const result = await call({ gameId, playerId });
      setGameMessage(`Matched ${result.amountCalled} chips.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to call.";
      setGameMessage(message);
    } finally {
      setIsBetting(false);
    }
  }, [call, gameId, playerId]);

  const handleRaise = useCallback(async () => {
    if (!gameId || !playerId || selectedRaiseAmount === null) return;
    if (raisesThisRound >= maxRaisesPerRound) {
      setGameMessage(
        `Raise limit reached (${maxRaisesPerRound}/${maxRaisesPerRound}).`,
      );
      return;
    }
    setIsBetting(true);
    setGameMessage(null);
    try {
      await raise({ gameId, playerId, raiseToAmount: selectedRaiseAmount });
      setGameMessage(`Raised to ${selectedRaiseAmount} chips.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to raise.";
      setGameMessage(message);
    } finally {
      setIsBetting(false);
    }
  }, [
    gameId,
    maxRaisesPerRound,
    playerId,
    raise,
    raisesThisRound,
    selectedRaiseAmount,
  ]);

  const handleFold = useCallback(async () => {
    if (!gameId || !playerId) return;
    setIsBetting(true);
    setGameMessage(null);
    try {
      await fold({ gameId, playerId });
      setGameMessage("Folded.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fold.";
      setGameMessage(message);
    } finally {
      setIsBetting(false);
    }
  }, [fold, gameId, playerId]);

  return {
    handleCheck,
    handleCall,
    handleRaise,
    handleFold,
    isBetting,
    gameMessage,
    setGameMessage,
  } as const;
}
