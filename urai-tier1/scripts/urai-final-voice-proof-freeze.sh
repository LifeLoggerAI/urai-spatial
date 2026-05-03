#!/usr/bin/env bash
set -euo pipefail
trap 'RC=$?; echo "[FAIL] line $LINENO exit $RC"; exit $RC' ERR

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="_audit/${STAMP}_final_voice_proof_freeze"
FILE="src/spatial/scene/SpatialScene.tsx"

mkdir -p "$OUT/src"
cp -a src "$OUT/src_snapshot"
cp -f package.json "$OUT/package.json" 2>/dev/null || true
cp -f pnpm-lock.yaml "$OUT/pnpm-lock.yaml" 2>/dev/null || true

echo "===== URAI FINAL VOICE PROOF + FREEZE ====="
echo "Snapshot: $OUT"

echo
echo "===== REQUIRED CORE ANCHORS ====="
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
  grep -q "$x" "$FILE"
  echo "[OK] $x"
done

echo
echo "===== FORBIDDEN BROKEN PATCH MARKERS ====="
for bad in \
  "TIER3_AURA_APPLIED_V1" \
  "TIER3_LOCAL_EMOTIONAL_WEIGHT" \
  "const emotionalWeight = getEmotionalWeight(phase);"
do
  if grep -q "$bad" "$FILE"; then
    echo "[FAIL] forbidden unsafe marker still present: $bad"
    exit 1
  fi
done
echo "[OK] no unsafe Tier-3 mesh/opacity patch markers"

echo
echo "===== VOICE FORWARD-ONLY CHECK ====="
grep -q "isForwardPhaseMove(from, phase)" "$FILE"
grep -q "if (!forward && !firstHomeSpeak) return;" "$FILE"
grep -q "voiceLastPhaseRef.current = phase;" "$FILE"
echo "[OK] auto-speak advances forward after narratorReady"

echo
echo "===== CANON CHECK ====="
grep -q "if (phase === \"ASCENT\") return;" "$FILE"
grep -q "replay dwell lock active" "$FILE"
grep -q "return \"FOCUS\";" "$FILE"
grep -q "return \"LIFEMAP\";" "$FILE"
grep -q "return \"HOME\";" "$FILE"
echo "[OK] ESC unwind and dwell anchors present"

echo
echo "===== TYPECHECK ====="
pnpm typecheck

echo
echo "===== BUILD ====="
pnpm build --webpack

echo
echo "===== FREEZE MANIFEST ====="
cat > "$OUT/FREEZE_MANIFEST.md" <<EOF
# URAI Final Voice Proof Freeze

Timestamp: $STAMP

Frozen status:
- Tier-1 canon/state machine locked
- Tier-2 spatial/cinematic traversal locked
- Tier-3 narrator timing/copy locked
- Voice production layer installed
- Voice auto-speak is forward-only
- Manual Speak remains available
- No broad Tier-3 mesh/opacity mutation active

Required final visual proof:
1. HOME → ASCENT → LIFEMAP → FOCUS → REPLAY
2. Voice on: auto-speaks forward phase arrivals
3. ESC REPLAY → FOCUS → LIFEMAP → HOME
4. Voice does not auto-repeat during ESC unwind
5. Manual Speak works in any phase

Do not rerun:
- broken Tier-3 emotional mesh/opacity patch
- broad opacity regex patches
- broad scene rewrites without anchors

Safe future layers:
- persisted voiceEnabled preference
- voice selection dropdown
- demo auto-flow mode
- investor/demo recording shell
- mobile overlay polish
EOF

echo "[OK] freeze manifest written: $OUT/FREEZE_MANIFEST.md"

echo
echo "[PASS] URAI final voice proof freeze complete"
echo "Snapshot: $OUT"
