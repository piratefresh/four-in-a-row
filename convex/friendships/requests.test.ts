import { describe, expect, it } from "vitest";
import { isSelfRequest } from "./requests";

describe("friendRequests helpers", () => {
  describe("isSelfRequest", () => {
    it("returns true when user targets themselves", () => {
      expect(isSelfRequest("user-1", "user-1")).toBe(true);
    });

    it("returns false for different users", () => {
      expect(isSelfRequest("user-1", "user-2")).toBe(false);
    });
  });

  it("self-request is always detected", () => {
    expect(isSelfRequest("alice", "alice")).toBe(true);
    expect(isSelfRequest("alice", "bob")).toBe(false);
    expect(isSelfRequest("bob", "bob")).toBe(true);
  });
});
