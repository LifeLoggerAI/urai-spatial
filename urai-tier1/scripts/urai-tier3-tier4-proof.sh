#!/usr/bin/env bash
set -euo pipefail

echo "===== URAI TIER-3 / TIER-4 PROOF ====="

REQ=(
  "src/spatial/emotion/types.ts"
  "src/spatial/emotion/memorySeeds.ts"
  "src/spatial/hooks/useEmotionalState.ts"
  "src/spatial/narrator/types.ts"
  "src/spatial/narrator/narratorRules.ts"
  "src/spatial/hooks/useSpatialNarrator.ts"
  "src/spatial/narrator/insightRules.ts"
  "src/spatial/hooks/useSpatialInsights.ts"
  "src/spatial/product/createSpatialStorySnapshot.ts"
  "src/spatial/components/NarratorOverlay.tsx"
  "src/spatial/components/MeaningOverlay.tsx"
)

for f in "${REQ[@]}"; do
  test -f "$f" || { echo "[FAIL] missing $f"; exit 1; }
  echo "[OK] $f"
done

echo "===== GUARD: NO PARALLEL PHASE SYSTEM ====="
if grep -R "type Phase =" src/spatial/emotion src/spatial/narrator src/spatial/product 2>/dev/null; then
  echo "[FAIL] Parallel Phase type detected"
  exit 1
fi

echo "===== GUARD: NO NAV MUTATION IN TIER-3 / TIER-4 HOOKS ====="
if grep -R "openReplay\|openFocus\|beginAscent\|arriveLifeMap\|goHome\|setPhase" \
  src/spatial/hooks/useEmotionalState.ts \
  src/spatial/hooks/useSpatialNarrator.ts \
  src/spatial/hooks/useSpatialInsights.ts 2>/dev/null; then
  echo "[FAIL] Tier-3/Tier-4 hook mutates navigation"
  exit 1
fi

pnpm typecheck
pnpm build --webpack

echo "[PASS] URAI Tier-3/Tier-4 foundation proof complete"
