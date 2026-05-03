"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRef } from "react";

export default function ReplayShell({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (active) {
      // Animate shell closing around camera
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);
    } else {
      // Expand shell outward when leaving
      meshRef.current.scale.lerp(new THREE.Vector3(6, 6, 6), 0.12);
    }
  });

  return (
    <mesh ref={meshRef} scale={[6, 6, 6]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial
        color="#020611"
        side={THREE.BackSide}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}
