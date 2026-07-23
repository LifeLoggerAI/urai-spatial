#!/usr/bin/env bash
set -euo pipefail

die(){ echo "RELEASE_GATE_FAIL: $*" >&2; exit 1; }

ROOT="$(pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
REPORT_DIR="${ROOT}/_audit/${TS}_release_gate_run"
REPORT="${REPORT_DIR}/report.txt"

HOME_CANON="src/components/spatial/LifeMapScene.tsx"
REPLAY="urai-tier1/src/spatial/places/PlaceReplayScene.tsx"
CAMERA_CANON="urai-tier1/src/spatial/canon/cameraCanon.ts"
TRANSITION_SYNC="urai-tier1/src/spatial/hooks/useTransitionSync.ts"
AUTH_CERT="scripts/tier2/authority-cert.sh"
STRUCT_CERT="scripts/tier2/scene-structure-cert.sh"
MASTER_CERT="scripts/tier2/master-cert.sh"
SMOKE="scripts/tier2/forensic-smoke.sh"

mkdir -p "$REPORT_DIR"

[ -f "$HOME_CANON" ] || die "missing LifeMapScene.tsx"
[ -f "$REPLAY" ] || die "missing PlaceReplayScene.tsx"
[ -f "$CAMERA_CANON" ] || die "missing cameraCanon.ts"
[ -f "$TRANSITION_SYNC" ] || die "missing useTransitionSync.ts"
[ -x "$AUTH_CERT" ] || die "missing authority cert"
[ -x "$STRUCT_CERT" ] || die "missing scene structure cert"
[ -x "$MASTER_CERT" ] || die "missing master cert"
[ -x "$SMOKE" ] || die "missing forensic smoke runner"

ACTIVE_CAMERA=""
if grep -q "<CameraDirector" "$HOME_CANON"; then
  ACTIVE_CAMERA="CameraDirector"
elif grep -q "<CinematicCameraRig" "$HOME_CANON"; then
  ACTIVE_CAMERA="CinematicCameraRig"
else
  die "no active camera authority"
fi

{
  echo "URAI SPATIAL RELEASE GATE"
  echo "timestamp=$TS"
  echo "active_camera=$ACTIVE_CAMERA"
  echo
  echo "== canon anchors =="
  grep -n "resolveReplayVeilOpacity" "$CAMERA_CANON"
  grep -n "resolveFocusOpacity" "$CAMERA_CANON"
  grep -n "resolveDepthScale" "$CAMERA_CANON"
  grep -n "showHomeLayer" "$TRANSITION_SYNC"
  grep -n "showLifeMapLayer" "$TRANSITION_SYNC"
  grep -n "showFocusLayer" "$TRANSITION_SYNC"
  grep -n "showReplayLayer" "$TRANSITION_SYNC"
  echo
  echo "== replay callsite =="
  grep -n "makeDemoPlaceReplayBeats" "$REPLAY"
  grep -n "getSpatialCueMetadata" "$REPLAY"
  echo
  echo "== scene anchors =="
  grep -n "Own your life\." "$HOME_CANON"
  grep -n "Threshold online" "$HOME_CANON"
  grep -n "Place Replay" "$REPLAY"
} > "$REPORT"

echo "== authority cert =="
bash "$AUTH_CERT" | tee -a "$REPORT"

echo
echo "== scene structure cert =="
bash "$STRUCT_CERT" | tee -a "$REPORT"

echo
echo "== forensic smoke =="
bash "$SMOKE" | tee -a "$REPORT"

echo
echo "== master cert =="
bash "$MASTER_CERT" | tee -a "$REPORT"

echo
echo "RELEASE_GATE_PASS: report=$REPORT"