"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const target = new THREE.Vector3();

export default function DeepSpaceDrift() {
  const { camera } = useThree();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Layer 1: slow cosmic sway
    const swayX = Math.sin(t * 0.08) * 4;
    const swayY = Math.cos(t * 0.06) * 2;

    // Layer 2: deeper breathing pulse
    const pulseZ = 18 + Math.sin(t * 0.15) * 2;

    // Layer 3: micro parallax
    const microX = Math.sin(t * 0.6) * 0.2;
    const microY = Math.cos(t * 0.7) * 0.15;

    target.set(
      swayX + microX,
      swayY + microY,
      pulseZ
    );

    camera.position.lerp(target, 0.025);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
