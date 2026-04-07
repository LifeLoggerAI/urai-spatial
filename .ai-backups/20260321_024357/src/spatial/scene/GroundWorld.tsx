"use client";

import { useMemo } from "react";

export function GroundWorld() {
  const stones = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 2.6 + (i % 2) * 0.35;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          h: 0.18 + (i % 3) * 0.06,
          s: 0.26 + (i % 4) * 0.04
        };
      }),
    []
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.2, 64]} />
        <meshStandardMaterial color="#02040a" roughness={0.95} metalness={0.02} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]} receiveShadow>
        <circleGeometry args={[8.8, 64]} />
        <meshStandardMaterial color="#05123a" roughness={1} metalness={0} transparent opacity={0.42} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[4, 4]} />
        <shadowMaterial opacity={0.35} />
      </mesh>

      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, s.h / 2 - 0.02, s.z]} castShadow receiveShadow>
          <cylinderGeometry args={[s.s, s.s * 1.08, s.h, 8]} />
          <meshStandardMaterial color="#08111f" roughness={0.98} metalness={0.02} />
        </mesh>
      ))}
    </group>
  );
}

export default GroundWorld;
