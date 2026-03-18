#!/usr/bin/env bash
set -euo pipefail

APP="$(pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
AUD="$APP/_audit/tier1-visibility-fix/$TS"
mkdir -p "$AUD"

echo "Backing up..."
cp src/spatial/data/stars.ts "$AUD/stars.before.ts" 2>/dev/null || true
cp src/spatial/scene/SpatialScene.tsx "$AUD/scene.before.tsx" 2>/dev/null || true

echo "Patching stars (closer + brighter)..."

sed -i 's/ring = .*;/ring = 6 + chapterIndex * 2 + Math.random() * 2;/g' src/spatial/data/stars.ts 2>/dev/null || true
sed -i 's/size: .*,/size: 0.08,/g' src/spatial/data/stars.ts 2>/dev/null || true

echo "Injecting light + debug overlay..."

cat >> src/spatial/scene/SpatialScene.tsx <<'EOT'

// TEMP DEBUG VISIBILITY LAYER
function DebugOverlay() {
  return (
    <div style={{
      position: "absolute",
      top: 10,
      left: 10,
      color: "white",
      fontSize: 12,
      zIndex: 9999
    }}>
      Scene Active
    </div>
  );
}
EOT

echo "Ensure overlay render..."

sed -i 's/<Canvas>/<Canvas>\n<ambientLight intensity={1.2} />/g' src/spatial/scene/SpatialScene.tsx 2>/dev/null || true
sed -i 's/<\/Canvas>/<\/Canvas>\n<DebugOverlay \/>/g' src/spatial/scene/SpatialScene.tsx 2>/dev/null || true

echo "Build..."
pnpm build | tee "$AUD/build.log"

echo "DONE → $AUD"
