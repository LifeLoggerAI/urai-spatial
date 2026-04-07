#!/usr/bin/env bash
set -euo pipefail

PASS_NAME="tier1_lock_pass"
TS="$(date +%Y%m%d_%H%M%S)"
SELF_NAME="${0##*/}"
AUDIT_DIR=""
TMP_DIR=""
EXIT_CODE=0

finish() {
  EXIT_CODE=$?
  if [ "$EXIT_CODE" -eq 0 ]; then
    printf '[%s] PASS: script completed successfully\n' "$SELF_NAME"
    [ -n "${AUDIT_DIR:-}" ] && printf '[%s] PASS: Audit dir: %s\n' "$SELF_NAME" "$AUDIT_DIR"
  else
    printf '[%s] FAIL: script exited with code %s\n' "$SELF_NAME" "$EXIT_CODE" >&2
    [ -n "${AUDIT_DIR:-}" ] && printf '[%s] FAIL: Audit dir: %s\n' "$SELF_NAME" "$AUDIT_DIR" >&2
  fi
}
trap finish EXIT

log()  { printf '[%s] %s\n' "$SELF_NAME" "$*"; }
fail() { printf '[%s] FAIL: %s\n' "$SELF_NAME" "$*" >&2; exit 1; }

pick_first_from_file() {
  local list_file="$1"
  [ -f "$list_file" ] || return 1
  head -n 1 "$list_file" | tr -d '\r'
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "required command missing: $1"
}

require_cmd find
require_cmd head
require_cmd tr
require_cmd sort
require_cmd mktemp
require_cmd tee
require_cmd date

if [ -d "$PWD/urai-tier1" ] && [ -f "$PWD/urai-tier1/package.json" ]; then
  REPO_ROOT="$PWD/urai-tier1"
elif [ -f "$PWD/package.json" ] && [ -d "$PWD/src" ]; then
  REPO_ROOT="$PWD"
else
  fail "could not determine target repo root; cd into urai-tier1 or its parent and rerun"
fi

cd "$REPO_ROOT"
AUDIT_DIR="_audit/${TS}_${PASS_NAME}"
mkdir -p "$AUDIT_DIR"
TMP_DIR="$(mktemp -d "$AUDIT_DIR/tmp.XXXXXX")"

log "repo root: $REPO_ROOT"

PKG_LIST="$TMP_DIR/pkg.list"
PAGE_LIST="$TMP_DIR/page.list"
SCENE_LIST="$TMP_DIR/scene.list"
STARFIELD_LIST="$TMP_DIR/starfield.list"
FOCUS_LIST="$TMP_DIR/focus.list"
HOME_LIST="$TMP_DIR/home.list"
CAMERA_LIST="$TMP_DIR/camera.list"
AUTHORITY_LIST="$TMP_DIR/authority.list"
ESC_LIST="$TMP_DIR/esc.list"
TRANSITION_LIST="$TMP_DIR/transition.list"

find src app -type f -name package.json 2>/dev/null | sort > "$PKG_LIST" || true
printf '%s\n' "$REPO_ROOT/package.json" > "$PKG_LIST"

find src app -type f \( -path '*/src/app/page.tsx' -o -path '*/app/page.tsx' \) 2>/dev/null | sort > "$PAGE_LIST" || true
find src -type f \( -name 'SpatialScene.tsx' -o -name 'SpatialScene.jsx' \) 2>/dev/null | sort > "$SCENE_LIST" || true
find src -type f \( -name 'LifeMapStarfield.tsx' -o -name 'Starfield.tsx' \) 2>/dev/null | sort > "$STARFIELD_LIST" || true
find src -type f -name 'FocusSubject.tsx' 2>/dev/null | sort > "$FOCUS_LIST" || true
find src -type f -name 'HomeEnvironment.tsx' 2>/dev/null | sort > "$HOME_LIST" || true
find src -type f \( -name 'CinematicCameraRig.tsx' -o -name 'CameraRig.tsx' \) 2>/dev/null | sort > "$CAMERA_LIST" || true
find src -type f -name 'useSceneAuthority.ts' 2>/dev/null | sort > "$AUTHORITY_LIST" || true
find src -type f \( -name 'useCanonEsc.ts' -o -name 'useBackchainLaw.ts' \) 2>/dev/null | sort > "$ESC_LIST" || true
find src -type f \( -name 'useTransitionSync.ts' -o -name 'transitionAuthority.ts' -o -name 'cameraAuthority.ts' \) 2>/dev/null | sort > "$TRANSITION_LIST" || true

PKG_JSON="$REPO_ROOT/package.json"
PAGE_TSX="$(pick_first_from_file "$PAGE_LIST" || true)"
SCENE_FILE="$(pick_first_from_file "$SCENE_LIST" || true)"
STARFIELD_FILE="$(pick_first_from_file "$STARFIELD_LIST" || true)"
FOCUS_FILE="$(pick_first_from_file "$FOCUS_LIST" || true)"
HOME_FILE="$(pick_first_from_file "$HOME_LIST" || true)"
CAMERA_FILE="$(pick_first_from_file "$CAMERA_LIST" || true)"
AUTHORITY_FILE="$(pick_first_from_file "$AUTHORITY_LIST" || true)"
ESC_FILE="$(pick_first_from_file "$ESC_LIST" || true)"
TRANSITION_FILE="$(pick_first_from_file "$TRANSITION_LIST" || true)"

{
  echo "PKG_JSON=${PKG_JSON:-}"
  echo "PAGE_TSX=${PAGE_TSX:-}"
  echo "SCENE_FILE=${SCENE_FILE:-}"
  echo "STARFIELD_FILE=${STARFIELD_FILE:-}"
  echo "FOCUS_FILE=${FOCUS_FILE:-}"
  echo "HOME_FILE=${HOME_FILE:-}"
  echo "CAMERA_FILE=${CAMERA_FILE:-}"
  echo "AUTHORITY_FILE=${AUTHORITY_FILE:-}"
  echo "ESC_FILE=${ESC_FILE:-}"
  echo "TRANSITION_FILE=${TRANSITION_FILE:-}"
} | tee "$AUDIT_DIR/discovered_files.txt"

[ -f "$PKG_JSON" ] || fail "package.json not found inside target repo"
[ -n "${SCENE_FILE:-}" ] || fail "SpatialScene.tsx not found inside target repo"
[ -n "${STARFIELD_FILE:-}" ] || fail "LifeMapStarfield.tsx / Starfield.tsx not found inside target repo"
[ -n "${FOCUS_FILE:-}" ] || fail "FocusSubject.tsx not found inside target repo"
[ -n "${HOME_FILE:-}" ] || fail "HomeEnvironment.tsx not found inside target repo"

log "live-repo discovery pass complete"
