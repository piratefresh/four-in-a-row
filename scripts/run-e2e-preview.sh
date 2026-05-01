#!/usr/bin/env bash
set -euo pipefail

# Kill any existing Vite dev server on port 3000, then run E2E tests
# against the preview Convex deployment (CONVEX_TEST_URL from .env.local).
#
# Usage:
#   bun run test:e2e:preview

E2E_PORT="${E2E_PORT:-4000}"
export E2E_PORT
export BASE_URL="http://localhost:${E2E_PORT}"

# Kill any existing Vite dev server (on port 3000) and related processes
# so we can start a clean one for E2E tests against the preview deployment.
for p in 3000 42069; do
  pid=$(netstat -ano 2>/dev/null | grep -E "0.0.0.0:${p}\s|127.0.0.1:${p}\s|:::${p}\s" | grep LISTEN | awk '{print $NF}' | head -1 || true)
  if [ -n "$pid" ] && [ "$pid" != "0" ]; then
    echo "Killing process on port $p (PID: $pid)..."
    taskkill //F //PID "$pid" 2>/dev/null || true
  fi
done
sleep 2

echo "Starting E2E tests against preview deployment on port ${E2E_PORT}..."
E2E_TESTING=true npx playwright test "$@"
