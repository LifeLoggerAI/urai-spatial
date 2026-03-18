#!/usr/bin/env bash
set -euo pipefail

APP="$(pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
AUD="$APP/_audit/tier1-scene-rebuild/$TS"
mkdir -p "$AUD"

cp src/spatial/scene/SpatialScene.tsx "$AUD/scene.before.tsx" || true

echo "Rebuilding visible starfield..."

cat > src/spatial/scene/SpatialScene.tsx <<'EOT'
"use client";

import { Canvas } from "@react-three/fiber";

function Stars() {
  const stars = [];

  for (let i = 0; i < 200; i++) {
    const x = (Math.random() - 0.5) * 10;
    const y = (Math.random() - 0.5) * 10;
    const z = (Math.random() - 0.5) * 10;

    stars.push(
      <mesh key={i} position={[x, y, z]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="white" />
      </mesh>
    );
  }

  return <>{stars}</>;
}

export default function SpatialScene() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        
        <ambientLight intensity={1.2} />

        <Stars />

      </Canvas>

      <div style={{
        position: "absolute",
        top: 10,
        left: 10,
        color: "white",
        fontSize: 12
      }}>
        Tier1: Starfield Active
      </div>
    </div>
  );
}
EOT

pnpm build | tee "$AUD/build.log"

echo "DONE → $AUD"
