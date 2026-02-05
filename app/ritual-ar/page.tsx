'use client';

import { XR, ARButton } from '@react-three/xr';
import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';

const Box = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <mesh
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshBasicMaterial color={isHovered ? 'hotpink' : 'white'} />
    </mesh>
  );
};

export default function RitualARPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'black' }}>
      <ARButton />
      <Canvas>
        <Suspense fallback={null}>
          <XR>
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <Box />
          </XR>
        </Suspense>
      </Canvas>
    </div>
  );
}
