#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/home/user/urai-spatial/urai-tier1"
cd "$APP_ROOT"

TS="$(date +%Y%m%d_%H%M%S)"
PASS_NAME="PASS_TIER1_STRUCTURAL_LOCK"
AUDIT_DIR="_audit/${TS}_${PASS_NAME}"
LOG_FILE="${AUDIT_DIR}/run.log"
mkdir -p "$AUDIT_DIR"

exec > >(tee "$LOG_FILE") 2>&1

fail() {
  echo
  echo "FAIL: $1"
  echo "LOG_FILE=$LOG_FILE"
  exit 1
}

backup_file() {
  local f="$1"
  [ -f "$f" ] || return 0
  mkdir -p "${AUDIT_DIR}/$(dirname "$f")"
  cp -p "$f" "${AUDIT_DIR}/$f"
}

require_file() {
  local f="$1"
  [ -f "$f" ] || fail "missing required file: $f"
}

echo "=== DATE ==="
date
echo

echo "=== PWD ==="
pwd
echo

echo "=== VERIFY ROOT ==="
[ -f package.json ] || fail "package.json not found"
[ -d src ] || fail "src not found"
echo "ROOT_OK"
echo

TARGETS=(
  "src/app/page.tsx"
  "src/spatial/scene/SpatialScene.tsx"
  "src/spatial/components/CinematicCameraRig.tsx"
)

echo "=== VERIFY TARGET FILES ==="
for f in "${TARGETS[@]}"; do
  require_file "$f"
  echo "FOUND $f"
done
echo

echo "=== BACKUP TARGET FILES ==="
for f in "${TARGETS[@]}"; do
  backup_file "$f"
done
echo "BACKUP_OK"
echo

echo "=== PRE-FIX SNAPSHOT: KEY HOTSPOTS ==="
for f in "${TARGETS[@]}"; do
  echo "--- $f ---"
  nl -ba "$f" | sed -n '1,260p'
  echo
done

echo "=== FIX 1: page.tsx must be client page with direct SpatialScene import ==="
cat > src/app/page.tsx <<'EOPAGE'
'use client'

import SpatialScene from '@/spatial/scene/SpatialScene'

export default function Page() {
  return <SpatialScene />
}
EOPAGE
echo "PAGE_TSX_REWRITTEN"
echo

echo "=== FIX 2: remove exact duplicate PerspectiveCamera import line if present ==="
backup_file "src/spatial/components/CinematicCameraRig.tsx"
awk '
BEGIN { seen=0 }
{
  if ($0 == "import { PerspectiveCamera } from '\''three'\''") {
    seen++
    if (seen > 1) next
  }
  print
}
' src/spatial/components/CinematicCameraRig.tsx > "${AUDIT_DIR}/CinematicCameraRig.tsx.dedup"

cmp -s src/spatial/components/CinematicCameraRig.tsx "${AUDIT_DIR}/CinematicCameraRig.tsx.dedup" || \
  cp "${AUDIT_DIR}/CinematicCameraRig.tsx.dedup" src/spatial/components/CinematicCameraRig.tsx

rm -f "${AUDIT_DIR}/CinematicCameraRig.tsx.dedup"
echo "DEDUP_DONE"
echo

echo "=== FIX 3: hard fail on stray markdown fences inside TS/TSX ==="
FENCE_HITS="$(grep -RIn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' '^[[:space:]]*```' src || true)"
if [ -n "$FENCE_HITS" ]; then
  echo "$FENCE_HITS"
  fail "stray markdown code fences detected in source"
fi
echo "NO_STRAY_FENCES"
echo

echo "=== FIX 4: canonical ESC token audit ==="
ESC_HITS="$(grep -RIn --include='*.ts' --include='*.tsx' -E "'ESC'|\"ESC\"" src || true)"
if [ -n "$ESC_HITS" ]; then
  echo "$ESC_HITS"
  echo
  echo "NON-CANONICAL ESC TOKEN FOUND"
  echo "Expected action token should be unified to ESCAPE or a single canonical token everywhere."
  fail "manual reducer/action unification required before lock"
fi
echo "ESC_TOKEN_OK"
echo

echo "=== FIX 5: selectedStar consistency audit ==="
echo "--- selectedStarId references ---"
grep -RIn --include='*.ts' --include='*.tsx' 'selectedStarId' src || true
echo
echo "--- selectedStar references ---"
grep -RIn --include='*.ts' --include='*.tsx' 'selectedStar' src || true
echo

echo "=== FIX 6: JSX parent integrity audit for SpatialScene ==="
echo "--- SpatialScene around likely failure window ---"
nl -ba src/spatial/scene/SpatialScene.tsx | sed -n '120,220p'
echo

echo "=== FIX 7: canonical visibility/isolation audit ==="
echo "--- showHomeLayer / showLifeMapLayer / showFocusLayer / showReplayLayer ---"
grep -RIn --include='*.ts' --include='*.tsx' -E 'showHomeLayer|showLifeMapLayer|showFocusLayer|showReplayLayer' src || true
echo

echo "=== FIX 8: camera authority audit ==="
echo "--- raw camera writes ---"
grep -RIn --include='*.ts' --include='*.tsx' -E '\.position\.copy\(|\.lookAt\(|\.fov[[:space:]]*=|updateProjectionMatrix\(' src || true
echo

echo "=== TYPECHECK ==="
pnpm exec tsc --noEmit || {
  echo
  echo "=== TSC FAILED: SPATIALSCENE HOT WINDOW ==="
  nl -ba src/spatial/scene/SpatialScene.tsx | sed -n '120,220p'
  echo
  echo "=== TSC FAILED: CAMERA RIG HOT WINDOW ==="
  nl -ba src/spatial/components/CinematicCameraRig.tsx | sed -n '1,220p'
  fail "typecheck failed"
}
echo "TSC_OK"
echo

echo "=== BUILD ==="
pnpm build || fail "build failed"
echo "BUILD_OK"
echo

echo "=== POST-BUILD CANON CHECKS ==="
echo "--- page.tsx ---"
cat src/app/page.tsx
echo
echo "--- duplicate PerspectiveCamera imports ---"
DUP_COUNT="$(grep -n "^import { PerspectiveCamera } from 'three'$" src/spatial/components/CinematicCameraRig.tsx | wc -l | tr -d ' ')"
echo "DUP_COUNT=$DUP_COUNT"
[ "$DUP_COUNT" -le 1 ] || fail "duplicate PerspectiveCamera import still present"
echo

echo "=== FINAL STATUS ==="
echo "PASS"
echo "LOG_FILE=$LOG_FILE"
