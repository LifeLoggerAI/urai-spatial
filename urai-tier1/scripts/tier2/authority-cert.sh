#!/usr/bin/env bash
set -euo pipefail

die(){ echo "CERT_FAIL: $*" >&2; exit 1; }

SCENE="src/spatial/scene/SpatialScene.tsx"
CAM_A="src/spatial/components/CameraDirector.tsx"
CAM_B="src/spatial/components/CinematicCameraRig.tsx"

[ -f "$SCENE" ] || die "missing SpatialScene.tsx"

HAS_DIRECTOR=0
HAS_RIG=0
grep -q "<CameraDirector" "$SCENE" && HAS_DIRECTOR=1 || true
grep -q "<CinematicCameraRig" "$SCENE" && HAS_RIG=1 || true

[ "$HAS_DIRECTOR" -eq 1 ] || [ "$HAS_RIG" -eq 1 ] || die "no camera component callsite present"
[ $((HAS_DIRECTOR + HAS_RIG)) -eq 1 ] || die "multiple camera authorities rendered in SpatialScene"

if [ "$HAS_DIRECTOR" -eq 1 ]; then
  grep -q "<CameraDirector mode={authority.mode} transitionPhase={phase}" "$SCENE" || die "CameraDirector missing canonical transitionPhase wiring"
  [ -f "$CAM_A" ] || die "CameraDirector.tsx missing"
  grep -q "transitionPhase" "$CAM_A" || die "CameraDirector component missing transitionPhase prop"
fi

if [ "$HAS_RIG" -eq 1 ]; then
  grep -q "<CinematicCameraRig mode={authority.mode} transitionPhase={phase}" "$SCENE" || die "CinematicCameraRig missing canonical transitionPhase wiring"
  [ -f "$CAM_B" ] || die "CinematicCameraRig.tsx missing"
  grep -q "transitionPhase" "$CAM_B" || die "CinematicCameraRig component missing transitionPhase prop"
  grep -q "const phaseAny = transitionPhase" "$CAM_B" || die "CinematicCameraRig missing local phase binding"
  grep -q "const transitionDamping =" "$CAM_B" || die "CinematicCameraRig missing transition damping helper"
fi

grep -q "const replaySceneOpacity =" "$SCENE" || die "SpatialScene missing replaySceneOpacity"
grep -q "const homeReturnOpacity =" "$SCENE" || die "SpatialScene missing homeReturnOpacity"
grep -q "const replayVisible =" "$SCENE" || die "SpatialScene missing replayVisible"
grep -q "const lifeMapVisible =" "$SCENE" || die "SpatialScene missing lifeMapVisible"

echo "CERT_PASS: transition authority wiring intact"
