'use client';

import { useThree, useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

const SpatialCamera = () => {
  const { camera } = useThree();

  const initialPosition = useMemo(() => new THREE.Vector3(0, 0, 5), []);

  useEffect(() => {
    camera.position.copy(initialPosition);
    camera.lookAt(0, 0, 0);
  }, [camera, initialPosition]);

  useFrame((state) => {
    // URAI Motion Language: "composed," and "deliberate."
    const time = state.clock.getElapsedTime();
    const radius = 5;
    const speed = 0.01;
    camera.position.x = Math.sin(time * speed) * radius;
    camera.position.z = Math.cos(time * speed) * radius;
    camera.lookAt(0, 0, 0);
  });

  return null;
};

export default SpatialCamera;
