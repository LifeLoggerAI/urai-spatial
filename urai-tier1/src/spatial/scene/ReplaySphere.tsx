"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function ReplaySphere({ starId }: { starId: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y += 0.004;
    ref.current.position.y = 1.2 + Math.sin(t * 0.8) * 0.06;
  });

  return (
    <group position={[0, 1.2, -3.6]}>
      <mesh ref={ref}>
        <sphereGeometry args={[1.1, 48, 48]} />
        <meshPhysicalMaterial
          color="#dfe9ff"
          emissive="#8aa4ff"
          emissiveIntensity={0.55}
          roughness={0.08}
          metalness={0.02}
          clearcoat={1}
          clearcoatRoughness={0.06}
          transmission={0.04}
        />
      </mesh>

      <mesh scale={[1.9, 1.9, 1.9]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#89a6ff" transparent opacity={0.11} depthWrite={false} />
      </mesh>

      <mesh position={[0, -1.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.8, 64]} />
        <meshBasicMaterial color="#1b2a5f" transparent opacity={0.22} />
      </mesh>
    </group>
  );
}
