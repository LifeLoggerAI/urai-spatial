"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Orb({ onClick }: { onClick?: () => void }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scale = 1.08 + Math.sin(t * 1.4) * 0.06;
    if (ref.current) {
      ref.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh
      ref={ref}
      position={[-0.8, 1.2, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <sphereGeometry args={[1.1, 64, 64]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#5fd0ff"
        emissiveIntensity={10}
        roughness={0.08}
        metalness={0.2}
      />
    </mesh>
  );
}
