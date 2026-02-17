
'use client';

import { Canvas } from '@react-three/fiber';
import { ARButton, XR, Controllers, Hands } from '@react-three/xr';
import { CameraController } from '@/components/CameraController';
import Starfield from 'apps/spatial-web/src/Starfield';
import { useLifeMapData } from '@/hooks/useLifeMapData';
import { XRSceneManager } from '@/components/XRSceneManager';
import { Suspense } from 'react';

function Scene() {
  const { memories } = useLifeMapData();
  return (
    <Suspense fallback={null}>
      <Starfield memories={memories} />
      <CameraController />
    </Suspense>
  );
}

export default function SpatialWebPage() {
  return (
    <main className="w-full h-screen bg-black">
      <ARButton />
      <Canvas>
        <XR>
          <XRSceneManager />
          <Controllers />
          <Hands />
          <Scene />
        </XR>
      </Canvas>
    </main>
  );
}
