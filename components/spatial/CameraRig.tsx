'use client';

import { PerspectiveCamera } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export default function CameraRig({ preset }: { preset: 'OVERVIEW' | 'FOCUS' | 'ORBIT' }) {
  const { camera } = useThree();

  useEffect(() => {
    switch (preset) {
      case 'OVERVIEW':
        camera.position.set(0, 5, 10);
        camera.lookAt(0, 0, 0);
        break;
      case 'FOCUS':
        camera.position.set(0, 0, 5);
        camera.lookAt(0, 0, 0);
        break;
      case 'ORBIT':
        // Orbit controls logic would be implemented here
        break;
    }
  }, [preset, camera]);

  return <PerspectiveCamera makeDefault />;
}
