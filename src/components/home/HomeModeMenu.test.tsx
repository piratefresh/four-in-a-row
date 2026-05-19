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
        statusMessage={null}
        onSelectOnline={vi.fn()}
        onSelectRiverRun={vi.fn()}
        onStartOffline={vi.fn()}
        onPlayTutorial={vi.fn()}
        onSelectLeaderboard={vi.fn()}
      />,
    );

    expect(markup).toContain("Offline Mode");
    expect(markup).toContain("Play vs. bots, no signup");
    expect(markup).toContain("Leaderboard");
    expect(markup).toContain("Top players");
    expect(markup).toContain("Power-ups");
    expect(markup).toContain("disabled");
  });

  it("does not offer to resume tutorial rooms", () => {
    const markup = renderToStaticMarkup(
      <HomeModeMenu
        activeRoomCode="ABCD"
        activeRoomTutorialId="first-bot-game"
        isStartingOffline={false}
        isStartingTutorial={false}
        statusMessage={null}
        onSelectOnline={vi.fn()}
        onSelectRiverRun={vi.fn()}
        onStartOffline={vi.fn()}
        onPlayTutorial={vi.fn()}
      />,
    );

    expect(markup).not.toContain("Resume");
    expect(markup).not.toContain("Replay tutorial");
    expect(markup).toContain("Tutorial");
  });
});
