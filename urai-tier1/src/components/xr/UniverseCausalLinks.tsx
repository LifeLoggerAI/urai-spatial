"use client";

import * as THREE from "three";
import { useMemo } from "react";

export default function UniverseCausalLinks({ state }: any) {
  const geometry = useMemo(() => {
    const count = Math.max(3, state?.events ?? 5);

    const positions: number[] = [];

    const nodes = Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      return [
        Math.cos(angle) * 2,
        ((i % 5) - 2) * 0.4,
        Math.sin(angle) * 2
      ];
    });

    const edges: number[][] = [];

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const b = nodes[(i + 1) % nodes.length];
      const c = nodes[(i + 2) % nodes.length];

      edges.push([...a, ...b]);
      edges.push([...a, ...c]);
    }

    edges.forEach((e) => positions.push(...e));

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    return geom;
  }, [state]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#66ccff" opacity={0.6} transparent />
    </lineSegments>
  );
}
