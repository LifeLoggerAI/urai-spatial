"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { Vector3 } from "three";

type Props = {
  enabled?: boolean;
  amplitude?: number;
};

export default function CinematicIdleMotion({
  enabled = true,
  amplitude = 0.02,
}: Props) {
  const { camera } = useThree();
  const base = useMemo(() => camera.position.clone(), [camera]);

  useFrame(({ clock }) => {
    if (!enabled) return;
    const t = clock.getElapsedTime();
    const target = new Vector3(
      base.x + Math.sin(t * 0.18) * amplitude,
      base.y + Math.cos(t * 0.14) * amplitude * 0.75,
      base.z + Math.sin(t * 0.11) * amplitude * 0.2
    );
    camera.position.lerp(target, 0.035);
  });

  return null;
}
