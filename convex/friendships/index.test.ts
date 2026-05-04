import { describe, expect, it } from "vitest";
import {
  isUserOnline,
  orderedPair,
  ONLINE_THRESHOLD_MS,
} from "./index";

describe("friendships helpers", () => {
  describe("isUserOnline", () => {
    it("returns false when lastSeenAt is null", () => {
      expect(isUserOnline(null)).toBe(false);
    });

    it("returns true when lastSeenAt is within threshold", () => {
      const now = Date.now();
      const recent = now - ONLINE_THRESHOLD_MS + 1000;
      expect(isUserOnline(recent, now)).toBe(true);
    });

    it("returns false when lastSeenAt is exactly at threshold", () => {
      const now = Date.now();
      const atThreshold = now - ONLINE_THRESHOLD_MS;
      expect(isUserOnline(atThreshold, now)).toBe(false);
    });

    it("returns false when lastSeenAt exceeds threshold", () => {
      const now = Date.now();
      const old = now - ONLINE_THRESHOLD_MS - 1000;
      expect(isUserOnline(old, now)).toBe(false);
    });
  });

  describe("orderedPair", () => {
    it("returns lower string first", () => {
      expect(orderedPair("user-b", "user-a")).toEqual(["user-a", "user-b"]);
    });

    it("returns same order when first is already lower", () => {
      expect(orderedPair("user-a", "user-b")).toEqual(["user-a", "user-b"]);
    });

    it("handles equal strings", () => {
      expect(orderedPair("same", "same")).toEqual(["same", "same"]);
    });

    it("handles numeric string ordering", () => {
      expect(orderedPair("10", "2")).toEqual(["10", "2"]);
    });
  });

  it("online threshold is 2 minutes", () => {
    expect(ONLINE_THRESHOLD_MS).toBe(2 * 60 * 1000);
  });

  it("ordered pairs prevent duplicate friendship rows", () => {
    const pair1 = orderedPair("alice", "bob");
    const pair2 = orderedPair("bob", "alice");
    expect(pair1).toEqual(pair2);
    expect(pair1).toEqual(["alice", "bob"]);
  });
});
