'use client';

import React from 'react';

/**
 * Ground is the physical layer of URAI Spatial.
 * It represents lived reality: stability, presence, places, routines,
 * relationships, and the current moment.
 */
export function Ground() {
  return (
    <group name="urai-ground-world" userData={{
      spatialLayer: 'ground',
      worldMeaning: 'lived-reality',
      contract: 'urai-spatial-world-contract-v1',
    }}>
      <mesh position={[0, -22, 0]} receiveShadow>
        <sphereGeometry args={[22, 64, 64]} />
        <meshStandardMaterial
          color="#172a24"
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>

      <mesh position={[0, -21.8, 0]} receiveShadow>
        <ringGeometry args={[4, 16, 128]} />
        <meshStandardMaterial
          color="#7dd3fc"
          emissive="#0ea5e9"
          emissiveIntensity={0.08}
          transparent
          opacity={0.18}
        />
      </mesh>
    </group>
  );
}

export default Ground;
