"use client";

import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Memory } from "./lib/types";

// STEP 3: Lighting Behavior
const lightTemperatures: { [key: string]: string } = {
  cool: "#a2d2ff",    // bluish
  neutral: "#ffffff", // soft white
  warm: "#ffdab9",    // amber
};

export default function Star({ memory }: { memory: Memory }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Determine color from lightTemperature, fallback to neutral
  const color = useMemo(() => {
    return new THREE.Color(lightTemperatures[memory.lightTemperature || "neutral"]);
  }, [memory.lightTemperature]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const t = state.clock.getElapsedTime();

    // STEP 3: Resonance affects emissive pulse frequency
    // Higher resonance = slower, more deliberate pulse.
    const resonance = memory.resonance || 0; // 0.0 - 1.0
    const pulseFrequency = 2.0 * (1.0 - resonance * 0.75); // Range from ~0.5 to 2.0

    // STEP 3: SilenceWeight reduces flicker and animation intensity
    const silenceWeight = memory.silenceWeight || 0; // 0.0 - 1.0
    const pulseAmplitude = 0.2 * (1.0 - silenceWeight); // Range from 0.0 to 0.2

    // Apply the pulse to the scale.
    // The base scale is still driven by emotionalWeight.
    const pulse = Math.sin(t * pulseFrequency) * pulseAmplitude;
    const baseScale = memory.emotionalWeight || 1.0;
    meshRef.current.scale.setScalar(baseScale + pulse);

    // Also modulate light intensity slightly with the pulse
    if (lightRef.current) {
      const baseIntensity = memory.intensity || 0;
      lightRef.current.intensity = baseIntensity + (pulse * baseIntensity);
    }
  });

  // STEP 3: Gravity affects emissive falloff radius
  // We'll use a PointLight's `distance` property to simulate falloff.
  const gravity = memory.gravity || 0; // 0.0 - 1.0
  const falloffDistance = 3.0 * (1 + gravity * 2); // Range from 3.0 to 9.0

  return (
    <mesh
      ref={meshRef}
      position={[memory.transform.position.x, memory.transform.position.y, memory.transform.position.z]}
    >
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={memory.intensity}
        toneMapped={false} // Make emissive glow stand out more
      />
      {/* Add a PointLight to cast light and have a "falloff" */}
      <pointLight
        ref={lightRef}
        color={color}
        intensity={memory.intensity}
        distance={falloffDistance}
        decay={2} // Realistic decay
      />
    </mesh>
  );
}
