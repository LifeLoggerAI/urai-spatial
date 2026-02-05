'use client';

import { Points, PointMaterial } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

function createStarfield(seed: number, count = 5000) {
  const positions = new Float32Array(count * 3);
  const rng = (() => {
    let x = 123456789;
    let y = 362436069;
    let z = 521288629;
    let w = seed;
    return () => {
      let t = x ^ (x << 11);
      x = y;
      y = z;
      z = w;
      w = w ^ (w >> 19) ^ (t ^ (t >> 8));
      return (w >>> 0) / 0x100000000;
    };
  })();

  for (let i = 0; i < count; i++) {
    const r = 40 + rng() * 200;
    const theta = rng() * 2 * Math.PI;
    const phi = Math.acos(2 * rng() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

export default function Starfield({ seed }: { seed: number }) {
  const positions = useMemo(() => createStarfield(seed), [seed]);

  return (
    <Points positions={positions as any}>
      <PointMaterial transparent color="#ffffff" size={0.05} sizeAttenuation={true} depthWrite={false} />
    </Points>
  );
}
