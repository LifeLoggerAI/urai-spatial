#!/usr/bin/env bash
set -euo pipefail

die(){ echo "RELEASE_GATE_FAIL: $*" >&2; exit 1; }

ROOT="$(pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
REPORT_DIR="${ROOT}/_audit/${TS}_release_gate_run"
REPORT="${REPORT_DIR}/report.txt"

SCENE="src/spatial/scene/SpatialScene.tsx"
REPLAY="src/spatial/components/ReplayScene.tsx"
CAM_A="src/spatial/components/CameraDirector.tsx"
CAM_B="src/spatial/components/CinematicCameraRig.tsx"
AUTH_CERT="scripts/tier2/authority-cert.sh"
STRUCT_CERT="scripts/tier2/scene-structure-cert.sh"
MASTER_CERT="scripts/tier2/master-cert.sh"
SMOKE="scripts/tier2/forensic-smoke.sh"

mkdir -p "$REPORT_DIR"

[ -f "$SCENE" ] || die "missing SpatialScene.tsx"
[ -f "$REPLAY" ] || die "missing ReplayScene.tsx"
[ -x "$AUTH_CERT" ] || die "missing authority cert"
[ -x "$STRUCT_CERT" ] || die "missing scene structure cert"
[ -x "$MASTER_CERT" ] || die "missing master cert"
[ -x "$SMOKE" ] || die "missing forensic smoke runner"

ACTIVE_CAMERA=""
if grep -q "<CameraDirector" "$SCENE"; then
  ACTIVE_CAMERA="CameraDirector"
elif grep -q "<CinematicCameraRig" "$SCENE"; then
  ACTIVE_CAMERA="CinematicCameraRig"
else
  die "no active camera authority"
fi

{
  echo "URAI SPATIAL RELEASE GATE"
  echo "timestamp=$TS"
  echo "active_camera=$ACTIVE_CAMERA"
  echo
  echo "== scene anchors =="
  grep -n "const phaseAny =" "$SCENE"
  grep -n "const lifeMapVisible =" "$SCENE"
  grep -n "const focusVisible =" "$SCENE"
  grep -n "const replayVisible =" "$SCENE"
  grep -n "const replaySceneOpacity =" "$SCENE"
  grep -n "const replayEnvelopeOpacity =" "$SCENE"
  grep -n "const homeReturnOpacity =" "$SCENE"
  echo
  echo "== replay callsite =="
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
  echo "== replay props =="
  grep -n "type Props = {" "$REPLAY"
  grep -n "visible?: boolean" "$REPLAY"
  grep -n "opacity?: number" "$REPLAY"
  grep -n "starId?: string" "$REPLAY"
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
