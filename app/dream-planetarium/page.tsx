'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Stars } from '@react-three/drei';

export default function DreamPlanetariumPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'black' }}>
      <Canvas>
        <Suspense fallback={null}>
          <ambientLight intensity={0.1} />
          <Stars />
        </Suspense>
      </Canvas>
    </div>
  );
}
