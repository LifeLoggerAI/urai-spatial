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

free_mb_for() {
  df -Pm "$1" | awk 'NR==2 { print $4 }'
}

free_home_mb() {
  free_mb_for "$HOME"
}

print_home_top() {
  du -h -d 1 "$HOME" 2>/dev/null | sort -h | tail -25 || true
}

print_mounts() {
  df -h . "$HOME" /mnt 2>/dev/null || df -h . "$HOME" || true
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

maybe_relocate_to_mnt() {
  if [ "${URAI_SPATIAL_PROOF_RELOCATED:-0}" = "1" ] || [ "${URAI_SPATIAL_FORCE_HOME_PROOF:-0}" = "1" ]; then
    return 0
  fi

  local root_free mnt_free dest parent
  root_free="$(free_mb_for "$ROOT")"
  mnt_free="$(free_mb_for /mnt 2>/dev/null || echo 0)"

  if [ "${root_free:-0}" -ge 4096 ]; then
    return 0
  fi

  if [ "${mnt_free:-0}" -lt 4096 ]; then
    return 0
  fi

  dest="${URAI_SPATIAL_PROOF_WORKDIR:-/mnt/urai-proof/urai-spatial}"
  parent="$(dirname "$dest")"

  echo "== /home is too small for build proof (${root_free} MB free); relocating proof to $dest on /mnt (${mnt_free} MB free) =="
  rm -rf "$dest"
  mkdir -p "$parent" "$dest"

  if command -v git >/dev/null 2>&1 && git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "$ROOT" archive --format=tar HEAD | tar -C "$dest" -xf -
  else
    tar \
      --exclude='.git' \
      --exclude='node_modules' \
      --exclude='.next' \
      --exclude='out' \
      --exclude='urai-tier1/.next' \
      --exclude='urai-tier1/out' \
      -C "$ROOT" -cf - . | tar -C "$dest" -xf -
  fi

  echo "== continuing proof from $dest =="
  exec env \
    URAI_SPATIAL_PROOF_RELOCATED=1 \
    LIVE_URL="$LIVE_URL" \
    HOST="$HOST" \
    URAI_DEPLOY_URL="$URAI_DEPLOY_URL" \
    NEXT_TELEMETRY_DISABLED=1 \
    CI=1 \
    COREPACK_HOME="/mnt/urai-proof/.corepack" \
    XDG_CACHE_HOME="/mnt/urai-proof/.cache" \
    NPM_CONFIG_CACHE="/mnt/urai-proof/.npm-cache" \
    npm_config_store_dir="/mnt/urai-proof/.pnpm-store" \
    PNPM_HOME="/mnt/urai-proof/.pnpm-home" \
    bash "$dest/scripts/cloudshell-spatial-proof.sh"
}

require_space() {
  local free_mb
  free_mb="$(free_mb_for "$ROOT")"
  if [ "${free_mb:-0}" -lt 4096 ]; then
    echo "ERROR: still only ${free_mb} MB free at repo mount after cleanup."
    echo "Largest /home directories:"
    print_home_top
    echo "Either free at least 4 GB or run from /mnt with URAI_SPATIAL_PROOF_WORKDIR."
    exit 1
  fi
}

echo "== URAI Spatial Cloud Shell proof =="
echo "repo: $ROOT"
echo "live url: $LIVE_URL"

echo "== disk before cleanup =="
print_mounts
print_home_top

echo "== cleanup low-disk build/cache artifacts =="
cleanup_common
cleanup_deep_if_needed
maybe_relocate_to_mnt

echo "== disk after cleanup =="
print_mounts
print_home_top
require_space

export COREPACK_HOME="${COREPACK_HOME:-$ROOT/.corepack-cache}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$ROOT/.cache}"
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-$ROOT/.npm-cache}"
export npm_config_store_dir="${npm_config_store_dir:-$ROOT/.pnpm-store}"
export PNPM_HOME="${PNPM_HOME:-$ROOT/.pnpm-home}"
mkdir -p "$COREPACK_HOME" "$XDG_CACHE_HOME" "$NPM_CONFIG_CACHE" "$npm_config_store_dir" "$PNPM_HOME"

PNPM=(pnpm --store-dir "$npm_config_store_dir")

echo "== install check =="
"${PNPM[@]}" install --frozen-lockfile --prefer-offline

echo "== static lock =="
"${PNPM[@]}" lock:static

echo "== static build =="
"${PNPM[@]}" build:static

echo "== live smoke =="
"${PNPM[@]}" smoke:live

echo "== live record =="
"${PNPM[@]}" live:record

echo "URAI Spatial Cloud Shell proof complete."