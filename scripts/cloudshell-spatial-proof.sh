#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LIVE_URL="${LIVE_URL:-${HOST:-https://urai.app}}"
export HOST="$LIVE_URL"
export LIVE_URL="$LIVE_URL"
export URAI_DEPLOY_URL="${URAI_DEPLOY_URL:-$LIVE_URL}"
export NEXT_TELEMETRY_DISABLED=1
export CI=1

echo "== URAI Spatial Cloud Shell proof =="
echo "repo: $ROOT"
echo "live url: $LIVE_URL"

echo "== disk before cleanup =="
df -h . "$HOME" || true

echo "== cleanup low-disk build/cache artifacts =="
rm -rf \
  .next out \
  urai-tier1/.next urai-tier1/out \
  apps/functions/lib apps/functions/.next \
  node_modules/.cache urai-tier1/node_modules/.cache \
  "$HOME/.npm/_cacache" \
  "$HOME/.cache/node/corepack" \
  "$HOME/.cache/ms-playwright" \
  /tmp/next-* /tmp/playwright-* 2>/dev/null || true

pnpm store prune || true

echo "== disk after cleanup =="
df -h . "$HOME" || true

echo "== install check =="
pnpm install --frozen-lockfile --prefer-offline

echo "== static lock =="
pnpm lock:static

echo "== static build =="
pnpm build:static

echo "== live smoke =="
pnpm smoke:live

echo "== live record =="
pnpm live:record

echo "URAI Spatial Cloud Shell proof complete."
