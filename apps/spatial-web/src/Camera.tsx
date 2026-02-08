"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export default function Camera() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 1.4, 2.8);
    camera.fov = 60;
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}
