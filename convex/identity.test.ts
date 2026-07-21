import { describe, expect, it } from "vitest";
import {
  E2E_USER_EMAIL,
  E2E_USER_ID,
  selectSessionIdentity,
} from "./identity";

describe("identity selection in E2E mode", () => {
  it("keeps a real authenticated user's own identity", () => {
    expect(
      selectSessionIdentity(
        {
          user: { id: "real-user-2", emailVerified: true },
          session: { userId: "real-user-2" },
        },
        true,
      ),
    ).toEqual({ kind: "verified", userId: "real-user-2" });
  });

  it("uses the synthetic identity for unauthenticated E2E fixtures", () => {
    expect(selectSessionIdentity(null, true)).toEqual({
      kind: "verified",
      userId: E2E_USER_ID,
    });
  });

  it("keeps the verified Maestro account on the synthetic fixture identity", () => {
    expect(
      selectSessionIdentity(
        {
          user: {
            id: "better-auth-e2e-id",
            email: E2E_USER_EMAIL,
            emailVerified: true,
          },
          session: { userId: "better-auth-e2e-id" },
        },
        true,
      ),
    ).toEqual({ kind: "verified", userId: E2E_USER_ID });
  });

  it("does not promote an unverified real user in E2E mode", () => {
    expect(
      selectSessionIdentity(
        {
          user: { id: "unverified-user", emailVerified: false },
          session: { userId: "unverified-user" },
        },
        true,
      ),
    ).toEqual({
      kind: "authenticated",
      userId: "unverified-user",
      emailVerified: false,
    });
  });
});
