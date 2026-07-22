#!/usr/bin/env bash
set -euo pipefail

die(){ echo "CERT_FAIL: $*" >&2; exit 1; }

HOME_CANON="src/components/spatial/LifeMapScene.tsx"
REPLAY="urai-tier1/src/spatial/places/PlaceReplayScene.tsx"
CAM_A="urai-tier1/src/spatial/canon/cameraCanon.ts"
CAM_B="urai-tier1/src/spatial/hooks/useTransitionSync.ts"

[ -f "$HOME_CANON" ] || die "missing LifeMapScene.tsx"
[ -f "$REPLAY" ] || die "missing PlaceReplayScene.tsx"

grep -q "<PlaceReplayScene" "$HOME_CANON" || die "LifeMap scene must route to PlaceReplayScene"
grep -q "makeDemoPlaceReplayBeats" "$REPLAY" || die "PlaceReplayScene must use replay beat schema"
grep -q "getSpatialCueMetadata" "$REPLAY" || die "PlaceReplayScene must use cue metadata"
grep -q "Replay sensory cue" "$REPLAY" || die "PlaceReplayScene must surface replay sensory cue metadata"

grep -q "resolveCameraConvergence" "$CAM_A" || die "camera canon missing convergence helper"
grep -q "resolveCameraDamping" "$CAM_A" || die "camera canon missing damping helper"
grep -q "resolveCameraDurationMs" "$CAM_A" || die "camera canon missing duration helper"

grep -q "showHomeLayer" "$CAM_B" || die "transition sync missing home layer"
grep -q "showLifeMapLayer" "$CAM_B" || die "transition sync missing lifemap layer"
grep -q "showFocusLayer" "$CAM_B" || die "transition sync missing focus layer"
grep -q "showReplayLayer" "$CAM_B" || die "transition sync missing replay layer"

if grep -RIn "transitionDurations\.default" src/components/spatial urai-tier1/src >/dev/null 2>&1; then
  die "illegal transitionDurations.default fallback still exists"
fi

echo "CERT_PASS: scene structure and replay authority intact"