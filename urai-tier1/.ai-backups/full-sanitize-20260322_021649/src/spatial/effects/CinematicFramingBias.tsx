"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";

export default function CinematicFramingBias() {
  const { camera } = useThree();

  useFrame(() => {
    if (camera.position.z > 2 && camera.position.y < 3) {
      const target = new Vector3(-0.55, 0.16, camera.position.z);
      camera.position.lerp(target, 0.035);
      camera.lookAt(-0.08, -0.08, 0);
    }
  });

  return null;
}
