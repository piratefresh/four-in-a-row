#!/usr/bin/env bash
set -euo pipefail

# Deploy Convex functions to a named preview deployment ("e2e").
# This creates/reuses an isolated cloud deployment for E2E testing.
#
# Prerequisites:
#   CONVEX_DEPLOY_KEY must be set (already in .env.local as a preview key)
#
# Usage:
#   bun run deploy:preview          # deploy + run
#   bun run deploy:preview --dry-run  # dry run only

PREVIEW_NAME="e2e"

echo "Deploying Convex to preview deployment '${PREVIEW_NAME}'..."
CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY" bunx convex deploy --preview-name "$PREVIEW_NAME" "$@"

echo ""
echo "Preview deployment '${PREVIEW_NAME}' is ready."
echo "Set CONVEX_URL / VITE_CONVEX_URL to the URL printed above before running E2E tests."