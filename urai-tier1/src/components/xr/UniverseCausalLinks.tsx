"use client";

import * as THREE from "three";
import { useMemo } from "react";

export default function UniverseCausalLinks({ state, onSelectEdge }: any) {
  const { geometry, edgesMeta } = useMemo(() => {
    const count = Math.max(3, state?.events ?? 5);

    const nodes = Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      return [
        Math.cos(angle) * 2,
        ((i % 5) - 2) * 0.4,
        Math.sin(angle) * 2
      ];
    });

    const positions: number[] = [];
    const edgesMeta: any[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const b = nodes[(i + 1) % nodes.length];
      const c = nodes[(i + 2) % nodes.length];

      const edges = [
        { from: i, to: (i + 1) % nodes.length, a, b },
        { from: i, to: (i + 2) % nodes.length, a, b: c }
      ];

      for (const e of edges) {
        positions.push(...e.a, ...e.b);

        const mid = [
          (e.a[0] + e.b[0]) / 2,
          (e.a[1] + e.b[1]) / 2,
          (e.a[2] + e.b[2]) / 2
        ];

        edgesMeta.push({
          id: `${e.from}-${e.to}`,
          from: e.from,
          to: e.to,
          midpoint: mid
        });
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    return { geometry: geom, edgesMeta };
  }, [state]);

  return (
    <group>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#66ccff" opacity={0.6} transparent />
      </lineSegments>

      {edgesMeta.map((e) => (
        <mesh
          key={e.id}
          position={e.midpoint as [number, number, number]}
          onClick={(ev) => {
            ev.stopPropagation();
            onSelectEdge?.(e);
          }}
        >
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial transparent opacity={0.0} />
        </mesh>
      ))}
    </group>
  );
}
