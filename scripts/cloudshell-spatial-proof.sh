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

MIN_FREE_MB="${URAI_SPATIAL_MIN_FREE_MB:-4096}"
PROOF_BASE="${URAI_SPATIAL_PROOF_BASE:-urai-proof}"

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
  df -h . "$HOME" /mnt /tmp /var/tmp 2>/dev/null || df -h . "$HOME" || true
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

maybe_delete_clean_urai_repo() {
  if [ "${URAI_SPATIAL_DELETE_CLEAN_URAI_REPO:-0}" != "1" ]; then
    return 0
  fi

  local old_repo="$HOME/UrAi"
  if [ ! -d "$old_repo/.git" ]; then
    return 0
  fi

  if [ -n "$(git -C "$old_repo" status --porcelain 2>/dev/null || true)" ]; then
    echo "== not deleting $old_repo because it has uncommitted changes =="
    return 0
  fi

  echo "== deleting clean rebuildable repo clone $old_repo to free proof space =="
  rm -rf "$old_repo"
}

cleanup_deep_if_needed() {
  local free_mb
  free_mb="$(free_home_mb)"
  if [ "${free_mb:-0}" -lt "$MIN_FREE_MB" ]; then
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

  free_mb="$(free_home_mb)"
  if [ "${free_mb:-0}" -lt "$MIN_FREE_MB" ]; then
    echo "== still tight: deleting rebuildable npm/pnpm caches from /home =="
    rm -rf "$HOME/.pnpm-store" "$HOME/.npm" 2>/dev/null || true
  fi

  maybe_delete_clean_urai_repo
}

candidate_workdirs() {
  if [ -n "${URAI_SPATIAL_PROOF_WORKDIR:-}" ]; then
    printf '%s\n' "$URAI_SPATIAL_PROOF_WORKDIR"
  fi

  printf '%s\n' \
    "/mnt/$PROOF_BASE/urai-spatial" \
    "/mnt/data/$PROOF_BASE/urai-spatial" \
    "/mnt/tmp/$PROOF_BASE/urai-spatial" \
    "/mnt/workspace/$PROOF_BASE/urai-spatial" \
    "/mnt/disks/$PROOF_BASE/urai-spatial" \
    "/tmp/$PROOF_BASE/urai-spatial" \
    "/var/tmp/$PROOF_BASE/urai-spatial"
}

choose_relocation_workdir() {
  local candidate parent mount_free test_dir

  while IFS= read -r candidate; do
    [ -n "$candidate" ] || continue
    parent="$(dirname "$candidate")"
    test_dir="$parent/.write-test-$$"

    mkdir -p "$parent" 2>/dev/null || continue
    mkdir "$test_dir" 2>/dev/null || continue
    rmdir "$test_dir" 2>/dev/null || true

    mount_free="$(free_mb_for "$parent" 2>/dev/null || echo 0)"
    if [ "${mount_free:-0}" -ge "$MIN_FREE_MB" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done < <(candidate_workdirs)

  return 1
}

maybe_relocate_to_scratch() {
  if [ "${URAI_SPATIAL_PROOF_RELOCATED:-0}" = "1" ] || [ "${URAI_SPATIAL_FORCE_HOME_PROOF:-0}" = "1" ]; then
    return 0
  fi

  local root_free dest parent dest_free
  root_free="$(free_mb_for "$ROOT")"

  if [ "${root_free:-0}" -ge "$MIN_FREE_MB" ]; then
    return 0
  fi

  if ! dest="$(choose_relocation_workdir)"; then
    return 0
  fi

  parent="$(dirname "$dest")"
  dest_free="$(free_mb_for "$parent" 2>/dev/null || echo 0)"

  echo "== /home is too small for build proof (${root_free} MB free); relocating proof to $dest (${dest_free} MB free) =="
  rm -rf "$dest"
  mkdir -p "$dest"

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
    URAI_SPATIAL_MIN_FREE_MB="$MIN_FREE_MB" \
    COREPACK_HOME="$parent/.corepack" \
    XDG_CACHE_HOME="$parent/.cache" \
    NPM_CONFIG_CACHE="$parent/.npm-cache" \
    npm_config_store_dir="$parent/.pnpm-store" \
    PNPM_HOME="$parent/.pnpm-home" \
    bash "$dest/scripts/cloudshell-spatial-proof.sh"
}

require_space() {
  local free_mb
  free_mb="$(free_mb_for "$ROOT")"
  if [ "${free_mb:-0}" -lt "$MIN_FREE_MB" ]; then
    echo "ERROR: still only ${free_mb} MB free at repo mount after cleanup."
    echo "Largest /home directories:"
    print_home_top
    echo "No writable scratch mount with ${MIN_FREE_MB} MB was found."
    echo "Fallback: rerun with URAI_SPATIAL_DELETE_CLEAN_URAI_REPO=1 to delete the clean ~/UrAi clone if it has no uncommitted changes."
    exit 1
  fi
}

echo "== URAI Spatial Cloud Shell proof =="
echo "repo: $ROOT"
echo "live url: $LIVE_URL"
echo "minimum free space: ${MIN_FREE_MB} MB"

echo "== disk before cleanup =="
print_mounts
print_home_top

echo "== cleanup low-disk build/cache artifacts =="
cleanup_common
cleanup_deep_if_needed
maybe_relocate_to_scratch

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
