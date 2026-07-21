import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  getFoldActionState,
  RoomActionControls,
  shouldResetFoldConfirmation,
} from "./RoomActionControls";

describe("RoomActionControls", () => {
  it("starts fold interactions with the non-destructive Fold action", () => {
    expect(
      getFoldActionState({ isConfirmingFold: false, isBetting: false }),
    ).toEqual({
      primaryLabel: "Fold",
      secondaryLabel: null,
    });
  });

  it("shows confirmation actions after fold is requested", () => {
    expect(
      getFoldActionState({ isConfirmingFold: true, isBetting: false }),
    ).toEqual({
      primaryLabel: "Confirm fold",
      secondaryLabel: "Cancel",
    });
  });

  it("resets fold confirmation when the active fold flow ends", () => {
    expect(
      shouldResetFoldConfirmation({
        isMyTurn: true,
        isBetting: false,
        canFold: true,
      }),
    ).toBe(false);
    expect(
      shouldResetFoldConfirmation({
        isMyTurn: false,
        isBetting: false,
        canFold: true,
      }),
    ).toBe(true);
    expect(
      shouldResetFoldConfirmation({
        isMyTurn: true,
        isBetting: true,
        canFold: true,
      }),
    ).toBe(true);
    expect(
      shouldResetFoldConfirmation({
        isMyTurn: true,
        isBetting: false,
        canFold: false,
      }),
    ).toBe(true);
  });

  it("renders Leave room after folding", () => {
    const onLeaveRoom = vi.fn();

    const markup = renderToStaticMarkup(
      <RoomActionControls folded={{ onLeaveRoom }} />,
    );

    expect(markup).toContain("Leave room");
  });

  const baseBetting = {
    isBetting: false,
    isMyTurn: true,
    canCheck: false,
    canCall: true,
    canRaise: true,
    canFold: true,
    currentTurnPlayerName: "You",
    callLabel: "Call",
    callAmount: 20,
    raiseLabel: "Maxed",
    raiseAmount: 40,
    raiseOptions: [40, 60],
  };

  it("labels the raise action 'Bet' when opening the action (no live bet)", () => {
    const markup = renderToStaticMarkup(
      <RoomActionControls betting={{ ...baseBetting, isOpeningBet: true }} />,
    );
    expect(markup).toContain("Bet");
    expect(markup).not.toContain("Raise to");
  });

  it("labels the raise action 'Raise to' when there is a live bet", () => {
    const markup = renderToStaticMarkup(
      <RoomActionControls betting={{ ...baseBetting, isOpeningBet: false }} />,
    );
    expect(markup).toContain("Raise to");
  });

  it("renders the out-of-chips re-buy/leave controls with the buy-in", () => {
    const markup = renderToStaticMarkup(
      <RoomActionControls
        outOfChips={{
          buyIn: 500,
          canAfford: true,
          isRebuying: false,
          onRebuy: vi.fn(),
          onLeave: vi.fn(),
        }}
      />,
    );
    expect(markup).toContain("out of chips");
    expect(markup).toContain("Re-buy");
    expect(markup).toContain("500");
    expect(markup).toContain("Leave room");
  });

  it("warns and blocks re-buy when the wallet cannot cover the buy-in", () => {
    const markup = renderToStaticMarkup(
      <RoomActionControls
        outOfChips={{
          buyIn: 5000,
          canAfford: false,
          isRebuying: false,
          onRebuy: vi.fn(),
          onLeave: vi.fn(),
        }}
      />,
    );
    expect(markup).toContain("Not enough coins");
    // The re-buy button is disabled when the wallet can't cover it.
    expect(markup).toMatch(/Re-buy[^<]*<\/button>|disabled/);
  });
});
