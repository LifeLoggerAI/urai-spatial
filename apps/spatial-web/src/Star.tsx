"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Memory } from "./lib/types";

const archetypeColors: { [key: string]: string } = {
  default: "#ffffff",
  insight: "#ffff00",
  loss: "#ff0000",
  love: "#ff00ff",
  creation: "#00ffff",
};

export default function Star({ memory }: { memory: Memory }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      if (memory.activeRelevance) {
        ref.current.scale.setScalar(1 + Math.sin(t * 2) * 0.2);
      }
    }
  });

  const color = archetypeColors[memory.archetype] || archetypeColors.default;

  return (
    <mesh
      ref={ref}
      position={[memory.transform.position.x, memory.transform.position.y, memory.transform.position.z]}
      scale={[memory.emotionalWeight, memory.emotionalWeight, memory.emotionalWeight]}
    >
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={memory.intensity}
      />
    </mesh>
  );
}
