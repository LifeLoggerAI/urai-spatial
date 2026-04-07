"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type OrbProps = {
  interactive?: boolean;
  active?: boolean;
  onClick?: () => void;
};

export function Orb({ interactive = true, active = false, onClick }: OrbProps) {
  const rootRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const ringGeo = useMemo(() => new THREE.TorusGeometry(1.45, 0.035, 16, 100), []);
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 48, 48), []);
  const haloGeo = useMemo(() => new THREE.SphereGeometry(1.8, 32, 32), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 1.2) * 0.03 + (active ? 0.04 : 0);
    if (rootRef.current) {
      rootRef.current.scale.setScalar(pulse);
      rootRef.current.rotation.y = t * 0.12;
    }
    if (shellRef.current) {
      const mat = shellRef.current.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = active ? 7.4 : 6.0;
    }
    if (haloRef.current) {
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = active ? 0.13 : 0.08;
    }
  });

  return (
    <group
      ref={rootRef}
      position={[0, 1.02, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive && onClick) onClick();
      }}
    >
      <mesh ref={haloRef}>
        <primitive object={haloGeo} attach="geometry" />
        <meshBasicMaterial color="#6fd3ff" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      <mesh ref={shellRef} castShadow receiveShadow>
        <primitive object={sphereGeo} attach="geometry" />
        <meshPhysicalMaterial
          color="#edf4ff"
          roughness={0.15}
          metalness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transmission={0.08}
          thickness={0.5}
          emissive="#5eb8ff"
          emissiveIntensity={6}
        />
      </mesh>

      <mesh ref={coreRef} scale={0.38}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.32} depthWrite={false} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.72, 0]}>
        <primitive object={ringGeo} attach="geometry" />
        <meshBasicMaterial color="#6da8ff" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default Orb;
