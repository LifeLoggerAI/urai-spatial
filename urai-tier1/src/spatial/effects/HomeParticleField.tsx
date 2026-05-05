"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "./seededRandom";

export default function HomeParticleField({ phase = "HOME" }: { phase?: string }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const rand = mulberry32(1337);
    const arr = new Float32Array(1200 * 3);

    for (let i = 0; i < 1200; i++) {
      arr[i * 3 + 0] = (rand() - 0.5) * 12;
      arr[i * 3 + 1] = (rand() - 0.5) * 8;
      arr[i * 3 + 2] = (rand() - 0.5) * 4;
    }

    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;

    const t = clock.elapsedTime;

    if (phase === "ASCENT") {
      pointsRef.current.position.z -= 0.05;
    } else {
      pointsRef.current.rotation.y = t * 0.05;
      pointsRef.current.rotation.x = t * 0.01;
    }
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
      <pointsMaterial size={0.035} color="#7dd3fc" />
    </points>
  );
}
