"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function CameraRig() {
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    camera.position.set(-5.5, 1.2, 6.5);
    camera.lookAt(-0.6, 1.1, 0);
    camera.fov = 32;
    camera.updateProjectionMatrix();
  });

  return null;
}
