'use client';

import { XR, VRButton } from '@react-three/xr';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';

const Star = ({ position }: { position: [number, number, number] }) => (
  <mesh position={position}>
    <sphereGeometry args={[0.1, 16, 16]} />
    <meshBasicMaterial color="white" />
  </mesh>
);

export default function LifeMapPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'black' }}>
      <VRButton />
      <Canvas>
        <Suspense fallback={null}>
          <XR>
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <Star position={[-1, 0, -5]} />
            <Star position={[1, 0, -5]} />
            <Star position={[0, 1, -5]} />
          </XR>
        </Suspense>
      </Canvas>
    </div>
  );
}
