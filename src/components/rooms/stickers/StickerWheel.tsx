import { useEffect, useMemo, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  ROOM_STICKERS,
  type RoomStickerKey,
} from "../../../../convex/stickerCatalog";
import { cn } from "@/lib/utils";

const WHEEL_SIZE = 360;
const OUTER_RADIUS = WHEEL_SIZE / 2;
const ITEM_RADIUS = 136;
const CANCEL_RADIUS = 56;
const LONG_PRESS_MS = 450;
const RIGHT_PRESS_MS = 500;
const MOVE_CANCEL_PX = 12;

type Point = { x: number; y: number };

export type StickerWheelSelection = {
  stickerKey: RoomStickerKey;
  label: string;
  symbol: string;
};

export type StickerWheelState = {
  open: boolean;
  x: number;
  y: number;
};

type StickerWheelProps = {
  state: StickerWheelState;
  onClose: () => void;
  onSelect: (selection: StickerWheelSelection) => void;
};

export function isStickerWheelBlockedTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      [
        "button",
        "a",
        "input",
        "textarea",
        "select",
        "[role='button']",
        "[role='menu']",
        "[data-sticker-wheel-ignore='true']",
        "[data-dnd-kit-draggable]",
      ].join(","),
    ),
  );
}

export function getStickerIndexFromPoint(center: Point, point: Point) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const distance = Math.hypot(dx, dy);

  if (distance < CANCEL_RADIUS || distance > OUTER_RADIUS) return null;

  const degrees = (Math.atan2(dy, dx) * 180) / Math.PI;
  const normalized = (degrees + 450) % 360;
  return Math.floor(((normalized + 337.5) % 360) / 45);
}

export function getStickerWheelItemOffset(index: number) {
  const angle = index * 45 - 45;
  const radians = (angle * Math.PI) / 180;

  return {
    x: Math.cos(radians) * ITEM_RADIUS,
    y: Math.sin(radians) * ITEM_RADIUS,
  };
}

export function isLongPressMovementCancelled(start: Point, current: Point) {
  return Math.hypot(current.x - start.x, current.y - start.y) > MOVE_CANCEL_PX;
}

function toSelection(
  sticker: (typeof ROOM_STICKERS)[number],
): StickerWheelSelection {
  return {
    stickerKey: sticker.key,
    label: sticker.label,
    symbol: sticker.symbol,
  };
}

function getWheelHighlightBackground(activeIndex: number | null) {
  const divider =
    "repeating-conic-gradient(from 22.5deg, rgba(239,218,151,0.34) 0deg 0.7deg, transparent 0.7deg 45deg)";

  if (activeIndex === null) {
    return `${divider}, radial-gradient(circle, rgba(0,0,0,0.1) 0 31%, transparent 32%)`;
  }

  const slices = Array.from({ length: 8 })
    .map((_, index) => {
      const start = index * 45;
      const end = start + 45;
      const color =
        index === activeIndex
          ? "rgba(185,34,34,0.76)"
          : "rgba(255,255,255,0.03)";
      return `${color} ${start}deg ${end}deg`;
    })
    .join(",");

  return `${divider}, conic-gradient(from 22.5deg, ${slices})`;
}

export function StickerWheel({ state, onClose, onSelect }: StickerWheelProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const center = useMemo(
    () => ({ x: state.x, y: state.y }),
    [state.x, state.y],
  );

  useEffect(() => {
    if (!state.open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, state.open]);

  useEffect(() => {
    if (state.open) {
      setActiveIndex(0);
    }
  }, [state.open]);

  if (!state.open) return null;

  const activeSticker =
    activeIndex === null ? null : (ROOM_STICKERS[activeIndex] ?? null);

  const confirm = () => {
    if (!activeSticker) {
      onClose();
      return;
    }
    onSelect(toSelection(activeSticker));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[1px]"
      data-testid="sticker-wheel-backdrop"
      onPointerMove={(event) => {
        const nextIndex = getStickerIndexFromPoint(center, {
          x: event.clientX,
          y: event.clientY,
        });
        setActiveIndex(nextIndex);
      }}
      onPointerUp={(event) => {
        if (event.pointerType === "touch") {
          const nextIndex = getStickerIndexFromPoint(center, {
            x: event.clientX,
            y: event.clientY,
          });
          const sticker = nextIndex === null ? null : ROOM_STICKERS[nextIndex];
          if (sticker) {
            onSelect(toSelection(sticker));
          }
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={wheelRef}
        className="absolute h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2"
        style={{ left: state.x, top: state.y }}
      >
        <div className="absolute inset-0 rounded-full border border-[#d9c88a]/45 bg-black/66 shadow-[0_24px_80px_rgba(0,0,0,0.58)]" />
        <div
          className="absolute inset-0 rounded-full opacity-80"
          style={{
            background: getWheelHighlightBackground(activeIndex),
          }}
        />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[112px] w-[112px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d9c88a]/30 bg-black/45" />
        {ROOM_STICKERS.map((sticker, index) => {
          const { x, y } = getStickerWheelItemOffset(index);
          const selected = activeIndex === index;

          return (
            <button
              key={sticker.key}
              type="button"
              className={cn(
                "absolute left-1/2 top-1/2 flex h-[68px] w-[76px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-[8px] border border-transparent text-[#eee6cf] transition duration-100",
                "hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f1d585]",
                selected && "text-white",
              )}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
              }}
              onPointerEnter={() => setActiveIndex(index)}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(toSelection(sticker));
                onClose();
              }}
              aria-label={`Send ${sticker.label} sticker`}
              data-testid={`sticker-wheel-${sticker.key}`}
            >
              <span
                className={cn(
                  "text-[34px] leading-none [text-shadow:0_3px_10px_rgba(0,0,0,0.75)]",
                  selected && "scale-110",
                )}
              >
                {sticker.symbol}
              </span>
              <span className="font-serif text-[14px] font-semibold leading-none tracking-wide [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]">
                {sticker.label}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          className="absolute left-1/2 top-1/2 z-20 flex h-[94px] w-[94px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[#d9c88a]/40 bg-[#07110e]/95 text-[#eee6cf] shadow-[0_12px_28px_rgba(0,0,0,0.52)] hover:bg-[#111b17] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f1d585]"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          onDoubleClick={(event) => event.stopPropagation()}
          aria-label="Close sticker wheel"
          data-testid="sticker-wheel-close"
        >
          <span className="text-[22px] leading-none">o</span>
          <span className="mt-1 font-serif text-[14px] font-semibold leading-none">
            Close
          </span>
        </button>
        <button
          type="button"
          className="absolute left-1/2 top-[calc(100%+18px)] z-20 -translate-x-1/2 rounded-full border border-[#d9c88a]/30 bg-black/70 px-4 py-2 font-serif text-[15px] font-semibold text-[#eee6cf] shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:bg-black/85"
          onClick={(event) => {
            event.stopPropagation();
            confirm();
          }}
          disabled={!activeSticker}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

export function useStickerWheel(
  onSelect: (selection: StickerWheelSelection) => void,
) {
  const [state, setState] = useState<StickerWheelState>({
    open: false,
    x: 0,
    y: 0,
  });
  const touchStartRef = useRef<Point | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const rightPressStartRef = useRef<Point | null>(null);
  const rightPressTimerRef = useRef<number | null>(null);

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const clearRightPress = () => {
    if (rightPressTimerRef.current !== null) {
      window.clearTimeout(rightPressTimerRef.current);
      rightPressTimerRef.current = null;
    }
  };
  const openAt = (point: Point) =>
    setState({
      open: true,
      x: Math.min(
        window.innerWidth - OUTER_RADIUS - 8,
        Math.max(OUTER_RADIUS + 8, point.x),
      ),
      y: Math.min(
        window.innerHeight - OUTER_RADIUS - 52,
        Math.max(OUTER_RADIUS + 8, point.y),
      ),
    });

  useEffect(
    () => () => {
      clearLongPress();
      clearRightPress();
    },
    [],
  );

  return {
    state,
    openAt,
    close: () => setState((current) => ({ ...current, open: false })),
    onSelect,
    handleContextMenu: (event: ReactMouseEvent) => {
      if (isStickerWheelBlockedTarget(event.target)) return;
      event.preventDefault();
    },
    handlePointerDown: (event: ReactPointerEvent) => {
      if (isStickerWheelBlockedTarget(event.target)) {
        return;
      }

      if (event.pointerType === "touch") {
        touchStartRef.current = { x: event.clientX, y: event.clientY };
        clearLongPress();
        longPressTimerRef.current = window.setTimeout(() => {
          openAt({ x: event.clientX, y: event.clientY });
        }, LONG_PRESS_MS);
        return;
      }

      if (event.button === 2) {
        event.preventDefault();
        rightPressStartRef.current = { x: event.clientX, y: event.clientY };
        clearRightPress();
        rightPressTimerRef.current = window.setTimeout(() => {
          openAt({ x: event.clientX, y: event.clientY });
        }, RIGHT_PRESS_MS);
      }
    },
    handlePointerMove: (event: ReactPointerEvent) => {
      if (
        touchStartRef.current &&
        longPressTimerRef.current !== null &&
        isLongPressMovementCancelled(touchStartRef.current, {
          x: event.clientX,
          y: event.clientY,
        })
      ) {
        clearLongPress();
      }

      if (
        rightPressStartRef.current &&
        rightPressTimerRef.current !== null &&
        isLongPressMovementCancelled(rightPressStartRef.current, {
          x: event.clientX,
          y: event.clientY,
        })
      ) {
        clearRightPress();
      }
    },
    handlePointerUp: () => {
      touchStartRef.current = null;
      rightPressStartRef.current = null;
      clearLongPress();
      clearRightPress();
    },
    handlePointerCancel: () => {
      touchStartRef.current = null;
      rightPressStartRef.current = null;
      clearLongPress();
      clearRightPress();
    },
  } as const;
}
