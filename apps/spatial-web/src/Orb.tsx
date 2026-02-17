''''use client';

import * as THREE from 'three';
import React, { useRef } from 'react';
import { Sphere } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useSceneStore } from './engine/useSceneStore';

export default function Orb() {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
  const { rhythmState, mentalLoad } = useSceneStore();

  const colorMap = {
    stable: new THREE.Color("#aee7ff"),
    off: new THREE.Color("#facc15"),
    overstimulated: new THREE.Color("#f87171"),
  };

  useFrame(() => {
    if (materialRef.current) {
        materialRef.current.color.lerp(colorMap[rhythmState], 0.1);
        materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(materialRef.current.emissiveIntensity, mentalLoad, 0.1);
    }
  });

  return (
    <Sphere args={[1.25, 128, 128]}>
        <meshStandardMaterial
            ref={materialRef}
            color="#aee7ff"
            emissive="#6a3cff"
            emissiveIntensity={1.2}
            metalness={0.1}
            roughness={0.2}
        />
    </Sphere>
  );
}
'''