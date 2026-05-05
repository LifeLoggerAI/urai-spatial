"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "./seededRandom";

export default function HomeParticleField({
  phase = "HOME",
  audioLevel = 0,
}: {
  phase?: string;
  audioLevel?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const basePositionsRef = useRef<Float32Array | null>(null);

  const positions = useMemo(() => {
    const rand = mulberry32(1337);
    const arr = new Float32Array(1800 * 3);

    for (let i = 0; i < 1800; i++) {
      const radius = 1.5 + rand() * 7.5;
      const angle = rand() * Math.PI * 2;
      const depth = (rand() - 0.5) * 7;
      arr[i * 3 + 0] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = Math.sin(angle) * radius * 0.62 + (rand() - 0.5) * 1.6;
      arr[i * 3 + 2] = depth;
    }

    basePositionsRef.current = arr.slice();
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current || !basePositionsRef.current) return;

    const t = clock.elapsedTime;
    const geometry = pointsRef.current.geometry;
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const base = basePositionsRef.current;
    const rush = phase === "ASCENT" || phase === "LIFEMAP";

    for (let i = 0; i < position.count; i++) {
      const ix = i * 3;
      const bx = base[ix];
      const by = base[ix + 1];
      const bz = base[ix + 2];
      const distance = Math.max(0.001, Math.sqrt(bx * bx + by * by));
      const attraction = Math.sin(t * 0.8 + i * 0.017) * (0.05 + audioLevel * 0.12);

      if (rush) {
        position.array[ix] = bx * (1 + Math.sin(t * 0.9 + i) * 0.02);
        position.array[ix + 1] = by + ((t * (1.8 + audioLevel * 3) + i * 0.013) % 9) - 4.5;
        position.array[ix + 2] = ((bz + t * (9 + audioLevel * 14) + i * 0.003) % 8) - 4;
      } else {
        position.array[ix] = bx - (bx / distance) * attraction;
        position.array[ix + 1] = by - (by / distance) * attraction;
        position.array[ix + 2] = bz + Math.sin(t * 0.45 + i * 0.01) * 0.08;
      }
    }

    position.needsUpdate = true;
    pointsRef.current.rotation.y = t * (rush ? 0.18 : 0.045);
    pointsRef.current.rotation.x = Math.sin(t * 0.22) * 0.04;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={phase === "ASCENT" || phase === "LIFEMAP" ? 0.052 : 0.035}
        color="#7dd3fc"
        transparent
        opacity={0.9}
      />
    </points>
  );
}
