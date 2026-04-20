import { describe, expect, it } from "vitest";
import {
  buildRoundCommentaryEventKey,
  buildRoundStageKey,
  chooseCommentarySpeaker,
  parseRoundCommentary,
  shouldShowOfflineCommentaryLoader,
} from "./offline-commentary";

describe("offline commentary utilities", () => {
  it("builds a stable stage key", () => {
    expect(buildRoundStageKey("game123", "flop")).toBe("game123:flop");
  });

  it("builds a richer commentary event key for bot turns and revealed words", () => {
    expect(
      buildRoundCommentaryEventKey({
        stageKey: "game123:showdown",
        currentTurnPlayerId: "bot-2",
        botPlayerIds: ["bot-1", "bot-2"],
        wordHint: "quill",
      }),
    ).toBe("game123:showdown:turn:bot-2:word:QUILL");
  });

  it("prefers the active turn bot when choosing a speaker", () => {
    const speaker = chooseCommentarySpeaker({
      currentTurnPlayerId: "bot-2",
      botPlayers: [
        {
          playerId: "bot-1",
          authUserId: "dev-bot:nora:room:1",
          seatIndex: 1,
          name: "Nora Vale",
          chips: 950,
          isBot: true,
          personality: "The Anchor",
        },
        {
          playerId: "bot-2",
          authUserId: "dev-bot:jax:room:2",
          seatIndex: 2,
          name: "Jax Rook",
          chips: 1040,
          isBot: true,
          personality: "The Blade",
        },
      ],
    });

    expect(speaker?.playerId).toBe("bot-2");
  });

  it("falls back to the lowest-seat bot when the turn is not on a bot", () => {
    const speaker = chooseCommentarySpeaker({
      currentTurnPlayerId: "human-1",
      botPlayers: [
        {
          playerId: "bot-2",
          authUserId: "dev-bot:jax:room:2",
          seatIndex: 2,
          name: "Jax Rook",
          chips: 1040,
          isBot: true,
          personality: "The Blade",
        },
        {
          playerId: "bot-0",
          authUserId: "dev-bot:ellis:room:0",
          seatIndex: 0,
          name: "Ellis March",
          chips: 970,
          isBot: true,
          personality: "The Ledger",
        },
      ],
    });

    expect(speaker?.playerId).toBe("bot-0");
  });

  it("parses SKIP as a skip result", () => {
    expect(parseRoundCommentary("SKIP")).toEqual({ type: "skip" });
  });

  it("normalizes a generated line into a single short sentence", () => {
    expect(parseRoundCommentary('  "You are pressing too hard for this flop."  ')).toEqual({
      type: "message",
      message: "You are pressing too hard for this flop.",
    });
  });

  it("hides the warmup loader once the model has already loaded before", () => {
    expect(
      shouldShowOfflineCommentaryLoader({
        status: "loading",
        error: null,
        progress: 18,
        progressLabel: "Loading from cache...",
        currentFile: "model.onnx",
        hasLoadedBefore: true,
      }),
    ).toBe(false);
  });

  it("shows the warmup loader on the first model load", () => {
    expect(
      shouldShowOfflineCommentaryLoader({
        status: "loading",
        error: null,
        progress: 18,
        progressLabel: "Loading from cache...",
        currentFile: "model.onnx",
        hasLoadedBefore: false,
      }),
    ).toBe(true);
  });
});
