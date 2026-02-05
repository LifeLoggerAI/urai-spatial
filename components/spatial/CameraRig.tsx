'use client';

import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Vector3 } from 'three';

const presets = {
  OVERVIEW: new Vector3(0, 0, 10),
  FOCUS: new Vector3(0, 0, 5),
  ORBIT: new Vector3(5, 5, 5),
};

export default function CameraRig({ preset }: { preset: keyof typeof presets }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(presets[preset].x, presets[preset].y, presets[preset].z);
    camera.lookAt(0, 0, 0);
  }, [preset, camera]);

  return null;
}
