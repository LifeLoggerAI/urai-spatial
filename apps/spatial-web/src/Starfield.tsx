"use client";

import { useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const tempObject = new THREE.Object3D();

function createStars(count: number, depth: number, spread: number) {
  return Array.from({ length: count }, () => ({
    position: [
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread,
      -Math.random() * depth
    ],
    scale: Math.random() * 0.3 + 0.1
  }));
}

export default function Starfield() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [warpPulse, setWarpPulse] = useState(0);

  const stars = useMemo(() => createStars(900, 120, 80), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    state.scene.rotation.y = t * 0.01;
  });

  return (
    <group>
      {stars.map((star, i) => (
        <mesh
          key={i}
          position={star.position as any}
          scale={hovered === i ? star.scale * 2 : star.scale}
          onPointerOver={() => setHovered(i)}
          onPointerOut={() => setHovered(null)}
          onClick={() => {
            setWarpPulse(1);
            setTimeout(() => setWarpPulse(0), 600);
          }}
        >
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshBasicMaterial
            color={hovered === i ? "#ffffff" : "#cccccc"}
          />
        </mesh>
      ))}
    </group>
  );
}
