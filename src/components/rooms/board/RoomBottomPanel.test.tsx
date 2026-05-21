import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  RoomBottomPanel,
  shouldShowSubmitWordAction,
} from "./RoomBottomPanel";

describe("RoomBottomPanel", () => {
  it("keeps the submit action visible during showdown before a word is built", () => {
    const markup = renderToStaticMarkup(
      <RoomBottomPanel
        isPhase1={false}
        mySubmission={null}
        canRevealSubmittedWords={false}
        showReveal={false}
        builderTiles={[]}
        choiceSelections={{}}
        handleChoiceSelect={vi.fn()}
        isValidating={false}
        hasUnresolvedChoices={false}
        validationError={null}
        wordPreview=""
        wordScorePreview={null}
        shuffleTick={0}
        gameStage="showdown"
        isShowdownSubmissionOpen={true}
        handleSubmitWord={vi.fn()}
        renderBuilderTile={() => null}
      />,
    );

    expect(markup).toContain('id="tutorial-submit-word"');
    expect(markup).toContain("Select Tiles");
    expect(markup).toContain("disabled");
  });

  it("only shows the submit action for showdown", () => {
    expect(shouldShowSubmitWordAction("final")).toBe(false);
    expect(shouldShowSubmitWordAction("showdown")).toBe(true);
  });

  it("puts hand tile entrance animation on a child wrapper", () => {
    const markup = renderToStaticMarkup(
      <RoomBottomPanel
        isPhase1={false}
        mySubmission={null}
        canRevealSubmittedWords={false}
        showReveal={false}
        builderTiles={[
          {
            id: "hand-a",
            letter: "A",
            baseValue: 1,
            source: "hand",
            cardIndex: 0,
          },
        ]}
        choiceSelections={{}}
        handleChoiceSelect={vi.fn()}
        isValidating={false}
        hasUnresolvedChoices={false}
        validationError={null}
        wordPreview="A"
        wordScorePreview={{
          basePoints: 1,
          multiplierBonus: 0,
          fullRackBonus: 0,
          total: 1,
        }}
        shuffleTick={0}
        gameStage="showdown"
        isShowdownSubmissionOpen={true}
        handleSubmitWord={vi.fn()}
        renderBuilderTile={(tile) => <div data-tile-id={tile.id} />}
      />,
    );

    expect(markup).toContain("gf-tile animate-hole-slide-in");
    expect(markup).toContain("animation-delay:0s");
  });
});
