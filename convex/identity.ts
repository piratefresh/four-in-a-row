// ============================================================================
// Identity resolution — single source of truth for auth
// ----------------------------------------------------------------------------
// All identity checks flow through `resolveIdentity()` which calls Better Auth
// once. Convenience functions (`requireVerifiedUser`, `getVerifiedUserId`,
// `getAuthenticatedUserId`) pattern-match on the result so callers get the
// exact same API they had before, but there is only one auth implementation.
//
// Previously this logic was duplicated across:
//   - verifyUser.ts      (Pattern 1 — checks emailVerified)
//   - rooms/helpers.ts   (Pattern 2 — no email check)
//   - messages.ts        (Pattern 3 — copy of Pattern 2)
// ============================================================================

import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

// ---------------------------------------------------------------------------
// E2E
// ---------------------------------------------------------------------------

const IS_E2E = process.env.E2E_TESTING === "true";
export const E2E_USER_ID = "e2e-test-user";

// ---------------------------------------------------------------------------
// Core discriminated union
// ---------------------------------------------------------------------------

type SessionIdentity =
  | { kind: "verified"; userId: string }
  | { kind: "authenticated"; userId: string; emailVerified: false }
  | { kind: "unauthenticated" };

// ---------------------------------------------------------------------------
// Core resolution (private — callers use the exported convenience functions)
// ---------------------------------------------------------------------------

async function resolveIdentity(
  ctx: MutationCtx | QueryCtx,
): Promise<SessionIdentity> {
  if (IS_E2E) {
    return { kind: "verified", userId: E2E_USER_ID };
  }

  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });
  const userId = session?.user?.id ?? session?.session?.userId;

  if (!userId) {
    return { kind: "unauthenticated" };
  }

  if (session?.user?.emailVerified) {
    return { kind: "verified", userId };
  }

  return { kind: "authenticated", userId, emailVerified: false };
}

// ---------------------------------------------------------------------------
// Convenience wrappers — same signatures as the original implementations
// ---------------------------------------------------------------------------

/**
 * Returns the authenticated user's ID, throwing if not email-verified.
 * For operations that require a verified identity (wallet, friendships, etc.).
 */
export async function requireVerifiedUser(
  ctx: MutationCtx | QueryCtx,
): Promise<{ authUserId: string; emailVerified: boolean }> {
  const identity = await resolveIdentity(ctx);

  if (identity.kind === "unauthenticated") {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }

  if (identity.kind === "authenticated") {
    throw new ConvexError({
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email to perform this action.",
    });
  }

  return { authUserId: identity.userId, emailVerified: true };
}

/**
 * Returns the authenticated user's ID only if their email is verified.
 * Returns undefined for unauthenticated or unverified users.
 */
export async function getVerifiedUserId(
  ctx: MutationCtx | QueryCtx,
): Promise<string | undefined> {
  const identity = await resolveIdentity(ctx);
  return identity.kind === "verified" ? identity.userId : undefined;
}

/**
 * Returns the authenticated user's ID regardless of email verification status.
 * Returns undefined only when no session exists. Used by room/lobby operations
 * where email verification is not required.
 */
export async function getAuthenticatedUserId(
  ctx: MutationCtx | QueryCtx,
): Promise<string | undefined> {
  const identity = await resolveIdentity(ctx);
  return identity.kind !== "unauthenticated" ? identity.userId : undefined;
}
