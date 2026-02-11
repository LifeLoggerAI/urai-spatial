'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

// Seeded random function for deterministic star placement.
const seededRandom = (seed) => {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const Starfield = () => {
  const stars = useMemo(() => {
    const starGeo = new THREE.BufferGeometry();
    // BEAUTY LOCK: Reduced star count for a cleaner, more intentional background.
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    let seed = 0;

    for (let i = 0; i < starCount; i++) {
      // BEAUTY LOCK: Using a seeded random function for deterministic star placement.
      const x = seededRandom(seed++) * 600 - 300;
      const y = seededRandom(seed++) * 600 - 300;
      const z = seededRandom(seed++) * 600 - 300;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    return starGeo;
  }, []);

  return (
    <points geometry={stars}>
      {/* BEAUTY LOCK: Adjusted size for a more subtle effect. */}
      <pointsMaterial color="white" size={0.5} sizeAttenuation />
    </points>
  );
};

export default Starfield;
