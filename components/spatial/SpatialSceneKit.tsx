'use client';

import { Suspense } from 'react';
import CameraRig from './CameraRig';
import Starfield from './Starfield';
import NebulaDome from './NebulaDome';
import HUD from './HUD';
import SpatialStage from './SpatialStage';

export default function SpatialSceneKit({
  mode,
}: { 
  mode: 'lifeMap' | 'ritualAR' | 'planetarium' | 'companion';
}) {
  return (
    <SpatialStage>
      <Suspense fallback={null}>
        <CameraRig preset="OVERVIEW" />
        <ambientLight intensity={0.6} />
        <Starfield seed={42} />
        <NebulaDome />
        <HUD mode={mode} />
      </Suspense>
    </SpatialStage>
  );
}
