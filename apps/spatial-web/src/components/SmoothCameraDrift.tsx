"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function SmoothCameraDrift() {
  const { camera } = useThree();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    const driftX = Math.sin(t * 0.15) * 2;
    const driftY = Math.cos(t * 0.12) * 1.2;
    const driftZ = 15 + Math.sin(t * 0.1) * 1.5;

    camera.position.lerp(
      new THREE.Vector3(driftX, driftY, driftZ),
      0.02
    );

    camera.lookAt(0, 0, 0);
  });

  return null;
}
