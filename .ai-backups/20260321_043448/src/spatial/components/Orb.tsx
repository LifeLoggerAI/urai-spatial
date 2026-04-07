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
  const haloOuterRef = useRef<THREE.Mesh>(null);
  const haloInnerRef = useRef<THREE.Mesh>(null);
  const lureRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(0.92, 56, 56), []);
  const haloInnerGeo = useMemo(() => new THREE.SphereGeometry(1.45, 32, 32), []);
  const haloOuterGeo = useMemo(() => new THREE.SphereGeometry(1.88, 24, 24), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const hoverBoost = hovered ? 1 : 0;
    const pulse = 1 + Math.sin(t * 1.18) * 0.028 + (active ? 0.03 : 0) + hoverBoost * 0.045;

    if (rootRef.current) {
      rootRef.current.scale.setScalar(pulse);
      rootRef.current.rotation.y = t * 0.11;
    }

    if (shellRef.current) {
      const m = shellRef.current.material as THREE.MeshPhysicalMaterial;
      m.emissiveIntensity = 6.8 + hoverBoost * 1.4 + Math.sin(t * 1.3) * 0.18;
    }

    if (haloInnerRef.current) {
      const m = haloInnerRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.1 + hoverBoost * 0.05 + Math.sin(t * 1.05) * 0.01;
    }

    if (haloOuterRef.current) {
      const m = haloOuterRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.045 + hoverBoost * 0.03 + Math.sin(t * 0.8) * 0.008;
    }

    }

    if (lureRef.current) {
      const r = 1.42;
      lureRef.current.position.set(
        Math.cos(t * 0.8) * r,
        0.12 + Math.sin(t * 1.2) * 0.07,
        Math.sin(t * 0.8) * r
      );
      const m = lureRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.38 + Math.sin(t * 2) * 0.1;
    }
  });

  return (
    <group
      ref={rootRef}
      position={[-0.18, 0.96, 0]}
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
      <mesh ref={haloOuterRef}>
        <primitive object={haloOuterGeo} attach="geometry" />
        <meshBasicMaterial color="#2f7dff" transparent opacity={0.05} depthWrite={false} />
      </mesh>

      <mesh ref={haloInnerRef}>
        <primitive object={haloInnerGeo} attach="geometry" />
        <meshBasicMaterial color="#6fd3ff" transparent opacity={0.11} depthWrite={false} />
      </mesh>

      <mesh ref={shellRef} castShadow receiveShadow>
        <primitive object={sphereGeo} attach="geometry" />
        <meshPhysicalMaterial
          color="#edf5ff"
          roughness={0.12}
          metalness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.04}
          transmission={0.1}
          thickness={0.55}
          emissive="#6abfff"
          emissiveIntensity={6.8}
        />
      </mesh>

      <mesh scale={0.34}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.22} depthWrite={false} />
      </mesh>

        <meshBasicMaterial color="#7bb8ff" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <mesh ref={lureRef} scale={0.06}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial color="#bfe8ff" transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default Orb;
