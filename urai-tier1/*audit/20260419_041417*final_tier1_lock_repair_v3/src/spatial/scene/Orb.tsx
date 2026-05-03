'use client';

import React from 'react';

export type OrbProps = {
  position?: [number, number, number];
  opacity?: number;
  haloOpacity?: number;
  scale?: number;
  onClick?: () => void;
};

export default function Orb({
  position = [0, 1.02, 0],
  opacity = 1,
  haloOpacity = 1,
  scale = 1,
  onClick,
}: OrbProps) {
  return (
    <group position={position} scale={scale}>
      {/* CANON_HOME_ORB_ANCHOR */}
      <mesh onClick={onClick}>
        <sphereGeometry args={[0.80, 48, 48]} />
        <meshStandardMaterial
          color="#dfe7fb"
          emissive="#dfe7fb"
          emissiveIntensity={0.10}
          roughness={0.24}
          metalness={0.02}
          transparent
          opacity={opacity}
        />
      </mesh>

      <mesh scale={1.35}>
        <sphereGeometry args={[0.80, 24, 24]} />
        <meshBasicMaterial color="#6f88ff" transparent opacity={0.020 * haloOpacity} depthWrite={false} />
      </mesh>

      <mesh scale={2.05}>
        <sphereGeometry args={[0.80, 24, 24]} />
        <meshBasicMaterial color="#728eff" transparent opacity={0.008 * haloOpacity} depthWrite={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.88, 0]} scale={[1.28, 0.72, 1]}>
        <circleGeometry args={[1.0, 48]} />
        <meshBasicMaterial color="#061328" transparent opacity={0.36 * opacity} depthWrite={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.87, 0]} scale={[1.72, 0.78, 1]}>
        <ringGeometry args={[0.72, 1.18, 64]} />
        <meshBasicMaterial color="#234792" transparent opacity={0.05 * opacity} depthWrite={false} />
      </mesh>
    </group>
  );
}
