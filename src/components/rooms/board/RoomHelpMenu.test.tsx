import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoomHelpMenu, RoomHelpMenuContent } from "./RoomHelpMenu";

describe("RoomHelpMenu", () => {
  it("renders the accessible help trigger", () => {
    const markup = renderToStaticMarkup(<RoomHelpMenu />);

    expect(markup).toContain("Open game help");
    expect(markup).toContain('aria-haspopup="menu"');
  });

  it("renders the Word Poker tips and media placeholders", () => {
    const markup = renderToStaticMarkup(<RoomHelpMenuContent />);

    expect(markup).toContain("How do I move letters?");
    expect(markup).toContain("Tap any letter to activate it");
    expect(markup).toContain("How do I use the double letter tile?");
    expect(markup).toContain("Can I shuffle my letters?");
    expect(markup).toContain("Use Shuffle to quickly rearrange");
    expect(markup).toContain("How does betting work?");
    expect(markup).toContain("Check");
    expect(markup).toContain("Call");
    expect(markup).toContain("highest scoring word wins the pot");
    expect(markup).toContain('src="/drag-and-reorder.gif"');
    expect(markup).toContain('src="/multiletter.gif"');
  });
});
