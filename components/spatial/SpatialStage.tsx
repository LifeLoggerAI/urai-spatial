'use client';

import { Canvas } from '@react-three/fiber';
import { ReactNode } from 'react';

export default function SpatialStage({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'black' }}>
      <Canvas>
        {children}
      </Canvas>
    </div>
  );
}
