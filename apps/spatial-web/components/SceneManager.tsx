
'use client';

import { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';

interface SceneManagerProps {
  children: ReactNode;
}

export default function SceneManager({ children }: SceneManagerProps) {
  return (
    <Canvas shadows>
      <PerspectiveCamera makeDefault position={[0, 2, 8]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      {children}
    </Canvas>
  );
}
