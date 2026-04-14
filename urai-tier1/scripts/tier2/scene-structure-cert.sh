#!/usr/bin/env bash
set -euo pipefail

die(){ echo "CERT_FAIL: $*" >&2; exit 1; }

SCENE="src/spatial/scene/SpatialScene.tsx"
REPLAY="src/spatial/components/ReplayScene.tsx"
CAM_A="src/spatial/components/CameraDirector.tsx"
CAM_B="src/spatial/components/CinematicCameraRig.tsx"

[ -f "$SCENE" ] || die "missing SpatialScene.tsx"
[ -f "$REPLAY" ] || die "missing ReplayScene.tsx"

HAS_DIRECTOR=0
HAS_RIG=0
grep -q "<CameraDirector" "$SCENE" && HAS_DIRECTOR=1 || true
grep -q "<CinematicCameraRig" "$SCENE" && HAS_RIG=1 || true

[ $((HAS_DIRECTOR + HAS_RIG)) -eq 1 ] || die "scene must render exactly one camera authority"

grep -q "const lifeMapVisible =" "$SCENE" || die "lifeMapVisible missing"
grep -q "const focusVisible =" "$SCENE" || die "focusVisible missing"
grep -q "const replayVisible =" "$SCENE" || die "replayVisible missing"
grep -q "const replaySceneOpacity =" "$SCENE" || die "replaySceneOpacity missing"
grep -q "const replayEnvelopeOpacity =" "$SCENE" || die "replayEnvelopeOpacity missing"
grep -q "const homeReturnOpacity =" "$SCENE" || die "homeReturnOpacity missing"
grep -q "const phaseAny =" "$SCENE" || die "phaseAny helper missing in scene"

REPLAY_BLOCK_START="$(grep -n "<ReplayScene" "$SCENE" | head -n 1 | cut -d: -f1)"
[ -n "$REPLAY_BLOCK_START" ] || die "ReplayScene callsite missing"
REPLAY_BLOCK="$(awk -v start="$REPLAY_BLOCK_START" '
NR < start { next }
NR >= start {
  print
  if ($0 ~ /\/>/) exit
}
' "$SCENE")"

echo "$REPLAY_BLOCK" | grep -q "visible={replayVisible}" || die "ReplayScene must be gated by replayVisible"
echo "$REPLAY_BLOCK" | grep -q "starId={authority.replayStarId ?? authority.selectedStarId}" || die "ReplayScene starId wiring missing"

OPACITY_COUNT="$(printf '%s\n' "$REPLAY_BLOCK" | grep -c 'opacity={')"
[ "$OPACITY_COUNT" -eq 1 ] || die "ReplayScene callsite must have exactly one opacity prop"

grep -q "type Props = {" "$REPLAY" || die "ReplayScene Props missing"
grep -q "visible?: boolean" "$REPLAY" || die "ReplayScene visible prop missing"
grep -q "opacity?: number" "$REPLAY" || die "ReplayScene opacity prop missing"
grep -q "starId?: string" "$REPLAY" || die "ReplayScene starId prop missing"
grep -q "void starId" "$REPLAY" || die "ReplayScene must consume starId binding"
grep -q "export default function ReplayScene" "$REPLAY" || die "ReplayScene export missing"

if [ "$HAS_DIRECTOR" -eq 1 ]; then
  [ -f "$CAM_A" ] || die "CameraDirector.tsx missing"
  grep -q "transitionPhase" "$CAM_A" || die "CameraDirector missing transitionPhase support"
fi

if [ "$HAS_RIG" -eq 1 ]; then
  [ -f "$CAM_B" ] || die "CinematicCameraRig.tsx missing"
  grep -q "transitionPhase" "$CAM_B" || die "CinematicCameraRig missing transitionPhase prop"
  grep -q "const transitionDamping =" "$CAM_B" || die "CinematicCameraRig missing transitionDamping helper"
fi

if grep -RIn "transitionDurations\.default" src/spatial >/dev/null 2>&1; then
  die "illegal transitionDurations.default fallback still exists"
fi

echo "CERT_PASS: scene structure and replay authority intact"
