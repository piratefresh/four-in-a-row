import { describe, expect, it } from "vitest";
import { redactReasoningNumbersForChat } from "./reasoningRedaction";

describe("gamesBetting chat reasoning redaction", () => {
  it("hides numeric reasoning details before they can appear in chat", () => {
    const result = redactReasoningNumbersForChat(
      "RR=1.35 (score 42 / cost 30) | raise to 60 -> raise",
    );

    expect(result).toBe(
      "RR=[hidden number] (score [hidden number] / cost [hidden number]) | raise to [hidden number] -> raise",
    );
    expect(result).not.toMatch(/\d/);
  });

  it("hides signed, percentage, and range-like numeric tokens", () => {
    const result = redactReasoningNumbersForChat(
      "+10 bonus, 2-7 letters, 30.0% raise, top-3 candidate",
    );

    expect(result).not.toMatch(/\d/);
    expect(result).toBe(
      "[hidden number] bonus, [hidden number] letters, [hidden number] raise, top[hidden number] candidate",
    );
  });
});
