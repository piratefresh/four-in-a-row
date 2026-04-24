import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

export async function requireVerifiedUser(
  ctx: MutationCtx | QueryCtx,
): Promise<{ authUserId: string; emailVerified: boolean }> {
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
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });
  const user = session?.user;

  if (!user?.id || !user.emailVerified) {
    return undefined;
  }

  return user.id;
}