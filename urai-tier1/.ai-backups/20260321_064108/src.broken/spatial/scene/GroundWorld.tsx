"use client";

import { useMemo } from "react";

type SilhouetteProps = {
  x: number;
  z: number;
  h: number;
  w: number;
  y?: number;
};

function Silhouette({ x, z, h, w, y = h * 0.5 - 0.02 }: SilhouetteProps) {
  return (
    <group position={[x, y, z]}>
      <mesh>
        <capsuleGeometry args={[w, h, 6, 12]} />
        <meshStandardMaterial
          color="#0e1326"
          emissive="#0f1830"
          emissiveIntensity={0.08}
          transparent
          opacity={0.92}
        />
      </mesh>
    </group>
  );
}

export default function GroundWorld() {
  const silhouettes = useMemo(
    () => [
      { x: -2.8, z: -2.4, h: 1.8, w: 0.22 },
      { x: -1.7, z: -3.1, h: 2.2, w: 0.26 },
      { x: 2.3, z: -2.8, h: 2.0, w: 0.24 },
      { x: 3.1, z: -3.6, h: 2.5, w: 0.3 },
      { x: -3.8, z: -4.4, h: 2.8, w: 0.34 },
      { x: 1.1, z: -4.9, h: 3.1, w: 0.36 },
    ],
    []
  );

  return (
    <group name="GroundWorld">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[30, 30, 1, 1]} />
        <meshStandardMaterial
          color="#0b0f1a"
          emissive="#10172b"
          emissiveIntensity={0.12}
          roughness={0.98}
          metalness={0.02}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -2]}>
        <ringGeometry args={[0.9, 1.35, 64]} />
        <meshStandardMaterial
          color="#6f7cff"
          emissive="#7f89ff"
          emissiveIntensity={0.7}
          transparent
          opacity={0.3}
          toneMapped={false}
        />
      </mesh>

      {silhouettes.map((s, i) => (
        <Silhouette key={i} {...s} />
      ))}

      <mesh position={[0, 0.16, -2.2]}>
        <sphereGeometry args={[0.12, 18, 18]} />
        <meshStandardMaterial
          color="#bfd2ff"
          emissive="#96a9ff"
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
