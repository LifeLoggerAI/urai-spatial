"use client";

import { useMemo } from "react";

export function GroundWorld() {
  const stones = useMemo(
    () => [
      { x: -2.2, z: -1.3, h: 0.18, s: 0.34 },
      { x: -1.3, z: -2.1, h: 0.16, s: 0.28 },
      { x: -0.3, z: -1.55, h: 0.14, s: 0.26 },
      { x: 1.2, z: -1.95, h: 0.18, s: 0.3 },
      { x: 2.05, z: -1.0, h: 0.16, s: 0.28 }
    ],
    []
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#02040a" roughness={0.98} metalness={0.01} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, -0.45]} receiveShadow>
        <meshStandardMaterial color="#030a1d" roughness={1} metalness={0} transparent opacity={0.26} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.15, 0.011, -0.2]}>
        <meshBasicMaterial color="#08162f" transparent opacity={0.14} depthWrite={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.35, 0.012, -0.1]}>
        <planeGeometry args={[3.3, 3.3]} />
        <shadowMaterial opacity={0.48} />
      </mesh>

      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, s.h / 2 - 0.02, s.z]} castShadow receiveShadow>
          <meshStandardMaterial color="#070d19" roughness={1} metalness={0.01} />
        </mesh>
      ))}
    </group>
  );
}

export default GroundWorld;
