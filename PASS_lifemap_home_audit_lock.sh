#!/usr/bin/env bash
set -Eeuo pipefail

TS="$(date +%Y%m%d_%H%M%S)"

find_app_root() {
  local d hit
  for d in \
    "$(pwd)" \
    "$(pwd)/urai-tier1" \
    /home/user/urai-spatial/urai-tier1 \
    /workspace/urai-tier1 \
    /workspaces/urai-tier1 \
    /mnt/data \
    /home/oai \
    /tmp
  do
    [ -d "$d" ] || continue
    hit="$(find "$d" -type f -path '*/src/spatial/scene/SpatialScene.tsx' 2>/dev/null | head -n 1 || true)"
    if [ -n "$hit" ]; then
      dirname "$(dirname "$(dirname "$(dirname "$hit")")")"
      return 0
    fi
  done
  return 1
}

APP="$(find_app_root || true)"
[ -n "${APP:-}" ] && [ -d "$APP" ] || { echo "FATAL: could not locate urai-tier1 app root"; exit 1; }

cd "$APP"

AUDIT="$APP/_audit/pass_lifemap_home_audit_lock_$TS"
BACKUP="$AUDIT/backup"
REPORT="$AUDIT/report.txt"
PLAN="$AUDIT/PLAN.md"
mkdir -p "$AUDIT" "$BACKUP"

exec > >(tee "$REPORT") 2>&1

echo "=== PASS — LIFEMAP + HOME AUDIT LOCK ==="
echo "APP=$APP"
echo "AUDIT=$AUDIT"
echo "DATE=$(date -Is)"
echo

backup_if_exists() {
  local f="$1"
  if [ -f "$f" ]; then
    mkdir -p "$BACKUP/$(dirname "$f")"
    cp "$f" "$BACKUP/$f"
    echo "BACKUP: $f"
  fi
}

echo "=== 1) BACKUP CANDIDATE FILES ==="
for f in \
  src/spatial/scene/SpatialScene.tsx \
  src/spatial/components/Starfield.tsx \
  src/spatial/components/CanonCameraRig.tsx \
  src/spatial/components/LifeMapCameraRig.tsx \
  src/spatial/components/HomeEnvironment.tsx \
  src/spatial/scene/HomeEnvironment.tsx \
  src/spatial/scene/Orb.tsx \
  src/spatial/components/Orb.tsx \
  src/spatial/hooks/useLifeMapTransitionDriver.ts \
  src/spatial/hooks/useTransitionDriver.ts \
  src/lib/uraiCanon/state.ts \
  src/lib/uraiCanon/validators.ts \
  src/lib/uraiCanon/lifemap.contract.ts
do
  backup_if_exists "$f"
done
echo

echo "=== 2) WRITE CANON CONTRACT SCAFFOLD ==="
mkdir -p src/lib/uraiCanon
cat > src/lib/uraiCanon/lifemap.contract.ts <<'CONTRACT'
export type StarTier = 'background' | 'memory' | 'anchor'

export const URAI_HOME_GROUND_CONTRACT = {
  bottomCoverageMin: 0.20,
  bottomCoverageMax: 0.35,
  shadowContrastMax: 0.18,
  hardEdgeAllowed: false,
  interactive: false,
} as const

export const URAI_LIFEMAP_CONTRACT = {
  allowHomeResidue: false,
  allowGround: false,
  allowOrb: false,
  allowHorizon: false,
  allowBodySilhouette: false,
  hoverScale: 1.08,
  hoverBrightness: 1.18,
  hoverHaloOpacity: 0.22,
  tierBrightness: {
    background: 0.22,
    memory: 0.62,
    anchor: 1.00,
  },
  tierScale: {
    background: 0.50,
    memory: 1.00,
    anchor: 1.65,
  },
  tierPulse: {
    background: 0.00,
    memory: 0.02,
    anchor: 0.05,
  },
} as const

export const URAI_TRANSITION_SPINE = {
  homeToLifemap: {
    acknowledgeMs: 180,
    liftStartMs: 220,
    starsRevealStartMs: 900,
    starsDominantMs: 1550,
    fullSettleMs: 2200,
  },
  lifemapToHome: {
    recedeStartMs: 0,
    atmosphereReturnMs: 900,
    groundReturnMs: 1450,
    interactionUnlockMs: 2200,
  },
  lifemapToFocus: {
    acknowledgeMs: 120,
    isolationMs: 500,
    approachMs: 1400,
    lockMs: 1700,
  },
} as const
CONTRACT
echo "WROTE: src/lib/uraiCanon/lifemap.contract.ts"
echo

echo "=== 3) REPO SURVEY ==="
echo "-- Spatial files --"
find src -type f \( \
  -iname '*SpatialScene*.tsx' -o \
  -iname '*Starfield*.tsx' -o \
  -iname '*LifeMap*.tsx' -o \
  -iname '*Camera*.tsx' -o \
  -iname '*Environment*.tsx' -o \
  -iname '*Orb*.tsx' -o \
  -iname '*Transition*.ts' -o \
  -iname '*Transition*.tsx' \
\) 2>/dev/null | sort
echo

echo "-- Canon / state files --"
find src/lib -type f 2>/dev/null | sort | sed -n '1,200p'
echo

echo "=== 4) ANCHOR SEARCH ==="
grep -RIn --line-number --color=never -E \
  'mode|lifemap|home|focus|replay|selectedStar|hoveredStar|transition|progress|starfield|orb|ground|camera|lookAt|look target|useFrame|pointerover|pointerout|onClick' \
  src 2>/dev/null | sed -n '1,400p'
echo

echo "=== 5) DUPLICATE MOTION AUTHORITY SEARCH ==="
grep -RIn --line-number --color=never -E \
  'useFrame|state\.camera|camera\.position|camera\.lookAt|setLookAt|lerp|damp|easing|transitionProgress|isTransitioning' \
  src/spatial src/lib 2>/dev/null | sed -n '1,400p'
echo

echo "=== 6) HOME RESIDUE RISK SEARCH ==="
grep -RIn --line-number --color=never -E \
  'ground|horizon|orb|silhouette|shadow|floor|planeGeometry|circleGeometry|meshStandardMaterial|meshBasicMaterial' \
  src/spatial src/lib 2>/dev/null | sed -n '1,400p'
echo

echo "=== 7) STAR SEMANTICS RISK SEARCH ==="
grep -RIn --line-number --color=never -E \
  'createCanonicalStars|stars|starNodes|StarNode|map\(.*star|Math\.random|random|size|brightness|intensity|scale|hover|selected' \
  src/spatial src/lib 2>/dev/null | sed -n '1,400p'
echo

echo "=== 8) WRITE ACTION PLAN ==="
cat > "$PLAN" <<'PLANEOF'
# URAI — HOME + LIFEMAP FIX PLAN

## Pass Order

### PASS A — Ground Softness Lock
- Reduce any readable oval/shadow edge in Home
- Keep ground as density, not object
- Ensure no hover/click on ground

### PASS B — Star Tier Lock
- Introduce 3 semantic tiers:
  - background
  - memory
  - anchor
- Differentiate by scale, brightness, pulse

### PASS C — Hover / Selection Lock
- Add subtle hover halo
- Add small scale + brightness response
- Ensure click visibly commits attention

### PASS D — Transition Spine Lock
- One normalized transition driver
- Ground gone before stars dominate
- No home residue inside LifeMap
- Arrival settle before re-interactivity

### PASS E — Camera Authority Lock
- One owner at a time
- No competing useFrame rigs
- Look target discipline enforced

## Acceptance Targets

### Home
- Ground is felt, not seen
- Orb anchored and calm
- Sky remains clear primary gateway

### LifeMap
- No orb
- No ground
- No horizon
- Stars do not read as random particles
- Interactive candidates visually distinguishable

### Transition
- No snap
- No mixed-world phase
- No reverse-star weirdness
- Settle before unlock
PLANEOF
echo "WROTE: $PLAN"
echo

echo "=== 9) NEXT FILES TO PATCH FIRST ==="
for f in \
  src/spatial/scene/SpatialScene.tsx \
  src/spatial/components/Starfield.tsx \
  src/spatial/components/LifeMapCameraRig.tsx \
  src/spatial/components/CanonCameraRig.tsx \
  src/spatial/scene/HomeEnvironment.tsx \
  src/spatial/components/HomeEnvironment.tsx
do
  [ -f "$f" ] && echo "$f"
done
echo

echo "=== 10) OPTIONAL TYPECHECK / BUILD ==="
if command -v pnpm >/dev/null 2>&1; then
  echo "Running: pnpm exec tsc --noEmit"
  pnpm exec tsc --noEmit || true
  echo
  echo "Running: pnpm build"
  pnpm build || true
else
  echo "pnpm not found; skipping build validation"
fi
echo

echo "=== DONE ==="
echo "Audit:  $AUDIT"
echo "Report: $REPORT"
echo "Plan:   $PLAN"
