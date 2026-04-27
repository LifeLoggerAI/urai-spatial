"use client";

import * as THREE from "three";

export function HomeVisualEngine({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <group name="URAI_HOME_SINGLE_RING_CLEANUP" position={[0, -0.05, -8.8]}>
      <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.05, 2.38, 160]} />
        <meshBasicMaterial
          color={new THREE.Color("#6f45ff")}
          transparent
          opacity={0.24}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh position={[0, -0.925, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.02, 160]} />
        <meshBasicMaterial
          color={new THREE.Color("#05020f")}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
