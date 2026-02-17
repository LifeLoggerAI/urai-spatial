'use client';

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { Memory } from './lib/types';
import { ThreeEvent, useFrame } from '@react-three/fiber';

const Constellation = ({ memories, hoveredId, proximateId, onClick }: { memories: Memory[], hoveredId: string | null, proximateId: string | null, onClick: (id: string) => void }) => {
  const points = useMemo(() => memories.map(m => new THREE.Vector3(m.position.x, m.position.y, m.position.z)), [memories]);
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const tempObject = new THREE.Object3D();
  const tempColor = new THREE.Color();

  useFrame(() => {
    if(!meshRef.current) return;
    
    memories.forEach((mem, i) => {
        const id = mem.id;
        let color = new THREE.Color('white');
        let scale = 0.05;

        if (id === hoveredId) {
            color = new THREE.Color('white').setScalar(1.2); // emissive-like
        } else if (id === proximateId) {
            color = new THREE.Color('white').setScalar(1.1);
        }

        // Update matrix
        tempObject.position.set(mem.position.x, mem.position.y, mem.position.z);
        tempObject.scale.set(scale, scale, scale);
        tempObject.updateMatrix();
        meshRef.current.setMatrixAt(i, tempObject.matrix);

        // Update color
        if (meshRef.current.instanceColor) {
          meshRef.current.setColorAt(i, color);
        }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });


  const handleStarClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const memory = memories[e.instanceId];
    if (memory) {
      onClick(memory.id);
    }
  }

  return (
    <group>
      <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, memories.length]}
        onPointerDown={handleStarClick}
      >
        <sphereGeometry args={[1, 16, 16]}>
            <instancedBufferAttribute attach="attributes-color" args={[new Float32Array(memories.length * 3), 3]} />
        </sphereGeometry>
        <meshStandardMaterial transparent opacity={0.8} vertexColors />
      </instancedMesh>

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
