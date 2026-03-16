#!/bin/bash

echo "Installing memory image layer..."

mkdir -p engine/scene

cat << 'COMP' > engine/scene/MemoryImage.tsx
"use client"

import { useLoader } from "@react-three/fiber"
import * as THREE from "three"

export default function MemoryImage({ position }) {

  if (!position) return null

  const texture = useLoader(THREE.TextureLoader, "/memory.jpg")

  return (
    <mesh position={[position[0], position[1], position[2] + 0.02]}>
      <planeGeometry args={[1.6,1.6]} />
      <meshBasicMaterial
        map={texture}
        transparent
      />
    </mesh>
  )
}
COMP

echo "Wiring MemoryImage into engine..."

sed -i '/MemorySphere/a import MemoryImage from "..\/scene\/MemoryImage"' engine/spine/EngineSpine.tsx

sed -i '/MemorySphere position/a \ \ \ \ {target && <MemoryImage position={target}/>}' engine/spine/EngineSpine.tsx

echo "Restarting dev server..."

pkill -f "next dev"
sleep 1
pnpm dev

echo "Memory image layer installed."
