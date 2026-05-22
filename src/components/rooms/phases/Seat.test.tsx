import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Seat } from "./Seat";

describe("Seat", () => {
  it("uses the active glow pulse utility for the active turn avatar", () => {
    const markup = renderToStaticMarkup(
      <Seat
        name="Magnus"
        avatarUrl={null}
        chips={860}
        isActiveTurn
        isCurrentPlayer
        avatarSizeClass="h-14 w-14"
        initialsClass="text-[12px]"
      />,
    );

    expect(markup).toContain("animate-seat-breathe");
    expect(markup).not.toContain("motion-safe:animate-[seat-breathe");
  });
});
