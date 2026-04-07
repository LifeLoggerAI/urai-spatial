#!/usr/bin/env bash
set -Eeuo pipefail

APP="/home/user/urai-spatial/urai-tier1"
SCENE="$APP/src/spatial/scene/SpatialScene.tsx"
TS="$(date +%Y%m%d_%H%M%S)"
AUDIT="$APP/_audit/pass_force_live_runtime_extract_$TS"
BACKUP="$AUDIT/backup"
LOG="$AUDIT/run.log"

mkdir -p "$AUDIT" "$BACKUP"
exec > >(tee -a "$LOG") 2>&1

echo "=== PASS — FORCE LIVE RUNTIME EXTRACT ==="
echo "APP=$APP"
echo "AUDIT=$AUDIT"
echo "DATE=$(date -Is)"
echo

[ -d "$APP" ] || { echo "FATAL: runnable app not found at $APP"; exit 1; }
[ -f "$SCENE" ] || { echo "FATAL: missing $SCENE"; exit 1; }

cd "$APP"

mkdir -p "$BACKUP/src/spatial/scene"
cp "$SCENE" "$BACKUP/src/spatial/scene/SpatialScene.tsx"
echo "BACKUP: $SCENE"
echo

echo "=== 1) VERIFY THIS IS THE LIVE APP ==="
pwd
test -f package.json && sed -n '1,120p' package.json || true
echo
echo "-- page entry --"
sed -n '1,120p' src/app/page.tsx || true
echo

echo "=== 2) PROVE CURRENT LIVE SCENE ANCHORS ==="
grep -n 'function makeStars' "$SCENE" || true
grep -n 'const homeAlpha' "$SCENE" || true
grep -n 'const groundAlpha' "$SCENE" || true
grep -n 'const starAlpha' "$SCENE" || true
grep -n 'camera.position.x = THREE.MathUtils.damp' "$SCENE" || true
grep -n '{stars.map((star) => {' "$SCENE" || true
grep -n '<group ref={groundWorldRef}>' "$SCENE" || true
grep -n '<group ref={homeActorsRef}>' "$SCENE" || true
grep -n '<group ref={starfieldRef}' "$SCENE" || true
echo

echo "=== 3) WRITE TARGETED LIVE EXTRACTS ==="
awk 'NR>=1 && NR<=120 {print}' "$SCENE" > "$AUDIT/01_top_of_file.tsx"
awk 'NR>=1 && NR<=90 {print}' "$SCENE" > "$AUDIT/02_star_model_and_makeStars.tsx"
awk 'NR>=180 && NR<=380 {print}' "$SCENE" > "$AUDIT/03_runtime_and_camera_block.tsx"
awk 'NR>=400 && NR<=545 {print}' "$SCENE" > "$AUDIT/04_ground_home_block.tsx"
awk 'NR>=554 && NR<=590 {print}' "$SCENE" > "$AUDIT/05_star_render_block.tsx"
awk 'NR>=590 && NR<=660 {print}' "$SCENE" > "$AUDIT/06_canvas_tail.tsx"

for f in \
  "$AUDIT/01_top_of_file.tsx" \
  "$AUDIT/02_star_model_and_makeStars.tsx" \
  "$AUDIT/03_runtime_and_camera_block.tsx" \
  "$AUDIT/04_ground_home_block.tsx" \
  "$AUDIT/05_star_render_block.tsx" \
  "$AUDIT/06_canvas_tail.tsx"
do
  echo "--- $(basename "$f") ---"
  sed -n '1,220p' "$f"
  echo
done

echo "=== 4) LIVE FIX SURFACE SUMMARY ==="
cat > "$AUDIT/SUMMARY.md" <<'SUM'
# LIVE FIX SURFACE

## Confirmed live target
- src/spatial/scene/SpatialScene.tsx

## Planned surgical patch order
1. Replace random/raw star shape with semantic tiered star model.
2. Tighten Home/LifeMap alpha ownership so Home residue cannot survive inside LifeMap.
3. Soften ground read so it is density, not an object.
4. Add clearer hover/selection consequence for interactive stars.
5. Preserve single camera authority in SpatialScene before later extraction into dedicated rigs.

## Acceptance gates
- No orb / ground / horizon residue in LifeMap
- Ground felt, not seen, in Home
- Interactive stars visually distinguishable
- Hover subtle but obvious
- Click produces meaningful visual change
- No mixed-world phase
SUM
echo "WROTE: $AUDIT/SUMMARY.md"
echo

echo "=== 5) TYPECHECK / BUILD ON LIVE APP ==="
if command -v pnpm >/dev/null 2>&1; then
  echo "-- pnpm exec tsc --noEmit (app-scoped) --"
  pnpm --filter urai-tier1 exec tsc --noEmit || true
  echo
  echo "-- pnpm --filter urai-tier1 build --"
  pnpm --filter urai-tier1 build || true
else
  echo "pnpm not found; skipping"
fi
echo

echo "=== 6) OUTPUT ==="
echo "Audit:  $AUDIT"
echo "Backup: $BACKUP/src/spatial/scene/SpatialScene.tsx"
echo "Log:    $LOG"
echo
echo "Next input to use for the surgical patch pass:"
echo "  $AUDIT/02_star_model_and_makeStars.tsx"
echo "  $AUDIT/03_runtime_and_camera_block.tsx"
echo "  $AUDIT/04_ground_home_block.tsx"
echo "  $AUDIT/05_star_render_block.tsx"
