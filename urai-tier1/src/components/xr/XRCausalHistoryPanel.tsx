"use client";

import { Text } from "@react-three/drei";

export default function XRCausalHistoryPanel({ edge, state }: any) {
  if (!edge) return null;

  // lightweight synthetic history trace (placeholder for event-sourced replay)
  const history = Array.from({ length: Math.min(5, state?.events ?? 3) }).map(
    (_, i) => ({
      id: `event-${i}`,
      desc: `transition ${edge.from} → ${edge.to} @ t-${i}`
    })
  );

  return (
    <group position={[0, -2.2, 0]}>
      <mesh>
        <planeGeometry args={[5, 2.2]} />
        <meshStandardMaterial transparent opacity={0.25} />
      </mesh>

      <Text position={[-2.2, 0.8, 0.1]} fontSize={0.18}>
        CAUSAL HISTORY
      </Text>

      {history.map((h, i) => (
        <Text key={h.id} position={[-2.2, 0.4 - i * 0.35, 0.1]} fontSize={0.14}>
          {h.desc}
        </Text>
      ))}
    </group>
  );
}
