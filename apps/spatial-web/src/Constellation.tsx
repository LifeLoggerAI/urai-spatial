'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Line, InstancedMesh, Instance } from '@react-three/drei';
import { Memory } from './lib/types';

/**
 * A performant constellation component that renders all stars using instancing.
 * This reduces the number of draw calls from N to a constant, locking performance at 60fps.
 */
const Constellation = ({ memories, hoveredId, proximateId }: { memories: Memory[], hoveredId: string | null, proximateId: string | null }) => {
  // Memoize the points for the constellation line.
  const points = useMemo(() => memories.map(m => new THREE.Vector3(m.transform.position.x, m.transform.position.y, m.transform.position.z)), [memories]);

  // Surgically separate memories into groups for instanced rendering.
  // This allows us to apply different materials for each state in a single draw call per state.
  const { normal, proximate, hovered } = useMemo(() => {
    const normal: Memory[] = [];
    const proximate: Memory[] = [];
    const hovered: Memory[] = [];

    memories.forEach(mem => {
      if (mem.id === hoveredId) {
        hovered.push(mem);
      } else if (mem.id === proximateId) {
        proximate.push(mem);
      } else {
        normal.push(mem);
      }
    });

    return { normal, proximate, hovered };
  }, [memories, hoveredId, proximateId]);

  return (
    <group>
      {/* Normal stars: rendered with a subtle opacity */}
      <InstancedMesh args={[undefined, undefined, normal.length]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="white" transparent opacity={0.4} />
        {normal.map(mem => <Instance key={mem.id} position={[mem.transform.position.x, mem.transform.position.y, mem.transform.position.z]} />)}
      </InstancedMesh>

      {/* Proximate stars: rendered with a higher opacity to indicate they are interactive */}
      <InstancedMesh args={[undefined, undefined, proximate.length]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="white" transparent opacity={0.9} />
        {proximate.map(mem => <Instance key={mem.id} position={[mem.transform.position.x, mem.transform.position.y, mem.transform.position.z]} />)}
      </InstancedMesh>

      {/* Hovered star: rendered with a bright, emissive material for clear feedback */}
      <InstancedMesh args={[undefined, undefined, hovered.length]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="white" transparent opacity={0.9} emissive="white" emissiveIntensity={0.5} />
        {hovered.map(mem => <Instance key={mem.id} position={[mem.transform.position.x, mem.transform.position.y, mem.transform.position.z]} />)}
      </InstancedMesh>

      {/* The connecting line for the constellation */}
      {points.length > 1 && (
        <Line
          points={points}
          color="#4A5568"
          lineWidth={0.5}
        />
      )}
    </group>
  );
};

export default Constellation;
