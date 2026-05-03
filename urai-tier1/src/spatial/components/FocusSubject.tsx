"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

type Props = {
  visible?: boolean;
  starId?: string;
  position?: [number, number, number];
  onEnterReplay?: () => void;
  interactive?: boolean;
};

export default function FocusSubject({ visible = false, position = [0, 0, -18], onEnterReplay, interactive = false }: Props) {
  const auraRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 1.1) * 0.06;
    if (auraRef.current) auraRef.current.scale.setScalar(2.1 * pulse);
    if (coreRef.current) coreRef.current.position.y = Math.sin(t * 0.7) * 0.08;
  });

  if (!visible) return null;

  return (
    <group position={position}>
      <mesh ref={auraRef} renderOrder={45}>
        <icosahedronGeometry args={[1.5, 5]} />
        <meshBasicMaterial color="#7fd9ff" transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh
        ref={coreRef}
        renderOrder={50}
        onPointerDown={interactive ? () => onEnterReplay?.() : undefined}
      >
        <dodecahedronGeometry args={[0.75, 1]} />
        <meshStandardMaterial color="#b8f4ff" emissive="#7fd9ff" emissiveIntensity={0.9} metalness={0.4} roughness={0.18} />
      </mesh>
      <pointLight color="#7fd9ff" intensity={2.2} distance={16} />
    </group>
  );
}
