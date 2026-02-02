'use client';

import { Canvas } from '@react-three/fiber';
import { XR, VRButton, ARButton } from '@react-three/xr';

export default function SpatialStage({ children, mode }: { children: React.ReactNode, mode: 'vr' | 'ar' | 'desktop' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'black' }}>
      {mode === 'vr' && <VRButton />}
      {mode === 'ar' && <ARButton />}
      <Canvas>
        <XR>
          {children}
        </XR>
      </Canvas>
    </div>
  );
}
