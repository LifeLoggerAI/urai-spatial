
import { useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * A hook to provide controlled camera movements for the LifeMap.
 * This ensures all camera transitions are smooth and adhere to the "Sacred Pacing" principle.
 */
export function useCameraController() {
  const { camera, controls } = useThree();

  const zoomTo = useCallback((position: [number, number, number]) => {
    if (controls && controls.enabled) {
      // The `setLookAt` method provides a smooth, animated transition.
      controls.setLookAt(
        camera.position.x,
        camera.position.y,
        camera.position.z,
        position[0],
        position[1],
        position[2],
        true
      );
    }
  }, [camera, controls]);

  const resetCamera = useCallback(() => {
    if (controls && controls.enabled) {
      // Smoothly transition back to the default overview position.
      controls.setLookAt(
        camera.position.x,
        camera.position.y,
        camera.position.z,
        0,
        0,
        0,
        true
      );
      // A slight delay to ensure the look-at completes before a position change.
      setTimeout(() => {
        controls.setLookAt(0, 0, 15, 0, 0, 0, true);
      }, 500);
    }
  }, [camera, controls]);

  return { zoomTo, resetCamera };
}
