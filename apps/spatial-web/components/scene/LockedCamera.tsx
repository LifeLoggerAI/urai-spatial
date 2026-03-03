"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export default function LockedCamera() {
  const { camera } = useThree();

  useEffect(() => {
    # DISABLED_CAMERA_MUTATION.set(0, 0, 6);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
}
