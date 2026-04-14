#!/usr/bin/env bash
set -euo pipefail

die(){ echo "LOCK_MANIFEST_FAIL: $*" >&2; exit 1; }

ROOT="$(pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="${ROOT}/_audit/${TS}_lock_manifest_run"
OUT_FILE="${OUT_DIR}/manifest.txt"

mkdir -p "$OUT_DIR"

FILES=(
  "src/spatial/scene/SpatialScene.tsx"
  "src/spatial/components/ReplayScene.tsx"
  "src/spatial/canon/cameraCanon.ts"
  "src/spatial/canon/transitionCanon.ts"
  "scripts/tier2/authority-cert.sh"
  "scripts/tier2/scene-structure-cert.sh"
  "scripts/tier2/master-cert.sh"
  "scripts/tier2/forensic-smoke.sh"
  "scripts/tier2/release-gate.sh"
)

if [ -f "src/spatial/components/CameraDirector.tsx" ]; then
  FILES+=("src/spatial/components/CameraDirector.tsx")
fi
if [ -f "src/spatial/components/CinematicCameraRig.tsx" ]; then
  FILES+=("src/spatial/components/CinematicCameraRig.tsx")
fi

for f in "${FILES[@]}"; do
  [ -f "$f" ] || die "missing required file: $f"
done

ACTIVE_CAMERA=""
if grep -q "<CameraDirector" "src/spatial/scene/SpatialScene.tsx"; then
  ACTIVE_CAMERA="CameraDirector"
elif grep -q "<CinematicCameraRig" "src/spatial/scene/SpatialScene.tsx"; then
  ACTIVE_CAMERA="CinematicCameraRig"
else
  die "no active camera authority found"
fi

{
  echo "URAI SPATIAL LOCK MANIFEST"
  echo "timestamp=$TS"
  echo "active_camera=$ACTIVE_CAMERA"
  echo
  echo "== SHA256 =="
  sha256sum "${FILES[@]}"
  echo
  echo "== ACTIVE CAMERA CALLSITE =="
  grep -nA2 -B2 "CameraDirector\|CinematicCameraRig" "src/spatial/scene/SpatialScene.tsx"
  echo
  echo "== REPLAY CALLSITE =="
  START="$(grep -n "<ReplayScene" "src/spatial/scene/SpatialScene.tsx" | head -n 1 | cut -d: -f1)"
  [ -n "$START" ] || die "ReplayScene callsite missing"
  awk -v start="$START" '
  NR < start { next }
  NR >= start {
    print
    if ($0 ~ /\/>/) exit
  }
  ' "src/spatial/scene/SpatialScene.tsx"
  echo
  echo "== SCENE ANCHORS =="
  grep -n "const phaseAny =" "src/spatial/scene/SpatialScene.tsx"
  grep -n "const lifeMapVisible =" "src/spatial/scene/SpatialScene.tsx"
  grep -n "const focusVisible =" "src/spatial/scene/SpatialScene.tsx"
  grep -n "const replayVisible =" "src/spatial/scene/SpatialScene.tsx"
  grep -n "const replaySceneOpacity =" "src/spatial/scene/SpatialScene.tsx"
  grep -n "const replayEnvelopeOpacity =" "src/spatial/scene/SpatialScene.tsx"
  grep -n "const homeReturnOpacity =" "src/spatial/scene/SpatialScene.tsx"
} > "$OUT_FILE"

bash "scripts/tier2/authority-cert.sh"
bash "scripts/tier2/scene-structure-cert.sh"
bash "scripts/tier2/master-cert.sh"

echo "LOCK_MANIFEST_PASS: $OUT_FILE"
