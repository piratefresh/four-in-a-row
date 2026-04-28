import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HomeModeMenu } from "./HomeModeMenu";

describe("HomeModeMenu", () => {
  it("shows the offline setup copy", () => {
    const markup = renderToStaticMarkup(
      <HomeModeMenu
        activeRoomCode={null}
        isStartingOffline={true}
        isStartingTutorial={false}
        offlineDifficulty="medium"
        statusMessage={null}
        onOfflineDifficultyChange={vi.fn()}
        onSelectOnline={vi.fn()}
        onStartOffline={vi.fn()}
        onPlayTutorial={vi.fn()}
      />,
    );

    expect(markup).toContain("Setting up table...");
    expect(markup).toContain("Offline Mode");
    expect(markup).toContain("Play vs. bots, no signup");
    expect(markup).toContain("aria-haspopup=\"menu\"");
  });
});
