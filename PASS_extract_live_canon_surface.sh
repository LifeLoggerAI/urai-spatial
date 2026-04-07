#!/usr/bin/env bash
set -Eeuo pipefail

APP="/home/user/urai-spatial/urai-tier1"
TS="$(date +%Y%m%d_%H%M%S)"
AUDIT="$APP/_audit/pass_extract_live_canon_surface_$TS"
BACKUP="$AUDIT/backup"
LOG="$AUDIT/run.log"

FILES=(
  "src/spatial/scene/SpatialScene.tsx"
  "src/spatial/components/Starfield.tsx"
  "src/lib/uraiCanon/state.ts"
  "src/spatial/hooks/useCanonInteractionLock.ts"
  "src/spatial/hooks/useCanonEsc.ts"
)

mkdir -p "$AUDIT" "$BACKUP"
exec > >(tee -a "$LOG") 2>&1

echo "=== PASS — EXTRACT LIVE CANON SURFACE ==="
echo "APP=$APP"
echo "AUDIT=$AUDIT"
echo "DATE=$(date -Is)"
echo

[ -d "$APP" ] || { echo "FATAL: app not found at $APP"; exit 1; }
cd "$APP"

backup_file() {
  local f="$1"
  [ -f "$f" ] || { echo "FATAL: missing $f"; exit 1; }
  mkdir -p "$BACKUP/$(dirname "$f")"
  cp "$f" "$BACKUP/$f"
  echo "BACKUP: $f"
}

echo "=== 1) BACKUP LIVE FILES ==="
for f in "${FILES[@]}"; do
  backup_file "$f"
done
echo

echo "=== 2) VERIFY LIVE ENTRY ==="
sed -n '1,120p' src/app/page.tsx || true
echo

echo "=== 3) SCAN SPATIALSCENE ANCHORS ==="
SCENE="src/spatial/scene/SpatialScene.tsx"
grep -n 'PHASE_PROGRESS_TARGET' "$SCENE" || true
grep -n 'convertStars' "$SCENE" || true
grep -n 'useCanonInteractionLock' "$SCENE" || true
grep -n 'useCanonEsc' "$SCENE" || true
grep -n 'useFrame' "$SCENE" || true
grep -n 'Starfield' "$SCENE" || true
grep -n 'reduceRuntimeState' "$SCENE" || true
grep -n 'INITIAL_URAI_RUNTIME_STATE' "$SCENE" || true
echo

echo "=== 4) SCAN STARFIELD ANCHORS ==="
STARFIELD="src/spatial/components/Starfield.tsx"
grep -n 'useFrame' "$STARFIELD" || true
grep -n 'hover' "$STARFIELD" || true
grep -n 'selected' "$STARFIELD" || true
grep -n 'intensity' "$STARFIELD" || true
grep -n 'scale' "$STARFIELD" || true
grep -n 'emissive' "$STARFIELD" || true
grep -n 'clusterId' "$STARFIELD" || true
grep -n 'memoryRef' "$STARFIELD" || true
echo

echo "=== 5) CAMERA AUTHORITY SEARCH ==="
grep -RIn --color=never -E \
  'useFrame|camera\.position|camera\.lookAt|lookAt\(|setFromEuler|quaternion|fov|damp\(' \
  src/spatial src/lib 2>/dev/null | sed -n '1,300p'
echo

echo "=== 6) PHASE / STATE AUTHORITY SEARCH ==="
grep -RIn --color=never -E \
  'UraiPhase|UraiRuntimeState|reduceRuntimeState|dispatch|selectedStarId|hoveredStarId|interactionLock|ESC|LIFEMAP|FOCUS|REPLAY|HOME' \
  src/spatial src/lib 2>/dev/null | sed -n '1,300p'
echo

echo "=== 7) WRITE TARGET EXTRACTS ==="
sed -n '1,220p' src/spatial/scene/SpatialScene.tsx > "$AUDIT/01_SpatialScene_head.tsx"
sed -n '221,520p' src/spatial/scene/SpatialScene.tsx > "$AUDIT/02_SpatialScene_mid.tsx"
sed -n '521,920p' src/spatial/scene/SpatialScene.tsx > "$AUDIT/03_SpatialScene_tail.tsx"
sed -n '1,260p' src/spatial/components/Starfield.tsx > "$AUDIT/04_Starfield.tsx"
sed -n '1,260p' src/lib/uraiCanon/state.ts > "$AUDIT/05_state.ts"
sed -n '1,220p' src/spatial/hooks/useCanonInteractionLock.ts > "$AUDIT/06_useCanonInteractionLock.ts"
sed -n '1,220p' src/spatial/hooks/useCanonEsc.ts > "$AUDIT/07_useCanonEsc.ts"
echo "WROTE extract files into $AUDIT"
echo

echo "=== 8) WRITE PATCH PLAN ==="
cat > "$AUDIT/PATCH_PLAN.md" <<'PLAN'
# LIVE CANON PATCH PLAN

## Patch surface
- SpatialScene.tsx
- Starfield.tsx
- state.ts
- useCanonInteractionLock.ts
- useCanonEsc.ts

## Goals
1. Confirm true Home -> LifeMap -> Focus -> Replay authority.
2. Confirm no Home residue survives in LifeMap.
3. Confirm starfield reads as semantic tiers, not random particles.
4. Confirm hover and selection are subtle but unmistakable.
5. Confirm a single camera authority owns motion in the live path.
6. Confirm interaction unlock happens only after settle.

## Acceptance
- Home grounded and calm
- LifeMap no orb / no ground / no horizon
- Hover candidates visually distinguishable
- Selected star clearly commits attention
- No snap / no mixed-world phase / no double motion owners
PLAN
echo "WROTE: $AUDIT/PATCH_PLAN.md"
echo

echo "=== 9) TYPECHECK / BUILD ==="
pnpm --filter urai-tier1 exec tsc --noEmit || true
echo
pnpm --filter urai-tier1 build || true
echo

echo "=== DONE ==="
echo "Audit:  $AUDIT"
echo "Backup: $BACKUP"
echo "Log:    $LOG"
echo
echo "Use these next:"
echo "  $AUDIT/01_SpatialScene_head.tsx"
echo "  $AUDIT/02_SpatialScene_mid.tsx"
echo "  $AUDIT/03_SpatialScene_tail.tsx"
echo "  $AUDIT/04_Starfield.tsx"
