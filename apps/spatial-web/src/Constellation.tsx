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
          {/* 
            BEAUTY LOCK:
            - Using meshStandardMaterial to interact with the scene's lighting.
            - This creates a more cohesive and physically plausible look.
            - Removed distracting color changes for a more serene experience.
          */}
          <meshStandardMaterial 
            color="white" 
            transparent 
            opacity={memory.id === hoveredId || memory.id === proximateId ? 0.9 : 0.4}
            emissive="white"
            emissiveIntensity={memory.id === hoveredId ? 0.5 : 0}
          />
        </mesh>
      ))}
      {points.length > 1 && (
        <Line
          points={points}
          color="#4A5568" // A subtle, less distracting color
          lineWidth={0.5}
        />
      )}
    </group>
  );
};

export default Constellation;
