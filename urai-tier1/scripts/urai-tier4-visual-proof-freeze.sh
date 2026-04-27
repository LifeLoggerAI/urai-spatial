#!/usr/bin/env bash
set -euo pipefail
trap 'RC=$?; echo "[FAIL] line $LINENO exit $RC"; exit $RC' ERR

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="_audit/${STAMP}_tier4_visual_proof_freeze"
SCENE="src/spatial/scene/SpatialScene.tsx"

mkdir -p "$OUT/src"
cp -a src "$OUT/src_snapshot"
cp -f package.json "$OUT/package.json" 2>/dev/null || true
cp -f pnpm-lock.yaml "$OUT/pnpm-lock.yaml" 2>/dev/null || true

echo "===== URAI TIER-4 VISUAL ENGINE PROOF + FREEZE ====="
echo "Snapshot: $OUT"

echo
echo "===== CORE FROZEN ANCHORS ====="
for x in \
  "CameraRig" \
  "HomeWorld" \
  "LifeMapWorld" \
  "FocusWorld" \
  "ReplayWorld" \
  "escapeBack" \
  "REPLAY_DWELL_MS" \
  "URAI_ASCENT_ESC_IGNORE" \
  "TIER3_SAFE_NARRATOR_TIMING_V1" \
  "TIER3_SAFE_NARRATOR_COPY_V1" \
  "URAI_NARRATOR_VOICE_PRODUCTION_V2" \
  "URAI_VOICE_FORWARD_PHASE_ORDER_V1"
do
  grep -q "$x" "$SCENE"
  echo "[OK] $x"
done

echo
echo "===== TIER-4 VISUAL ENGINE ANCHORS ====="
for x in \
  "ReplayVisualEngine" \
  "FocusVisualEngine" \
  "LifeMapVisualEngine" \
  "TIER4_REPLAY_VISUAL_ENGINE_MOUNT_V1" \
  "TIER4_FOCUS_VISUAL_ENGINE_MOUNT_V1" \
  "TIER4_LIFEMAP_VISUAL_ENGINE_MOUNT_V1"
do
  grep -q "$x" "$SCENE"
  echo "[OK] $x"
done

echo
echo "===== TIER-4 FILES ====="
for f in \
  "src/spatial/visual-engine/ReplayVisualEngine.tsx" \
  "src/spatial/visual-engine/FocusVisualEngine.tsx" \
  "src/spatial/visual-engine/LifeMapVisualEngine.tsx"
do
  test -f "$f"
  echo "[OK] $f"
done

echo
echo "===== FORBIDDEN BROKEN PATCH MARKERS ====="
for bad in \
  "TIER3_AURA_APPLIED_V1" \
  "TIER3_LOCAL_EMOTIONAL_WEIGHT" \
  "const emotionalWeight = getEmotionalWeight(phase);"
do
  if grep -q "$bad" "$SCENE"; then
    echo "[FAIL] forbidden unsafe marker still present: $bad"
    exit 1
  fi
done
echo "[OK] no unsafe broad Tier-3 mesh patch markers"

echo
echo "===== DEMO ROUTE CHECK ====="
test -f src/app/demo/page.tsx
grep -q "Start cinematic demo" src/app/demo/page.tsx
grep -q "URAI Spatial · Cinematic Demo" src/app/demo/page.tsx
echo "[OK] /demo shell present"

echo
echo "===== TYPECHECK ====="
pnpm typecheck

echo
echo "===== BUILD ====="
pnpm build --webpack

echo
echo "===== FREEZE MANIFEST ====="
cat > "$OUT/FREEZE_MANIFEST.md" <<EOF
# URAI Tier-4 Visual Engine Proof Freeze

Timestamp: $STAMP

Frozen core:
- Tier-1 canon/state machine locked
- Tier-2 cinematic traversal locked
- Tier-3 narrator/voice layer locked
- Demo route present

Tier-4 visual engine:
- ReplayVisualEngine mounted additively
- FocusVisualEngine mounted additively
- LifeMapVisualEngine mounted additively
- No core runtime rewrites required
- No unsafe broad material/opacity patches active

Required visual proof:
1. /demo loads
2. HOME → ASCENT → LIFEMAP
3. LifeMap depth/constellation layer visible
4. LIFEMAP → FOCUS
5. Focus visual field visible without hiding memory node
6. FOCUS → REPLAY
7. Replay visual enclosure visible
8. ESC unwind still returns REPLAY → FOCUS → LIFEMAP → HOME
9. Voice auto-speaks forward only
10. Manual Speak works

Do not touch:
- CameraRig
- phase transition logic
- ESC unwind logic
- replay dwell lock
- broad mesh opacity regex patches

Safe future Tier-4:
- HomeVisualEngine additive component
- AscentVisualEngine additive component
- visual tuning only inside visual-engine files
- demo route polish only
EOF

echo "[OK] freeze manifest written: $OUT/FREEZE_MANIFEST.md"

echo
echo "[PASS] URAI Tier-4 visual proof freeze complete"
echo "Snapshot: $OUT"
