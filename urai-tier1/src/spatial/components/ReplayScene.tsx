"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Props = {
  visible?: boolean;
  opacity?: number;
  driftZ?: number;
  replayGroupScale?: number;
};

export default function ReplayScene({ visible = false, opacity = 1, replayGroupScale = 1.2 }: Props) {
  const ringRef = useRef<THREE.Mesh>(null);
  const shards = useMemo(() => Array.from({ length: 18 }, (_, i) => i), []);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z = clock.getElapsedTime() * 0.2;
  });

  if (!visible) return null;

  return (
    <group scale={replayGroupScale}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.5, 0.08, 16, 128]} />
        <meshBasicMaterial color="#b78cff" transparent opacity={0.5 * opacity} />
      </mesh>
      {shards.map((i) => {
        const a = (i / shards.length) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 4.6, Math.sin(i * 0.2) * 1.2, Math.sin(a) * 4.6]}>
            <octahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial color="#d8c6ff" emissive="#725cff" emissiveIntensity={0.6} transparent opacity={0.8 * opacity} />
          </mesh>
        );
      })}
      <pointLight color="#9c7dff" intensity={2.1} distance={26} />
    </group>
  );
}
