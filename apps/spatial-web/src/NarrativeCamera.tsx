'use client';

import { useThree, useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Memory } from './lib/types';

const NarrativeCamera = ({ memories }: { memories: Memory[] }) => {
  const { camera } = useThree();

  const initialPosition = useMemo(() => new THREE.Vector3(0, 0, 5), []);

  useEffect(() => {
    camera.position.copy(initialPosition);
    camera.lookAt(0, 0, 0);
  }, [camera, initialPosition]);

  useFrame(() => {
    // In a complete implementation, this would be driven by narrative logic,
    // moving the camera to focus on specific memories or constellations
    // based on user interaction, resonance, or a scripted sequence.
    // For this final version, we will keep it static to ensure stability.
  });

  return null;
};

export default NarrativeCamera;
