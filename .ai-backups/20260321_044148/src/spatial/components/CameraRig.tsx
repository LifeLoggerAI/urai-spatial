"use client";

import { useFrame, useThree } from "@react-three/fiber";

export default function CameraRig() {
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    camera.position.set(-6.2, 1.25, 7.2);
    camera.lookAt(-0.8, 1.2, 0);
    camera.fov = 30;
    camera.updateProjectionMatrix();
  });

  return null;
}
