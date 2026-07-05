"use client";

import { useMemo } from "react";

export default function XRGhostFutures({ state, history, onSelectGhost }: any) {
  const ghosts = useMemo(() => {
    const count = Math.min(6, history?.length || 3);

    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const intensity = (history?.length || 1) / 20;

      return {
        id: `ghost-${i}`,
        index: i,
        position: [
          Math.cos(angle) * (2.5 + intensity),
          Math.sin(i * 1.7) * 0.6,
          Math.sin(angle) * (2.5 + intensity)
        ],
        scale: 0.2 + intensity * 0.3
      };
    });
  }, [state, history]);

  return (
    <group>
      {ghosts.map((g) => (
        <mesh
          key={g.id}
          position={g.position as any}
          scale={g.scale}
          onClick={(e) => {
            e.stopPropagation();
            onSelectGhost?.(g);
          }}
        >
          <sphereGeometry args={[1, 12, 12]} />
          <meshStandardMaterial
            color="#7aa7ff"
            transparent
            opacity={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}