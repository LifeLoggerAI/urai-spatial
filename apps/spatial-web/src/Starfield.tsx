'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

const Starfield = () => {
  const stars = useMemo(() => {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * 600 - 300;
      const y = Math.random() * 600 - 300;
      const z = Math.random() * 600 - 300;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    return starGeo;
  }, []);

  return (
    <points geometry={stars}>
      <pointsMaterial color="white" size={0.7} sizeAttenuation />
    </points>
  );
};

export default Starfield;
