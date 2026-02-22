'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Group } from 'three';

export function WarpTunnel() {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.z += delta / 2;
    }
  });

  return (
    <group ref={group}>
      {Array.from({ length: 200 }).map((_, i) => {
        const angle = (i / 200) * Math.PI * 2;
        const radius = 3 + Math.random() * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <mesh key={i} position={[x, y, -i * 0.1]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial emissive="white" color="white" />
          </mesh>
        );
      })}
    </group>
  );
}
