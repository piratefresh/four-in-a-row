import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HomeModeMenu } from "./HomeModeMenu";

describe("HomeModeMenu", () => {
  it("shows the offline setup copy", () => {
    const markup = renderToStaticMarkup(
      <HomeModeMenu
        activeRoomCode={null}
        isStartingOffline={true}
        statusMessage={null}
        onSelectOnline={vi.fn()}
        onStartOffline={vi.fn()}
      />,
    );

    expect(markup).toContain("Setting up table...");
    expect(markup).toContain("Quick start vs bots");
  });
});
