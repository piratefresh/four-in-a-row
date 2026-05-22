import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  getCommunityTileRevealAnimation,
  getVisibleCommunityRevealCount,
  isCommunityTileRevealed,
  RoomCommunityStrip,
} from "./RoomCommunityStrip";

const flopTiles = [
  { kind: "single", letter: "A", baseValue: 1, revealed: true },
  { kind: "single", letter: "B", baseValue: 3, revealed: true },
  { kind: "single", letter: "C", baseValue: 3, revealed: true },
  { kind: "single", letter: "D", baseValue: 2, revealed: false },
  { kind: "single", letter: "E", baseValue: 1, revealed: false },
] as const;

describe("RoomCommunityStrip", () => {
  it("treats hidden community slots as zero visible reveals", () => {
    expect(getVisibleCommunityRevealCount(flopTiles, true)).toBe(0);
    expect(getVisibleCommunityRevealCount(flopTiles, false)).toBe(3);
  });

  it("treats omitted revealed flags as visible unless the strip is hidden", () => {
    const tile = { kind: "single", letter: "A", baseValue: 1 } as const;

    expect(isCommunityTileRevealed(tile, false)).toBe(true);
    expect(isCommunityTileRevealed(tile, true)).toBe(false);
  });

  it("stagger-animates the flop when hidden slots become visible", () => {
    const animatedProps = [0, 1, 2].map((index) =>
      getCommunityTileRevealAnimation({
        index,
        isRevealed: true,
        prevRevealedCount: 0,
        revealedCount: 3,
      }),
    );

    expect(animatedProps).toEqual([
      {
        className: "gf-tile animate-tile-flip",
        isNewlyRevealed: true,
        style: { "--tile-glint-delay": "0s", animationDelay: "0s" },
      },
      {
        className: "gf-tile animate-tile-flip",
        isNewlyRevealed: true,
        style: { "--tile-glint-delay": "0.13s", animationDelay: "0.13s" },
      },
      {
        className: "gf-tile animate-tile-flip",
        isNewlyRevealed: true,
        style: { "--tile-glint-delay": "0.26s", animationDelay: "0.26s" },
      },
    ]);
  });

  it("only animates newly revealed tiles after the flop", () => {
    expect(
      getCommunityTileRevealAnimation({
        index: 2,
        isRevealed: true,
        prevRevealedCount: 3,
        revealedCount: 4,
      }),
    ).toEqual({ isNewlyRevealed: false });
    expect(
      getCommunityTileRevealAnimation({
        index: 3,
        isRevealed: true,
        prevRevealedCount: 3,
        revealedCount: 4,
      }),
    ).toEqual({
      className: "gf-tile animate-tile-flip",
      isNewlyRevealed: true,
      style: { "--tile-glint-delay": "0s", animationDelay: "0s" },
    });
  });

  it("animates visible tiles on first active render", () => {
    const markup = renderToStaticMarkup(
      <RoomCommunityStrip tiles={flopTiles} hidden={false} />,
    );

    expect(markup).toContain("gf-tile animate-tile-flip");
    expect(markup).toContain("animation-delay:0s");
  });
});
