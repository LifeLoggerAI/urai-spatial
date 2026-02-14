
'use client';

import { XR, VRButton, ARButton } from '@react-three/xr';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Stars } from '@react-three/drei';

/**
 * The single, unified spatial scene for the entire URAI-SPATIAL experience.
 * This component initializes the main Three.js canvas and the XR controllers.
 * All other spatial components will be rendered as children of this scene.
 */
export function StarWorld() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'black' }}>
      <VRButton />
      <ARButton />
      <Canvas>
        <Suspense fallback={null}>
          <XR>
            {/* Base lighting for the entire world */}
            <ambientLight intensity={0.2} />
            <pointLight position={[100, 100, 100]} intensity={0.5} />

            {/* A default starfield, to be replaced by the procedural system */}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />

            {/* All future spatial content will be rendered here */}
            {/* e.g., <LifeMapManager />, <StorytimeManager />, etc. */}
          </XR>
        </Suspense>
      </Canvas>
    </div>
  );
}
