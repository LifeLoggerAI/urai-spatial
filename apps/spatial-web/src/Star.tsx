'use client';

import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRouter } from 'next/navigation';
import { Memory } from "./lib/types";

const lightTemperatures: { [key: string]: string } = {
  cool: "#a2d2ff",
  neutral: "#ffffff",
  warm: "#ffdab9",
};

export default function Star({ memory }: { memory: Memory }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const router = useRouter();

  const color = useMemo(() => {
    return new THREE.Color(lightTemperatures[memory.lightTemperature || "neutral"]);
  }, [memory.lightTemperature]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const t = state.clock.getElapsedTime();
    const resonance = memory.resonance || 0;
    const pulseFrequency = 2.0 * (1.0 - resonance * 0.75);
    const silenceWeight = memory.silenceWeight || 0;
    const pulseAmplitude = 0.2 * (1.0 - silenceWeight);

    const pulse = Math.sin(t * pulseFrequency) * pulseAmplitude;
    const baseScale = memory.emotionalWeight || 1.0;
    meshRef.current.scale.setScalar(baseScale + pulse);

    if (lightRef.current) {
      const baseIntensity = memory.intensity || 0;
      lightRef.current.intensity = baseIntensity + (pulse * baseIntensity);
    }
  });

  const gravity = memory.gravity || 0;
  const falloffDistance = 3.0 * (1 + gravity * 2);

  const handleClick = () => {
    // Navigate to the replay route for this memory
    router.push(`/replay?memoryId=${memory.id}`);
  };

  return (
    <mesh
      ref={meshRef}
      position={[memory.transform.position.x, memory.transform.position.y, memory.transform.position.z]}
      onClick={handleClick} // Add the onClick handler
    >
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={memory.intensity}
        toneMapped={false}
      />
      <pointLight
        ref={lightRef}
        color={color}
        intensity={memory.intensity}
        distance={falloffDistance}
        decay={2}
      />
    </mesh>
  );
}
