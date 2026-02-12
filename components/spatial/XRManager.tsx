'use client';

import { XR, VRButton } from '@react-three/xr';
import { Canvas } from '@react-three/fiber';

/**
 * A dedicated manager for handling the WebXR session, providing a stable
 * entry and exit point for the immersive experience.
 */
export function XRManager({ children }: { children: React.ReactNode }) {
  return (
    <>
      <VRButton />
      <Canvas style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <XR>
          {children}
        </XR>
      </Canvas>
    </>
  );
}
