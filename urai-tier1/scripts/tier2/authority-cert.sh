#!/usr/bin/env bash
set -euo pipefail

die(){ echo "CERT_FAIL: $*" >&2; exit 1; }

HOME_CANON="src/components/spatial/LifeMapScene.tsx"
REPLAY="urai-tier1/src/spatial/places/PlaceReplayScene.tsx"
TIER2_CANON="urai-tier1/src/spatial/canon/tier2Canon.ts"
CAMERA_CANON="urai-tier1/src/spatial/canon/cameraCanon.ts"
TRANSITION_SYNC="urai-tier1/src/spatial/hooks/useTransitionSync.ts"

[ -f "$HOME_CANON" ] || die "missing LifeMapScene.tsx"
[ -f "$REPLAY" ] || die "missing PlaceReplayScene.tsx"
[ -f "$TIER2_CANON" ] || die "missing tier2Canon.ts"
[ -f "$CAMERA_CANON" ] || die "missing cameraCanon.ts"
[ -f "$TRANSITION_SYNC" ] || die "missing useTransitionSync.ts"

grep -q "resolveReplayVeilOpacity" "$TIER2_CANON" || die "tier2 canon missing replay veil opacity"
grep -q "resolveFocusOpacity" "$TIER2_CANON" || die "tier2 canon missing focus opacity"
grep -q "resolveDepthScale" "$TIER2_CANON" || die "tier2 canon missing depth scale"
grep -q "CANON_ACTIONS" "$TIER2_CANON" || die "tier2 canon missing action registry"

grep -q "resolveCameraConvergence" "$CAMERA_CANON" || die "camera canon missing convergence helper"
grep -q "resolveCameraDamping" "$CAMERA_CANON" || die "camera canon missing damping helper"
grep -q "resolveCameraDurationMs" "$CAMERA_CANON" || die "camera canon missing duration helper"
grep -q "normalizeTransitionPhase" "$CAMERA_CANON" || die "camera canon missing phase normalization"

grep -q "showHomeLayer" "$TRANSITION_SYNC" || die "transition sync missing home layer"
grep -q "showLifeMapLayer" "$TRANSITION_SYNC" || die "transition sync missing lifemap layer"
grep -q "showFocusLayer" "$TRANSITION_SYNC" || die "transition sync missing focus layer"
grep -q "showReplayLayer" "$TRANSITION_SYNC" || die "transition sync missing replay layer"

echo "CERT_PASS: transition authority wiring intact"