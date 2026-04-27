"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";

export default function HomeOrb() {
  const groupRef = useRef<Group | null>(null);
  const coreRef = useRef<Mesh | null>(null);
  const glowRef = useRef<Mesh | null>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (groupRef.current) {
      // slightly closer + stronger float
      groupRef.current.position.y = 2.6 + Math.sin(t * 0.25) * 0.03;
    }

    if (coreRef.current) {
      const s = 1 + Math.sin(t * 0.6) * 0.01;
      coreRef.current.scale.setScalar(s);
    }

    if (glowRef.current) {
      const s = 1.05 + Math.sin(t * 0.3) * 0.015;
      glowRef.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={groupRef} position={[0, 2.6, -11]}>
      {/* glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.1, 48, 48]} />
        <meshBasicMaterial color="#7f9cff" transparent opacity={0.12} />
      </mesh>

      {/* core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.75, 48, 48]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
