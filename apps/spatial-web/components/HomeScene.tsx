'use client';

import { useRouter } from 'next/navigation';
import { Mesh } from 'three';
import { useRef } from 'react';

export default function HomeScene() {
  const router = useRouter();
  const skyRef = useRef<Mesh>(null);
  const groundRef = useRef<Mesh>(null);

  return (
    <>
      <mesh
        ref={skyRef}
        position={[0, 4, -5]}
        onClick={() => router.push('/lifemap')}
      >
        <sphereGeometry args={[6, 64, 64]} />
        <meshStandardMaterial color="#0b1f3a" side={1} />
      </mesh>

      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -2, 0]}
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0a2e14" />
      </mesh>
    </>
  );
}
