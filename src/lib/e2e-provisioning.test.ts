import { afterEach, describe, expect, it, vi } from "vitest";
import {
  verifyConvexE2EMode,
  verifyFrontendReachable,
} from "../../e2e/provisioning";

describe("Maestro provisioning preflight", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports a missing frontend before account provisioning", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("refused")));

    await expect(verifyFrontendReachable()).resolves.toEqual({
      ok: false,
      error:
        "Frontend is not reachable at http://localhost:3000. Start it with: bun run dev:maestro",
    });
  });

  it("reports Convex running without its E2E gate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "error",
            errorMessage:
              "Uncaught ConvexError: e2eResetTestState is only available in E2E testing mode.",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(verifyConvexE2EMode()).resolves.toEqual({
      ok: false,
      error:
        "Convex is running without E2E_TESTING=true. Restart it with: bun run convex:dev:e2e",
    });
  });
});
