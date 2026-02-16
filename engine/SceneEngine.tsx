import { OrbitControls, Stars } from '@react-three/drei';
import React from 'react';

export const SceneEngine = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <OrbitControls />
      <Stars />
      {children}
    </>
  );
};
