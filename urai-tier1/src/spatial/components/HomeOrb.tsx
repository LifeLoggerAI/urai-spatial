'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

type HomeOrbProps = {
  position?: [number, number, number];
  dim?: number;
  interactive?: boolean;
  onSelect?: () => void;
};

export default function HomeOrb({
  position = [0, 2.9, -2.4],
  dim = 0,
  interactive = true,
  onSelect,
}: HomeOrbProps) {
  const rootRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 1.45) * 0.035;
    const haloPulse = 1 + Math.sin(t * 1.2) * 0.06;

    if (rootRef.current) {
      rootRef.current.position.y = position[1] + Math.sin(t * 0.85) * 0.045;
    }

    if (haloRef.current) {
      haloRef.current.scale.setScalar(haloPulse);
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 * (1 - dim) + (Math.sin(t * 1.2) * 0.02 + 0.02);
    }
  });

  return (
    <group ref={rootRef} position={position}>
      <pointLight color="#dbe9ff" intensity={2.2 * (1 - dim * 0.65)} distance={22} decay={1.6} />

      <mesh
        castShadow
        receiveShadow={false}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (interactive) onSelect?.();
        }}
      >
        <sphereGeometry args={[0.62, 48, 48]} />
        <meshStandardMaterial
          color="#f5fbff"
          emissive="#d7ebff"
          emissiveIntensity={1.35 * (1 - dim * 0.55)}
          roughness={0.08}
          metalness={0}
        />
      </mesh>

      <mesh ref={haloRef}>
        <sphereGeometry args={[1.42, 40, 40]} />
        <meshBasicMaterial
          color="#7fa7ff"
          transparent
          opacity={0.2 * (1 - dim * 0.45)}
          depthWrite={false}
        />
      </mesh>

      {phase === "HOME" && (
)}
    </group>
  );
}
