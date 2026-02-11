'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { Memory } from './lib/types';

const Constellation = ({ memories, hoveredId, proximateId }: { memories: Memory[], hoveredId: string | null, proximateId: string | null }) => {
  const points = useMemo(() => memories.map(m => new THREE.Vector3(m.transform.position.x, m.transform.position.y, m.transform.position.z)), [memories]);

  return (
    <group>
      {memories.map(memory => (
        <mesh key={memory.id} position={[memory.transform.position.x, memory.transform.position.y, memory.transform.position.z]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial 
            color={memory.id === hoveredId ? 'lightblue' : (memory.id === proximateId ? 'lightyellow' : 'white')} 
            transparent 
            opacity={memory.id === hoveredId ? 1.0 : (memory.id === proximateId ? 0.8 : 0.5)}
          />
        </mesh>
      ))}
      {points.length > 1 && (
        <Line
          points={points}
          color="white"
          lineWidth={1}
          dashed={true}
          dashSize={0.2}
          gapSize={0.1}
        />
      )}
    </group>
  );
};

export default Constellation;
