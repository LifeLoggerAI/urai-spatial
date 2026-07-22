#!/usr/bin/env bash
set -euo pipefail

die(){ echo "SMOKE_FAIL: $*" >&2; exit 1; }

HOME_CANON="src/components/spatial/LifeMapScene.tsx"
REPLAY="urai-tier1/src/spatial/places/PlaceReplayScene.tsx"
CAM_A="urai-tier1/src/spatial/canon/cameraCanon.ts"
CAM_B="urai-tier1/src/spatial/hooks/useTransitionSync.ts"
MASTER_CERT="scripts/tier2/master-cert.sh"

[ -f "$HOME_CANON" ] || die "missing LifeMapScene.tsx"
[ -f "$REPLAY" ] || die "missing PlaceReplayScene.tsx"
[ -x "$MASTER_CERT" ] || die "missing executable master cert"

echo "== active camera authority =="
if grep -q "<CameraDirector" "$HOME_CANON"; then
  echo "CameraDirector"
elif grep -q "<CinematicCameraRig" "$HOME_CANON"; then
  echo "CinematicCameraRig"
else
  die "no active camera authority rendered"
fi

echo
 echo "== key canon anchors =="
grep -n "resolveReplayVeilOpacity" "$CAM_A" || die "missing replay veil opacity"
grep -n "resolveFocusOpacity" "$CAM_A" || die "missing focus opacity"
grep -n "resolveDepthScale" "$CAM_A" || die "missing depth scale"
grep -n "resolveCameraConvergence" "$CAM_A" || die "missing camera convergence"
grep -n "showHomeLayer" "$CAM_B" || die "missing home layer"
grep -n "showLifeMapLayer" "$CAM_B" || die "missing lifemap layer"
grep -n "showFocusLayer" "$CAM_B" || die "missing focus layer"
grep -n "showReplayLayer" "$CAM_B" || die "missing replay layer"

echo
 echo "== replay component contract =="
grep -n "makeDemoPlaceReplayBeats" "$REPLAY" || die "Replay scene missing beat schema"
grep -n "getSpatialCueMetadata" "$REPLAY" || die "Replay scene missing cue metadata"
grep -n "Replay sensory cue" "$REPLAY" || die "Replay scene missing replay sensory cue"

echo
 echo "== master cert =="
bash "$MASTER_CERT"

echo
 echo "SMOKE_PASS: forensic smoke runner passed"