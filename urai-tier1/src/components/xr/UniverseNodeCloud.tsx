"use client";

import { useState } from "react";

export default function UniverseNodeCloud({ state, onSelect }: any) {
  const count = Math.max(3, state?.events ?? 5);
  const [hovered, setHovered] = useState<string | null>(null);

  const nodes = Array.from({ length: count }).map((_, i) => {
    const angle = (i / count) * Math.PI * 2;

    return {
      id: `node-${i}`,
      position: [
        Math.cos(angle) * 2,
        ((i % 5) - 2) * 0.4,
        Math.sin(angle) * 2
      ] as [number, number, number]
    };
  });

  return (
    <group>
      {nodes.map((node, i) => (
        <mesh
          key={node.id}
          position={node.position}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(node);
          }}
          onPointerOver={() => setHovered(node.id)}
          onPointerOut={() => setHovered(null)}
          scale={hovered === node.id ? 1.4 : 1}
        >
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={hovered === node.id ? "orange" : "white"} />
        </mesh>
      ))}
    </group>
  );
}
