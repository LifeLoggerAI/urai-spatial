"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";

export default function CameraRig() {
  const { camera } = useThree();

  useFrame(() => {
    // HARD cinematic position (not centered)
    const targetPos = new Vector3(-1.25, 0.65, 3.6);

    camera.position.lerp(targetPos, 0.08);

    // force look slightly BELOW center (gives weight)
    camera.lookAt(-0.2, -0.15, 0);
  });

  return null;
}
