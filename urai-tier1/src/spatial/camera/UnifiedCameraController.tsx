'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { UnifiedCameraState } from './UnifiedCameraTypes';

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export interface UnifiedCameraControllerProps {
  state: UnifiedCameraState;
  enabled?: boolean;
  onApplied?: (state: UnifiedCameraState) => void;
}

export function UnifiedCameraController({
  state,
  enabled = true,
  onApplied,
}: UnifiedCameraControllerProps) {
  const { camera } = useThree();

  const targetPosition = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());

  const targetFov = useMemo(() => state.pose.fov, [state.pose.fov]);

  useFrame(() => {
    if (!enabled) return;

    const { pose } = state;
    const damping = clamp01(pose.damping);

    targetPosition.current.set(
      pose.position[0],
      pose.position[1],
      pose.position[2],
    );

    lookTarget.current.set(
      pose.target[0],
      pose.target[1],
      pose.target[2],
    );

    camera.position.lerp(targetPosition.current, damping);
    camera.lookAt(lookTarget.current);

    if ('fov' in camera && typeof camera.fov === 'number') {
      camera.fov += (targetFov - camera.fov) * clamp01(damping * 1.5);
      camera.near = pose.near;
      camera.far = pose.far;
      camera.updateProjectionMatrix();
    }

    onApplied?.(state);
  });

  return null;
}

export default UnifiedCameraController;
