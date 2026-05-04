"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type OrbProps = {
  interactive?: boolean;
  active?: boolean;
  busy?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
  onFocus?: () => void;
};

export default function Orb({ interactive = true, active = false, busy = false, disabled = false, onClick, onFocus }: OrbProps) {
  const rootRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const haloARef = useRef<THREE.Mesh>(null);
  const haloBRef = useRef<THREE.Mesh>(null);
  const lureRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const shellGeo = useMemo(() => new THREE.SphereGeometry(0.94, 64, 64), []);
  const coreGeo = useMemo(() => new THREE.SphereGeometry(0.52, 32, 32), []);
  const haloAGeo = useMemo(() => new THREE.SphereGeometry(1.2, 24, 24), []);
  const haloBGeo = useMemo(() => new THREE.SphereGeometry(1.68, 20, 20), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const canInteract = interactive && !disabled && !busy;
    const hoverBoost = hovered && canInteract ? 1 : 0;
    const boost = (active ? 1 : 0) + hoverBoost;
    const pulse = 1 + Math.sin(t * 1.15) * 0.025 + boost * 0.015;

    if (rootRef.current) {
      rootRef.current.scale.setScalar(pulse);
      rootRef.current.rotation.y = t * 0.08;
    }

    if (shellRef.current) {
      const m = shellRef.current.material as THREE.MeshPhysicalMaterial;
      const emissiveMode = disabled ? 3 : busy ? 7 : 5.2 + boost * 1.2;
      m.emissiveIntensity = emissiveMode;
    }

    if (coreRef.current) {
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.16 + Math.sin(t * 1.4) * 0.03 + boost * 0.03;
    }

    if (haloARef.current) {
      const m = haloARef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.12 + Math.sin(t * 0.9) * 0.01 + boost * 0.03;
    }

    if (haloBRef.current) {
      const m = haloBRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.045 + Math.sin(t * 0.7) * 0.008 + boost * 0.015;
    }

    if (lureRef.current) {
      lureRef.current.position.set(
        Math.cos(t * 0.85) * 1.28,
        0.08 + Math.sin(t * 1.4) * 0.05,
        Math.sin(t * 0.85) * 1.28
      );
    }
  });

  return (
    <group
      ref={rootRef}
      position={[-0.52, 1.05, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!interactive || disabled || busy) return;
        setHovered(true);
        onFocus?.();
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive && !disabled && !busy && onClick) onClick();
      }}
      userData={{ ariaLabel }}
    >
      <mesh ref={haloBRef}>
        <primitive object={haloBGeo} attach="geometry" />
        <meshBasicMaterial color="#2d75ff" transparent opacity={0.045} depthWrite={false} />
      </mesh>

      <mesh ref={haloARef}>
        <primitive object={haloAGeo} attach="geometry" />
        <meshBasicMaterial color="#72d4ff" transparent opacity={0.12} depthWrite={false} />
      </mesh>

      <mesh ref={shellRef} castShadow receiveShadow>
        <primitive object={shellGeo} attach="geometry" />
        <meshPhysicalMaterial
          color="#eef5ff"
          emissive="#70cfff"
          emissiveIntensity={5.4}
          roughness={0.1}
          metalness={0.14}
          clearcoat={1}
          clearcoatRoughness={0.04}
          transmission={0.08}
          thickness={0.48}
          ior={1.16}
        />
      </mesh>

      <mesh ref={coreRef}>
        <primitive object={coreGeo} attach="geometry" />
        <meshBasicMaterial color="#fffaf2" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <mesh ref={lureRef} scale={0.05}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#d7f4ff" transparent opacity={0.34} depthWrite={false} />
      </mesh>
    </group>
  );
}
