#!/usr/bin/env bash
set -euo pipefail
trap 'RC=$?; echo "[FAIL] line $LINENO exit $RC"; exit $RC' ERR

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="_audit/${STAMP}_tier3_proof_freeze"

mkdir -p "$OUT"

echo "===== URAI TIER-3 PROOF + FREEZE ====="

echo
echo "===== SAVE SNAPSHOT ====="
mkdir -p "$OUT/src"
cp -a src "$OUT/src_snapshot"
cp -f package.json "$OUT/package.json" 2>/dev/null || true
cp -f pnpm-lock.yaml "$OUT/pnpm-lock.yaml" 2>/dev/null || true

echo "[OK] snapshot saved: $OUT"

echo
echo "===== REQUIRED ANCHORS ====="
FILE="src/spatial/scene/SpatialScene.tsx"

for x in \
  "TIER3_SAFE_NARRATOR_TIMING_V1" \
  "TIER3_SAFE_NARRATOR_COPY_V1" \
  "TIER3_SAFE_NARRATOR_VISIBILITY_V1" \
  "CameraRig" \
  "HomeWorld" \
  "LifeMapWorld" \
  "FocusWorld" \
  "ReplayWorld" \
  "escapeBack" \
  "REPLAY_DWELL_MS" \
  "URAI_ASCENT_ESC_IGNORE"
do
  grep -q "$x" "$FILE"
  echo "[OK] $x"
done

echo
echo "===== FORBIDDEN BROKEN TIER-3 PATTERNS ====="
if grep -q "TIER3_AURA_APPLIED_V1" "$FILE"; then
  echo "[FAIL] broken broad opacity injection marker found"
  exit 1
fi

if grep -q "const emotionalWeight = getEmotionalWeight(phase);" "$FILE"; then
  echo "[FAIL] unsafe emotionalWeight mesh-scope patch found"
  exit 1
fi

echo "[OK] no broken broad Tier-3 mesh patch markers"

echo
echo "===== CANON GUARANTEE CHECK ====="
grep -q "if (phase === \"ASCENT\") return;" "$FILE"
echo "[OK] ESC ignored during ASCENT"

grep -q "replay dwell lock active" "$FILE"
echo "[OK] Replay dwell lock present"

grep -q "return \"FOCUS\";" "$FILE"
grep -q "return \"LIFEMAP\";" "$FILE"
grep -q "return \"HOME\";" "$FILE"
echo "[OK] ESC unwind targets present"

echo
echo "===== TYPECHECK ====="
pnpm typecheck

echo
echo "===== BUILD ====="
pnpm build --webpack

echo
echo "===== FREEZE MANIFEST ====="
cat > "$OUT/FREEZE_MANIFEST.md" <<EOF
# URAI Tier-3 Proof Freeze

Timestamp: $STAMP

Status:
- Tier-1 canon restored and locked
- Tier-2 spatial/cinematic flow restored and locked
- Tier-3 narrator-only layer applied safely
- No broad material/opacity mutation active
- No unsafe emotionalWeight mesh-scope patch active

Required visual proof:
1. HOME → ASCENT → LIFEMAP
2. LIFEMAP → FOCUS → REPLAY
3. REPLAY → ESC → FOCUS → ESC → LIFEMAP → ESC → HOME
4. ESC during ASCENT does nothing
5. ESC during Replay dwell does not exit early

Do not rerun:
- broken Tier-3 emotional mesh/opacity patch
- broad opacity regex patches
- broad scene rewrites without anchors

Known safe next layers:
- narrator voice adapter
- copy variants by phase
- overlay-only emotional tone panel
- proof recorder script
EOF

echo "[OK] freeze manifest written: $OUT/FREEZE_MANIFEST.md"

echo
echo "[PASS] URAI Tier-3 proof freeze complete"
echo "Snapshot: $OUT"
