// @vitest-environment jsdom
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  StickerWheel,
  getStickerIndexFromPoint,
  getStickerWheelItemOffset,
  isLongPressMovementCancelled,
  isStickerWheelBlockedTarget,
} from "./StickerWheel";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  root = null;
  container?.remove();
  container = null;
});

function renderWheel(onSelect = vi.fn(), onClose = vi.fn()) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <StickerWheel
        state={{ open: true, x: 200, y: 200 }}
        onClose={onClose}
        onSelect={onSelect}
      />,
    );
  });
  return { onSelect, onClose };
}

describe("StickerWheel", () => {
  it("maps pointer positions to radial sticker slices", () => {
    expect(getStickerIndexFromPoint({ x: 100, y: 100 }, { x: 100, y: 4 })).toBe(7);
    expect(getStickerIndexFromPoint({ x: 100, y: 100 }, { x: 196, y: 100 })).toBe(1);
    expect(getStickerIndexFromPoint({ x: 100, y: 100 }, { x: 100, y: 196 })).toBe(3);
    expect(getStickerIndexFromPoint({ x: 100, y: 100 }, { x: 281, y: 100 })).toBe(null);
    expect(getStickerIndexFromPoint({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(null);
  });

  it("places sticker items inside the rendered wheel ring", () => {
    const itemCenterDistances = Array.from({ length: 8 }, (_, index) => {
      const { x, y } = getStickerWheelItemOffset(index);
      return Math.hypot(x, y);
    });

    for (const distance of itemCenterDistances) {
      expect(distance).toBeGreaterThan(56);
      expect(distance).toBeLessThan(180);
    }

    expect(getStickerWheelItemOffset(0).y).toBeLessThan(0);
    expect(getStickerWheelItemOffset(2).x).toBeGreaterThan(0);
    expect(getStickerWheelItemOffset(4).y).toBeGreaterThan(0);
    expect(getStickerWheelItemOffset(6).x).toBeLessThan(0);
  });

  it("sends the selected sticker from a wheel button", () => {
    const { onSelect, onClose } = renderWheel();

    const cheer = document.querySelector('[data-testid="sticker-wheel-cheer"]');
    expect(cheer).not.toBeNull();

    act(() => {
      cheer?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ stickerKey: "cheer" }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("closes without sending from the center button", () => {
    const { onSelect, onClose } = renderWheel();

    const close = document.querySelector('[data-testid="sticker-wheel-close"]');
    act(() => {
      close?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("detects interactive targets that should not open the wheel", () => {
    const button = document.createElement("button");
    const ignored = document.createElement("div");
    ignored.dataset.stickerWheelIgnore = "true";

    expect(isStickerWheelBlockedTarget(button)).toBe(true);
    expect(isStickerWheelBlockedTarget(ignored)).toBe(true);
    expect(isStickerWheelBlockedTarget(document.createElement("div"))).toBe(false);
  });

  it("keeps long press armed for small drift and cancels larger movement", () => {
    expect(isLongPressMovementCancelled({ x: 20, y: 20 }, { x: 26, y: 24 })).toBe(false);
    expect(isLongPressMovementCancelled({ x: 20, y: 20 }, { x: 38, y: 20 })).toBe(true);
  });
});
