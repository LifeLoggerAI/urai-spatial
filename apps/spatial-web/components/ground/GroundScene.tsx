'use client';

import { Canvas } from '@react-three/fiber';
import GroundObjects from './GroundObjects';

export default function GroundScene() {
  return (
    <>
      <Canvas shadows camera={{ position: [0, 5.5, 11], fov: 42 }}>
        <fog attach="fog" args={['#0d0d0d', 15, 40]} />
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1}
          castShadow
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#111111" roughness={1} metalness={0} />
        </mesh>
        <GroundObjects />
      </Canvas>
    </>
  );
}
