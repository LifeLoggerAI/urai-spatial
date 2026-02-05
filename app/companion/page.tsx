'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import { OrbitControls, Sphere } from '@react-three/drei';

const CompanionOrb = () => {
  const ref = useRef<any>();

  return (
    <Sphere ref={ref} args={[0.5, 32, 32]}>
      <meshStandardMaterial color="lightblue" emissive="cyan" />
    </Sphere>
  );
};

export default function CompanionPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'black' }}>
      <Canvas>
        <Suspense fallback={null}>
          <ambientLight />
          <pointLight position={[10, 10, 10]} />
          <CompanionOrb />
          <OrbitControls />
        </Suspense>
      </Canvas>
    </div>
  );
}
