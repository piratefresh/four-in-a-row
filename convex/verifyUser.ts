import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

const IS_E2E = process.env.E2E_TESTING === "true";

const E2E_USER_ID = "e2e-test-user";

export async function requireVerifiedUser(
  ctx: MutationCtx | QueryCtx,
): Promise<{ authUserId: string; emailVerified: boolean }> {
  if (IS_E2E) {
    return { authUserId: E2E_USER_ID, emailVerified: true };
  }

  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });
  const user = session?.user;

  if (!user?.id) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }

  if (!user.emailVerified) {
    throw new ConvexError({
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email to perform this action.",
    });
  }

  return { authUserId: user.id, emailVerified: user.emailVerified };
}

export async function getVerifiedUserId(
  ctx: MutationCtx | QueryCtx,
): Promise<string | undefined> {
  if (IS_E2E) {
    return E2E_USER_ID;
  }

  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });
  const user = session?.user;

  if (!user?.id || !user.emailVerified) {
    return undefined;
  }

  return user.id;
}