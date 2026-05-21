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
});
