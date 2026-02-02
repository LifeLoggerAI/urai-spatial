'use client';

import { Sphere } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

export default function NebulaDome() {
  const texture = useLoader(THREE.TextureLoader, 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/milkyway.jpg');
  return (
    <Sphere args={[200, 32, 32]}>
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </Sphere>
  );
}
