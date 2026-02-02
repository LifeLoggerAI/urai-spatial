'use client';

import { XR, VRButton } from '@react-three/xr';
import { Canvas } from '@react-three/fiber';
import SpatialSceneKit from '../../components/spatial/SpatialSceneKit';

export default function LifeMapPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'black' }}>
      <VRButton />
      <Canvas>
        <XR>
          <SpatialSceneKit mode="lifeMap" />
        </XR>
      </Canvas>
    </div>
  );
}
