"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";

export default function WarpPulse() {
  const { camera } = useThree();
  const velocity = useRef(0);

  useFrame(() => {
    if (velocity.current > 0) {
      velocity.current *= 0.92;
      camera.position.z -= velocity.current;
    }
  });

  return null;
}
