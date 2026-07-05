"use client";

import { useMemo } from "react";

export default function XRGhostFutures({ state, history }: any) {
  const ghosts = useMemo(() => {
    const count = Math.min(6, history?.length || 3);

    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;

      // simple predictive drift model
      const intensity = (history?.length || 1) / 20;

      return {
        id: `ghost-${i}`,
        position: [
          Math.cos(angle) * (2.5 + intensity),
          Math.sin(i * 1.7) * 0.6,
          Math.sin(angle) * (2.5 + intensity)
        ] as [number, number, number],
        scale: 0.2 + intensity * 0.3
      };
    });
  }, [state, history]);

  return (
    <group>
      {ghosts.map((g) => (
        <mesh key={g.id} position={g.position} scale={g.scale}>
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
