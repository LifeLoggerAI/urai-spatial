"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";

export default function WarpTunnel() {
  const { camera } = useThree();
  const velocity = useRef(0);
  const active = useRef(false);

  useFrame(() => {
    if (active.current) {
      velocity.current += 0.02;
      camera.position.z -= velocity.current;
      if (velocity.current > 2) active.current = false;
    } else {
      velocity.current *= 0.95;
    }
  });

  (window as any).triggerWarp = () => {
    velocity.current = 0.1;
    active.current = true;
  };

  return null;
}
