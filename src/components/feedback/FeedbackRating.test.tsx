import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FeedbackRating } from "./FeedbackRating";

describe("FeedbackRating", () => {
  it("renders the five accessible rating choices", () => {
    const markup = renderToStaticMarkup(
      <FeedbackRating value={3} onChange={vi.fn()} />,
    );

    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain('role="radio"');
    expect(markup).toContain('aria-checked="true"');
    expect(markup).toContain(">1</button>");
    expect(markup).toContain(">5</button>");
  });
});
