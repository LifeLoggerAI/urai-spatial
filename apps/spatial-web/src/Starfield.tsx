'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

export default function Starfield() {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.002;
    }
  });

  return (
    <group ref={ref}>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
    </group>
  );
}
