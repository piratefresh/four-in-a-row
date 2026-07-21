/**
 * Enables and verifies E2E fixtures on the local Convex deployment.
 *
 * Convex function environment variables belong to the deployment; setting an
 * environment variable on the `convex dev` CLI process does not expose it to
 * functions. This helper is started by `convex dev --start` after the local
 * backend is ready, then stays alive alongside the watcher.
 */

const nodeExecutable = Bun.which("node");
if (!nodeExecutable) {
  throw new Error("Node.js is required to configure the local Convex deployment.");
}

const setEnv = Bun.spawn(
  [
    nodeExecutable,
    "node_modules/convex/bin/main.js",
    "env",
    "set",
    "E2E_TESTING",
    "true",
    "--deployment",
    "local",
  ],
  {
    stdin: "inherit",
    stdout: "pipe",
    stderr: "pipe",
  },
);

const [setEnvExitCode, setEnvStdout, setEnvStderr] = await Promise.all([
  setEnv.exited,
  new Response(setEnv.stdout).text(),
  new Response(setEnv.stderr).text(),
]);

const verificationResponse = await fetch(
  "http://127.0.0.1:3210/api/mutation",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "rooms:e2eResetTestState",
      args: {},
    }),
  },
);
const verificationBody = (await verificationResponse.json()) as {
  status?: string;
  errorMessage?: string;
};

if (
  !verificationResponse.ok ||
  verificationBody.status !== "success" ||
  verificationBody.errorMessage
) {
  throw new Error(
    `Convex E2E readiness check failed after env command exited ${setEnvExitCode}: ${JSON.stringify({ verificationBody, setEnvStdout, setEnvStderr })}`,
  );
}

console.log("[convex e2e] E2E_TESTING=true; guarded fixtures are ready.");

if (!process.argv.includes("--once")) {
  await new Promise<void>(() => {});
}
