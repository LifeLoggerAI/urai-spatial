"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import { MathUtils } from "three";

export default function CameraRig() {
  const { camera } = useThree();

  useFrame(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = MathUtils.lerp(camera.fov, 60, 0.05);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
