#!/usr/bin/env bash
set -euo pipefail

die(){ echo "SMOKE_FAIL: $*" >&2; exit 1; }

SCENE="src/spatial/scene/SpatialScene.tsx"
REPLAY="src/spatial/components/ReplayScene.tsx"
CAM_A="src/spatial/components/CameraDirector.tsx"
CAM_B="src/spatial/components/CinematicCameraRig.tsx"
MASTER_CERT="scripts/tier2/master-cert.sh"

[ -f "$SCENE" ] || die "missing SpatialScene.tsx"
[ -f "$REPLAY" ] || die "missing ReplayScene.tsx"
[ -x "$MASTER_CERT" ] || die "missing executable master cert"

echo "== remove stale next locks =="
find . -type f -path '*/.next/dev/lock' -delete || true

echo
echo "== active camera authority =="
if grep -q "<CameraDirector" "$SCENE"; then
  echo "CameraDirector"
elif grep -q "<CinematicCameraRig" "$SCENE"; then
  echo "CinematicCameraRig"
else
  die "no active camera authority rendered"
fi

echo
echo "== key scene anchors =="
grep -n "const phaseAny =" "$SCENE" || die "missing phaseAny"
grep -n "const lifeMapVisible =" "$SCENE" || die "missing lifeMapVisible"
grep -n "const focusVisible =" "$SCENE" || die "missing focusVisible"
grep -n "const replayVisible =" "$SCENE" || die "missing replayVisible"
grep -n "const replaySceneOpacity =" "$SCENE" || die "missing replaySceneOpacity"
grep -n "const replayEnvelopeOpacity =" "$SCENE" || die "missing replayEnvelopeOpacity"
grep -n "const homeReturnOpacity =" "$SCENE" || die "missing homeReturnOpacity"

echo
echo "== replay callsite block =="
START="$(grep -n "<ReplayScene" "$SCENE" | head -n 1 | cut -d: -f1)"
[ -n "$START" ] || die "ReplayScene callsite missing"
awk -v start="$START" '
NR < start { next }
NR >= start {
  print
  if ($0 ~ /\/>/) exit
}
' "$SCENE"

echo
echo "== replay component props =="
grep -n "type Props = {" "$REPLAY" || die "ReplayScene Props missing"
grep -n "visible?: boolean" "$REPLAY" || die "ReplayScene visible prop missing"
grep -n "opacity?: number" "$REPLAY" || die "ReplayScene opacity prop missing"
grep -n "starId?: string" "$REPLAY" || die "ReplayScene starId prop missing"

echo
echo "== camera file anchors =="
if [ -f "$CAM_A" ] && grep -q "transitionPhase" "$CAM_A"; then
  grep -n "transitionPhase" "$CAM_A"
fi
if [ -f "$CAM_B" ] && grep -q "transitionPhase" "$CAM_B"; then
  grep -n "transitionPhase" "$CAM_B"
  grep -n "const transitionDamping =" "$CAM_B" || die "CinematicCameraRig missing transitionDamping"
fi

echo
echo "== run master cert =="
bash "$MASTER_CERT"

echo
echo "SMOKE_PASS: forensic smoke runner passed"
