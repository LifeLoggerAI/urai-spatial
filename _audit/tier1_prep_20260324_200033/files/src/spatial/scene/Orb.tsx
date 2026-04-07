"use client";

import * as THREE from "three";
import { Float } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";

export type OrbProps = {
  visible?: boolean;
  position?: [number, number, number];
  intensity?: number;
  orbScale?: number;
  opacity?: number;
};

export default function Orb({
  visible = true,
  position = [0, 0, 0],
  intensity = 1,
  orbScale = 1,
  opacity = 1,
}: OrbProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const coreColor = useMemo(() => new THREE.Color("#d8e2ff"), []);
  const shellColor = useMemo(() => new THREE.Color("#7da0ff"), []);
  const haloColor = useMemo(() => new THREE.Color("#4f6dff"), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (coreRef.current) {
      coreRef.current.rotation.y += 0.002;
      coreRef.current.rotation.x = Math.sin(t * 0.28) * 0.08;
      const s = 1 + Math.sin(t * 1.35) * 0.018;
      coreRef.current.scale.setScalar(s);
    }

    if (shellRef.current) {
      shellRef.current.rotation.y -= 0.0015;
      shellRef.current.rotation.z = Math.cos(t * 0.34) * 0.04;
      const s = 1.16 + Math.sin(t * 0.82) * 0.022;
      shellRef.current.scale.setScalar(s);
    }

    if (haloRef.current) {
      haloRef.current.rotation.z += 0.0012;
      const s = 1.42 + Math.sin(t * 0.64) * 0.025;
      haloRef.current.scale.setScalar(s);
    }
  });

  if (!visible) return null;

  return (
    <group position={position} scale={orbScale}>
      <Float speed={0.72} rotationIntensity={0.1} floatIntensity={0.32}>
        <mesh ref={haloRef}>
          <sphereGeometry args={[0.95, 40, 40]} />
          <meshBasicMaterial
            color={haloColor}
            transparent
            opacity={0.11 * intensity * opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <mesh ref={shellRef}>
          <sphereGeometry args={[0.72, 40, 40]} />
          <meshBasicMaterial
            color={shellColor}
            transparent
            opacity={0.18 * intensity * opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <mesh ref={coreRef}>
          <sphereGeometry args={[0.48, 48, 48]} />
          <meshStandardMaterial
            color={coreColor}
            emissive={coreColor}
            emissiveIntensity={1.9 * intensity}
            roughness={0.14}
            metalness={0.06}
            transparent
            opacity={0.95 * opacity}
          />
        </mesh>
      </Float>
    </group>
  );
}
