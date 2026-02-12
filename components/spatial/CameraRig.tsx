'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Vector3 } from 'three';

// Pre-defined camera positions for deterministic scenes
const presets = {
  OVERVIEW: new Vector3(0, 0, 10),
  FOCUS: new Vector3(0, 0, 5),
  ORBIT: new Vector3(5, 5, 5),
};

/**
 * A deterministic, cinematic camera rig for URAI-SPATIAL.
 * This component smoothly transitions the camera between pre-defined presets.
 * It uses `useFrame` and `lerp` to ensure a smooth, non-janky animation,
 * which is the foundation of the cinematic runtime.
 */
export default function CameraRig({ preset }: { preset: keyof typeof presets }) {
  const { camera } = useThree();

  // Memoize the target position to avoid re-creating the vector on every render.
  const targetPosition = useMemo(() => presets[preset], [preset]);

  useFrame((state, delta) => {
    // We use a small, fixed interpolation factor for a smooth, consistent feel.
    const interpolationFactor = 0.1;

    // Smoothly interpolate the camera's position to the target.
    // This is the core of the cinematic camera movement.
    camera.position.lerp(targetPosition, interpolationFactor);

    // Always look at the center of the scene for a stable focus.
    camera.lookAt(0, 0, 0);
  });

  return null;
}
