'use client';

import { useRouter } from 'next/navigation';
import { Mesh, Group } from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

interface StarData {
  id: number;
  position: [number, number, number];
}

export default function Starfield() {
  const router = useRouter();
  const groupRef = useRef<Group>(null);

  const stars: StarData[] = useMemo(() => {
    return Array.from({ length: 30 }).map((_, index) => ({
      id: index,
      position: [
        (Math.random() - 0.5) * 40, // Wider horizontal spread
        (Math.random() - 0.5) * 20, // Increased vertical spread
        (Math.random() - 0.5) * 400, // Greatly increased depth
      ],
    }));
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Add a slow, subtle drift to the entire starfield
      groupRef.current.position.z += delta * 0.2;
      // Reset the starfield position when it drifts too far
      if (groupRef.current.position.z > 20) {
        groupRef.current.position.z = -20;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {stars.map((star) => (
        <mesh
          key={star.id}
          position={star.position}
          onClick={() => router.push('/replay/1')}
        >
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}
