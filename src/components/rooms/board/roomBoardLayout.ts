export const ROOM_OPPONENT_POSITION_CLASS: Record<
  "top" | "left" | "right",
  string
> = {
  top: "left-1/2 top-[11%] -translate-x-1/2 -translate-y-1/2 xs:top-[12%] sm:top-[10%]",
  left:
    "left-[12%] top-1/2 -translate-x-1/2 -translate-y-1/2 xs:left-[15%] sm:left-[12%]",
  right:
    "left-[88%] top-1/2 -translate-x-1/2 -translate-y-1/2 xs:left-[85%] sm:left-[88%]",
};

export const ROOM_BOTTOM_BADGE_POSITION_CLASS =
  "absolute bottom-[12%] left-1/2 z-40 -translate-x-1/2 translate-y-1/4 xs:bottom-[15%] sm:bottom-[12%]";
