"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Orb({ onClick }: { onClick?: () => void }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scale = 1.05 + Math.sin(t * 1.2) * 0.05;
    if (ref.current) {
      ref.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh
      ref={ref}
      position={[-0.6, 1.1, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#4fc3ff"
        emissiveIntensity={8}
        roughness={0.1}
        metalness={0.2}
      />
    </mesh>
  );
}
