"use client";

import { Text } from "@react-three/drei";

export default function XRInspectorPanel({ selected }: any) {
  if (!selected) return null;

  const lines = [
    `ID: ${selected.id}`,
    `Type: NODE`,
    `Position: ${selected.position?.map((v: number) => v.toFixed(2)).join(", ")}`
  ];

  return (
    <group position={[3, 1.5, -2]}>
      <mesh>
        <planeGeometry args={[3.5, 2]} />
        <meshStandardMaterial transparent opacity={0.3} />
      </mesh>

      {lines.map((l: string, i: number) => (
        <Text key={i} position={[-1.5, 0.6 - i * 0.4, 0.1]} fontSize={0.16}>
          {l}
        </Text>
      ))}
    </group>
  );
}
