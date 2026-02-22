'use client';

import { useRouter } from 'next/navigation';
import { Mesh } from 'three';
import { useMemo } from 'react';

interface StarData {
  id: number;
  position: [number, number, number];
}

export default function Starfield() {
  const router = useRouter();

  const stars: StarData[] = useMemo(() => {
    return Array.from({ length: 30 }).map((_, index) => ({
      id: index,
      position: [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 20,
      ],
    }));
  }, []);

  return (
    <>
      {stars.map((star) => (
        <mesh
          key={star.id}
          position={star.position}
          onClick={() => router.push('/replay/1')}
        >
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" />
        </mesh>
      ))}
    </>
  );
}
