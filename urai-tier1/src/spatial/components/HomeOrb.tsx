"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function HomeOrb({ onClick }: { onClick?: () => void }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;

    const s = 1 + Math.sin(t * 1.2) * 0.04;
    ref.current.scale.set(s, s, s);

    ref.current.position.y = Math.sin(t * 0.6) * 0.15;
  });

  return (
    <mesh ref={ref} onClick={onClick}>
      <sphereGeometry args={[1.2, 64, 64]} />
      <meshStandardMaterial
        color="#9b5cff"
        emissive="#6a3cff"
        emissiveIntensity={1.5}
      />
    </mesh>
  );
}
