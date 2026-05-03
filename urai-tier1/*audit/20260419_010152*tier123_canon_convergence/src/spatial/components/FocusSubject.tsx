"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type FocusSubjectProps = {
  visible: boolean;
  interactive?: boolean;
  enteringReplay?: boolean;
  position?: [number, number, number];
  starId?: string | null;
  onEnterReplay?: (() => void) | null;
};

export default function FocusSubject({
  visible,
  interactive = false,
  enteringReplay = false,
  position = [0, 0, -20],
  onEnterReplay = null,
}: FocusSubjectProps) {
  const rootRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const pos = useMemo(() => new THREE.Vector3(position[0], position[1], position[2]), [position]);

  useFrame(({ clock }) => {
    if (!rootRef.current || !haloRef.current) return;
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 1.65) * 0.012;
    rootRef.current.scale.setScalar(enteringReplay ? 1.0 : pulse);
    haloRef.current.scale.setScalar(enteringReplay ? 1.0 : 1 + Math.sin(t * 1.65 + 0.6) * 0.018);
  });

  if (!visible) return null;

  return (
    <group ref={rootRef} position={pos}>
      <mesh onClick={interactive ? onEnterReplay ?? undefined : undefined}>
          <sphereGeometry args={[1.35, 48, 48]} />
        <meshStandardMaterial
          color="#d7e4ff"
          emissive="#8fb0ff"
            emissiveIntensity={2.2}
          roughness={0.18}
          metalness={0.04}
        />
      </mesh>

      <mesh ref={haloRef}>
          <sphereGeometry args={[3.4, 32, 32]} />
        <meshBasicMaterial
          color="#8fb0ff"
          transparent
            opacity={0.32}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
