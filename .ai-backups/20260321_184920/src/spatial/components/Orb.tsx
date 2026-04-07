"use client";

import { useMemo, useRef, useState } from "react";
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
  const haloTightRef = useRef<THREE.Mesh>(null);
  const haloWideRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const lureRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const shellGeo = useMemo(() => new THREE.SphereGeometry(0.94, 64, 64), []);
  const coreGeo = useMemo(() => new THREE.SphereGeometry(0.56, 40, 40), []);
  const haloTightGeo = useMemo(() => new THREE.SphereGeometry(1.22, 32, 32), []);
  const haloWideGeo = useMemo(() => new THREE.SphereGeometry(1.72, 24, 24), []);
  const ringGeo = useMemo(() => new THREE.TorusGeometry(1.18, 0.025, 16, 100), []);
  const lureOrbit = 1.3;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const hoverBoost = hovered ? 1 : 0;
    const activeBoost = active ? 1 : 0;
    const breath = 1 + Math.sin(t * 1.12) * 0.024 + activeBoost * 0.018 + hoverBoost * 0.03;

    if (rootRef.current) {
      rootRef.current.scale.setScalar(breath);
      rootRef.current.rotation.y = t * 0.085;
    }

    if (shellRef.current) {
      const m = shellRef.current.material as THREE.MeshPhysicalMaterial;
      m.emissiveIntensity = 5.6 + activeBoost * 0.8 + hoverBoost * 1.2 + Math.sin(t * 1.4) * 0.16;
    }

    if (coreRef.current) {
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.17 + hoverBoost * 0.06 + Math.sin(t * 1.5) * 0.025;
      coreRef.current.position.y = Math.sin(t * 1.1) * 0.018;
      const innerScale = 1 + Math.sin(t * 1.2 + 0.7) * 0.018;
      coreRef.current.scale.setScalar(innerScale);
    }

    if (haloTightRef.current) {
      const m = haloTightRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.13 + hoverBoost * 0.05 + activeBoost * 0.02 + Math.sin(t * 0.9) * 0.012;
    }

    if (haloWideRef.current) {
      const m = haloWideRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.05 + hoverBoost * 0.025 + Math.sin(t * 0.75) * 0.008;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = Math.sin(t * 0.42) * 0.045;
      ringRef.current.rotation.y = t * 0.12;
    }

    if (lureRef.current) {
      lureRef.current.position.set(
        Math.cos(t * 0.82) * lureOrbit,
        0.08 + Math.sin(t * 1.45) * 0.065,
        Math.sin(t * 0.82) * lureOrbit
      );
      const m = lureRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.34 + hoverBoost * 0.16 + Math.sin(t * 1.9) * 0.08;
    }
  });

  return (
    <group
      ref={rootRef}
      position={[-0.52, 1.05, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive && onClick) onClick();
      }}
    >
      <mesh ref={haloWideRef}>
        <primitive object={haloWideGeo} attach="geometry" />
        <meshBasicMaterial color="#2c72ff" transparent opacity={0.05} depthWrite={false} />
      </mesh>

      <mesh ref={haloTightRef}>
        <primitive object={haloTightGeo} attach="geometry" />
        <meshBasicMaterial color="#73d2ff" transparent opacity={0.13} depthWrite={false} />
      </mesh>

      <mesh ref={shellRef} castShadow receiveShadow>
        <primitive object={shellGeo} attach="geometry" />
        <meshPhysicalMaterial
          color="#eef5ff"
          roughness={0.1}
          metalness={0.16}
          clearcoat={1}
          clearcoatRoughness={0.04}
          transmission={0.08}
          thickness={0.5}
          ior={1.16}
          emissive="#6fc9ff"
          emissiveIntensity={5.8}
        />
      </mesh>

      <mesh ref={coreRef}>
        <primitive object={coreGeo} attach="geometry" />
        <meshBasicMaterial color="#fffaf0" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <mesh ref={ringRef} rotation={[Math.PI / 2, 0.22, 0]} position={[0.3, -0.54, 0.06]}>
        <primitive object={ringGeo} attach="geometry" />
        <meshBasicMaterial color="#86c4ff" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <mesh ref={lureRef} scale={0.055}>
        <sphereGeometry args={[1, 18, 18]} />
        <meshBasicMaterial color="#d8f3ff" transparent opacity={0.36} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default Orb;
