"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, PointLight } from "three";

type Props = {
  orbPosition?: [number, number, number];
};

export default function CinematicLightingRig({
  orbPosition = [0, 0.2, 0],
}: Props) {
  const groupRef = useRef<Group | null>(null);
  const glowRef = useRef<PointLight | null>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) groupRef.current.position.y = Math.sin(t * 0.18) * 0.03;
    if (glowRef.current) glowRef.current.intensity = 2.45 + Math.sin(t * 1.7) * 0.18;
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.12} />
      <hemisphereLight args={["#6f8fe0", "#030813", 0.16]} />
      <directionalLight
        position={[3, 5, 2]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-4.2, 1.6, -3.2]} intensity={0.18} color="#284dba" />
      <pointLight
        ref={glowRef}
        position={orbPosition}
        intensity={2.45}
        distance={8}
        decay={2}
        color="#88ccff"
      />
    </group>
  );
}
