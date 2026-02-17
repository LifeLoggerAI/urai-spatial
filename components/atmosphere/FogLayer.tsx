
'use client'

import { Fog } from 'three';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

/**
 * A declarative fog layer that adds depth to the scene.
 */
export default function FogLayer() {
  const { scene } = useThree();

  useEffect(() => {
    scene.fog = new Fog('#000000', 20, 100);
    return () => {
        scene.fog = null;
    }
  }, [scene]);

  return null;
}
