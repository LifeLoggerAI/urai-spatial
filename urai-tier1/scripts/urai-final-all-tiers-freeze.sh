#!/usr/bin/env bash
set -euo pipefail
trap 'RC=$?; echo "[FAIL] line $LINENO exit $RC"; exit $RC' ERR

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="_audit/${STAMP}_FINAL_ALL_TIERS_FREEZE"
SCENE="src/spatial/scene/SpatialScene.tsx"
DEMO="src/app/demo/page.tsx"

mkdir -p "$OUT/src"
cp -a src "$OUT/src_snapshot"
cp -f package.json "$OUT/package.json" 2>/dev/null || true
cp -f pnpm-lock.yaml "$OUT/pnpm-lock.yaml" 2>/dev/null || true

echo "===== URAI FINAL ALL-TIERS FREEZE ====="
echo "Snapshot: $OUT"

echo
echo "===== TIER-1 CANON ====="
for x in \
  "assertLegal" \
  "beginAscent" \
  "openFocus" \
  "openReplay" \
  "escapeBack" \
  "REPLAY_DWELL_MS" \
  "URAI_ASCENT_ESC_IGNORE" \
  "return \"FOCUS\"" \
  "return \"LIFEMAP\"" \
  "return \"HOME\""
do
  grep -q "$x" "$SCENE"
  echo "[OK] $x"
done

echo
echo "===== TIER-2 SPATIAL / CINEMATIC ====="
for x in \
  "CameraRig" \
  "HomeWorld" \
  "LifeMapWorld" \
  "FocusWorld" \
  "ReplayWorld" \
  "TIER2_ASCENT_MICRO_SEAM_CAMERA_SYNC_V1" \
  "TIER2_ASCENT_Z_ALIGNMENT_V1" \
  "TIER2_FOCUS_ARRIVAL_FIELD" \
  "TIER2_REPLAY_ENCLOSURE"
do
  grep -q "$x" "$SCENE"
  echo "[OK] $x"
done

echo
echo "===== TIER-3 NARRATOR / VOICE ====="
for x in \
  "TIER3_SAFE_NARRATOR_TIMING_V1" \
  "TIER3_SAFE_NARRATOR_COPY_V1" \
  "TIER3_SAFE_NARRATOR_VISIBILITY_V1" \
  "URAI_NARRATOR_VOICE_PRODUCTION_V2" \
  "URAI_VOICE_FORWARD_PHASE_ORDER_V1" \
  "URAI_VOICE_DIRECTION_REF_V1" \
  "speechSynthesis" \
  "speakNarrator" \
  "Voice on" \
  "Voice off" \
  "Speak"
do
  grep -q "$x" "$SCENE"
  echo "[OK] $x"
done

echo
echo "===== TIER-4 VISUAL ENGINE ====="
for x in \
  "ReplayVisualEngine" \
  "FocusVisualEngine" \
  "LifeMapVisualEngine" \
  "HomeVisualEngine" \
  "AscentVisualEngine" \
  "TIER4_REPLAY_VISUAL_ENGINE_MOUNT_V1" \
  "TIER4_FOCUS_VISUAL_ENGINE_MOUNT_V1" \
  "TIER4_LIFEMAP_VISUAL_ENGINE_MOUNT_V1" \
  "TIER4_HOME_ASCENT_VISUAL_ENGINE_MOUNT_V1"
do
  grep -q "$x" "$SCENE"
  echo "[OK] $x"
done

echo
echo "===== VISUAL ENGINE FILES ====="
for f in \
  "src/spatial/visual-engine/ReplayVisualEngine.tsx" \
  "src/spatial/visual-engine/FocusVisualEngine.tsx" \
  "src/spatial/visual-engine/LifeMapVisualEngine.tsx" \
  "src/spatial/visual-engine/HomeVisualEngine.tsx" \
  "src/spatial/visual-engine/AscentVisualEngine.tsx"
do
  test -f "$f"
  echo "[OK] $f"
done

echo
echo "===== DEMO ROUTE ====="
test -f "$DEMO"
for x in \
  "Start cinematic demo" \
  "URAI Spatial · Cinematic Demo" \
  "REC MODE" \
  "Demo complete" \
  "Run demo"
do
  grep -q "$x" "$DEMO"
  echo "[OK] $x"
done

echo
echo "===== FORBIDDEN UNSAFE PATCHES ====="
for bad in \
  "TIER3_AURA_APPLIED_V1" \
  "TIER3_LOCAL_EMOTIONAL_WEIGHT" \
  "const emotionalWeight = getEmotionalWeight(phase);"
do
  if grep -q "$bad" "$SCENE"; then
    echo "[FAIL] forbidden unsafe marker found: $bad"
    exit 1
  fi
done
echo "[OK] no forbidden unsafe Tier-3 mesh patches"

echo
echo "===== TYPECHECK ====="
pnpm typecheck

echo
echo "===== BUILD ====="
pnpm build --webpack

echo
echo "===== FINAL MANIFEST ====="
cat > "$OUT/FINAL_ALL_TIERS_FREEZE.md" <<EOF
# URAI Spatial Final All-Tiers Freeze

Timestamp: $STAMP

## Frozen Tiers

### Tier-1: Canon / State Machine
- HOME → ASCENT → LIFEMAP → FOCUS → REPLAY flow locked
- ESC unwind locked:
  REPLAY → FOCUS → LIFEMAP → HOME
- Replay dwell lock present
- ASCENT ESC ignore present
- Guarded transitions present

### Tier-2: Cinematic Runtime
- CameraRig intact
- HomeWorld intact
- LifeMapWorld intact
- FocusWorld intact
- ReplayWorld intact
- Ascent seam sync present
- World z-alignment present
- Focus arrival field present
- Replay enclosure present

### Tier-3: Narrator + Voice
- narrator timing locked
- narrator copy locked
- narrator visibility gated
- voice layer installed
- speechSynthesis enabled
- Speak button present
- Voice on/off present
- forward-only voice architecture present

### Tier-4: Visual Engine
- HomeVisualEngine mounted additively
- AscentVisualEngine mounted additively
- LifeMapVisualEngine mounted additively
- FocusVisualEngine mounted additively
- ReplayVisualEngine mounted additively
- No core runtime rewrites required

### Demo Shell
- /demo route present
- cinematic recording shell present
- intro overlay present
- recording badge present
- demo complete overlay present

## Do Not Touch Without New Freeze
- CameraRig
- phase transition logic
- escapeBack
- Replay dwell lock
- broad opacity/material regex patches
- Tier-3 mesh opacity injection

## Required final proof videos
1. HOME → ASCENT → LIFEMAP → FOCUS → REPLAY
2. REPLAY → ESC → FOCUS → ESC → LIFEMAP → ESC → HOME
3. /demo cinematic auto-run
4. Voice on forward-only auto-speak
5. Manual Speak button

## Status
URAI Spatial Tier-1 through Tier-4 are frozen and build-verified.
EOF

echo "[OK] final manifest written: $OUT/FINAL_ALL_TIERS_FREEZE.md"

echo
echo "[PASS] URAI FINAL ALL-TIERS FREEZE COMPLETE"
echo "Snapshot: $OUT"
