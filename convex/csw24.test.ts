import { describe, expect, it } from "vitest";
import {
  buildWordSignature,
  getWordsForSignature,
  isValidCsw24Word,
  normalizeCsw24Word,
} from "./csw24";

describe("CSW24 dictionary index", () => {
  it("validates expected showdown words from the local dictionary", () => {
    expect(isValidCsw24Word("FACE")).toBe(true);
    expect(isValidCsw24Word("TOUCH")).toBe(true);
    expect(isValidCsw24Word("CURVETS")).toBe(true);
  });

  it("rejects invented or impossible words from recent bot logs", () => {
    expect(isValidCsw24Word("ADONTE")).toBe(false);
    expect(isValidCsw24Word("COURBULA")).toBe(false);
    expect(isValidCsw24Word("TRANSRR")).toBe(false);
  });

  it("normalizes words before lookup", () => {
    expect(normalizeCsw24Word(" touch ")).toBe("TOUCH");
    expect(isValidCsw24Word(" touch ")).toBe(true);
  });

  it("returns signature candidates for valid words", () => {
    const signature = buildWordSignature(["T", "O", "U", "C", "H"]);
    const words = getWordsForSignature(signature);

    expect(words).toContain("TOUCH");
  });
});
