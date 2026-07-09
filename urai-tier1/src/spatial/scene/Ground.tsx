'use client';

import React from 'react';
import { createExampleLifeAnchors } from '../ground/groundAnchorFactory';

const anchors = createExampleLifeAnchors();

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
      anchorContract: 'urai-ground-life-anchors-v1',
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

      {anchors.map((anchor, index) => (
        <group
          key={anchor.id}
          name={`ground-anchor-${anchor.id}`}
          position={anchor.position}
          userData={{
            id: anchor.id,
            kind: anchor.kind,
            title: anchor.title,
            vitality: anchor.vitality,
            worldRole: anchor.worldRole,
          }}
        >
          <mesh position={[0, -20.6, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.42 + anchor.vitality * 0.24, 0.72 + anchor.vitality * 0.32, 0.46, 32]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? '#86efac' : '#7dd3fc'}
              emissive={index % 2 === 0 ? '#14532d' : '#0e7490'}
              emissiveIntensity={0.12 + anchor.vitality * 0.12}
              roughness={0.82}
              metalness={0.04}
            />
          </mesh>
          <mesh position={[0, -20.22, 0]}>
            <sphereGeometry args={[0.34 + anchor.vitality * 0.18, 24, 24]} />
            <meshStandardMaterial
              color="#e0f2fe"
              emissive="#38bdf8"
              emissiveIntensity={0.16 + anchor.vitality * 0.18}
              transparent
              opacity={0.88}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default Ground;
