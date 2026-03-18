#!/usr/bin/env bash
set -euo pipefail

APP="$(pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
AUD="$APP/_audit/tier1-force-scene/$TS"
mkdir -p "$AUD"

echo "Backing up..."
cp src/app/page.tsx "$AUD/page.before.tsx" || true

echo "Forcing scene as home..."

cat > src/app/page.tsx <<'EOT'
"use client";

import dynamic from "next/dynamic";

const SpatialScene = dynamic(
  () => import("../spatial/scene/SpatialScene"),
  { ssr: false }
);

export default function Page() {
  return (
    <main style={{ width: "100vw", height: "100vh", margin: 0 }}>
      <SpatialScene />
    </main>
  );
}
EOT

echo "Disabling shell gate if exists..."

sed -i 's/Enter LifeMap//g' src/spatial/shell/*.tsx 2>/dev/null || true

echo "Build check..."
pnpm build | tee "$AUD/build.log"

echo "DONE. Audit at $AUD"
