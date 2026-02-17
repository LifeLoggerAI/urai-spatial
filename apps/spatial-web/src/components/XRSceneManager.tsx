
import { useXR } from '@react-three/xr';
import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

export function XRSceneManager() {
  const { isPresenting } = useXR();
  const { camera } = useThree();

  // Store the initial camera state when the component mounts
  const [initialCameraState] = useState(() => {
    return {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
    };
  });

  useEffect(() => {
    // When isPresenting becomes false, we've exited XR
    if (!isPresenting) {
      // Restore the camera to its initial state
      camera.position.copy(initialCameraState.position);
      camera.quaternion.copy(initialCameraState.quaternion);
    }
  }, [isPresenting, camera, initialCameraState]);

  return null; // This component does not render anything
}
