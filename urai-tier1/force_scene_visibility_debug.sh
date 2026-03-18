#!/usr/bin/env bash
set -euo pipefail

APP="$(pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
AUD="$APP/_audit/tier1-hard-visibility/$TS"
mkdir -p "$AUD"

cp src/spatial/scene/SpatialScene.tsx "$AUD/scene.before.tsx" || true

echo "Injecting guaranteed visible scene..."

cat > src/spatial/scene/SpatialScene.tsx <<'EOT'
"use client";

import { Canvas } from "@react-three/fiber";

export default function SpatialScene() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        
        <ambientLight intensity={1.5} />
        <pointLight position={[5, 5, 5]} />

        {/* GUARANTEED VISIBLE OBJECT */}
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="hotpink" />
        </mesh>

      </Canvas>

      <div style={{
        position: "absolute",
        top: 10,
        left: 10,
        color: "white",
        fontSize: 12
      }}>
        DEBUG: SCENE ACTIVE
      </div>
    </div>
  );
}
EOT

pnpm build | tee "$AUD/build.log"

echo "DONE → $AUD"
