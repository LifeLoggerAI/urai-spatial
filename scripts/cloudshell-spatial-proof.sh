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

free_home_mb() {
  df -Pm "$HOME" | awk 'NR==2 { print $4 }'
}

print_home_top() {
  du -h -d 1 "$HOME" 2>/dev/null | sort -h | tail -25 || true
}

cleanup_common() {
  rm -rf \
    .next out \
    urai-tier1/.next urai-tier1/out \
    apps/functions/lib apps/functions/.next \
    node_modules/.cache urai-tier1/node_modules/.cache \
    "$HOME/.npm/_cacache" \
    "$HOME/.cache/node/corepack" \
    "$HOME/.cache/ms-playwright" \
    "$HOME/.firebase/emulators" \
    "$HOME/.cache/firebase" \
    /tmp/next-* /tmp/playwright-* /tmp/npm-* 2>/dev/null || true

  pnpm store prune || true
  npm cache clean --force || true
}

cleanup_deep_if_needed() {
  local free_mb
  free_mb="$(free_home_mb)"
  if [ "${free_mb:-0}" -lt 4096 ]; then
    echo "== deep cleanup: /home has ${free_mb} MB free; removing rebuildable emulator/runtime caches =="
    rm -rf \
      "$HOME/.emu" \
      "$HOME/.cache/node" \
      "$HOME/.cache/ms-playwright" \
      "$HOME/.npm/_cacache" \
      "$HOME/.pnpm-store/v3/tmp" \
      "$HOME/.pnpm-store/v10/tmp" \
      /tmp/next-* /tmp/playwright-* /tmp/npm-* 2>/dev/null || true
  fi
}

require_space() {
  local free_mb
  free_mb="$(free_home_mb)"
  if [ "${free_mb:-0}" -lt 4096 ]; then
    echo "ERROR: still only ${free_mb} MB free in /home after cleanup."
    echo "Largest /home directories:"
    print_home_top
    echo "Free at least 4 GB, then rerun this script."
    exit 1
  fi
}

echo "== URAI Spatial Cloud Shell proof =="
echo "repo: $ROOT"
echo "live url: $LIVE_URL"

echo "== disk before cleanup =="
df -h . "$HOME" || true
print_home_top

echo "== cleanup low-disk build/cache artifacts =="
cleanup_common
cleanup_deep_if_needed

echo "== disk after cleanup =="
df -h . "$HOME" || true
print_home_top
require_space

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
