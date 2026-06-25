// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { TRANSACTION_SOURCE_ICONS, sourceIcon, DEFAULT_TRANSACTION_ICON } from "./transactionIcons";
import { TRANSACTION_SOURCE_LABELS, formatTransactionSource } from "./transactionLabels";
import type { TransactionSource } from "../../../convex/schema";

describe("transactionIcons", () => {
  it("maps every TransactionSource to an icon", () => {
    const sources: TransactionSource[] = [
      "starter_grant",
      "playtest_deposit",
      "buy_in",
      "payout",
      "reward",
      "achievement",
      "login_streak",
      "tutorial",
    ];
    for (const source of sources) {
      expect(TRANSACTION_SOURCE_ICONS[source]).toBeDefined();
      expect(TRANSACTION_SOURCE_ICONS[source]).not.toBe("");
    }
  });

  it("sourceIcon returns the correct icon for each known source", () => {
    expect(sourceIcon("starter_grant")).toBe("\u{1F381}");
    expect(sourceIcon("playtest_deposit")).toBe("\u{1F4B5}");
    expect(sourceIcon("buy_in")).toBe("\u{1F3B2}");
    expect(sourceIcon("payout")).toBe("\u{1F3C6}");
    expect(sourceIcon("reward")).toBe("\u{2B50}");
    expect(sourceIcon("achievement")).toBe("\u{1F3C5}");
    expect(sourceIcon("tutorial")).toBe("\u{1F381}");
    expect(sourceIcon("login_streak")).toBe("\u{1F381}");
  });

  it("sourceIcon returns default icon for unknown source", () => {
    expect(sourceIcon("unknown" as TransactionSource)).toBe(DEFAULT_TRANSACTION_ICON);
  });

  it("no emoji switch — all lookups are from the static map", () => {
    // Verify the static map is the single source of truth.
    for (const [key, value] of Object.entries(TRANSACTION_SOURCE_ICONS)) {
      expect(sourceIcon(key as TransactionSource)).toBe(value);
    }
  });
});

describe("transactionLabels", () => {
  it("maps every TransactionSource to a label", () => {
    const sources: TransactionSource[] = [
      "starter_grant",
      "playtest_deposit",
      "buy_in",
      "payout",
      "reward",
      "achievement",
      "login_streak",
      "tutorial",
    ];
    for (const source of sources) {
      expect(TRANSACTION_SOURCE_LABELS[source]).toBeDefined();
      expect(TRANSACTION_SOURCE_LABELS[source]).not.toBe("");
    }
  });

  it("formatTransactionSource returns the label", () => {
    expect(formatTransactionSource("starter_grant")).toBe("Starter grant");
    expect(formatTransactionSource("buy_in")).toBe("Game buy-in");
    expect(formatTransactionSource("payout")).toBe("Game payout");
  });

  it("formatTransactionSource falls back to the source key for unknown values", () => {
    expect(formatTransactionSource("unknown" as TransactionSource)).toBe("unknown");
  });
});

describe("deposit validation limits", () => {
  it("MAX_PLAYTEST_DEPOSIT is 100_000", async () => {
    const { MAX_PLAYTEST_DEPOSIT } = await import("./PlaytestDepositForm");
    expect(MAX_PLAYTEST_DEPOSIT).toBe(100_000);
  });

  it("MIN_PLAYTEST_DEPOSIT is 1", async () => {
    const { MIN_PLAYTEST_DEPOSIT } = await import("./PlaytestDepositForm");
    expect(MIN_PLAYTEST_DEPOSIT).toBe(1);
  });
});
