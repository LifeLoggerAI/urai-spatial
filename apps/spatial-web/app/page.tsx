import HUD from '../src/components/HUD';
'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const XRScene = dynamic(() => import('../src/XRScene'), { ssr: false });

function SceneSelector() {
  const searchParams = useSearchParams();
  const demo = searchParams.get('demo');
  const replay = searchParams.get('replay');
  const season = searchParams.get('season');
  const mode = searchParams.get('mode');

  // Determine the camera preset based on the replay state
  const cameraPreset = replay ? 'FOCUS' : 'OVERVIEW';

  return (
    <>
      <XRScene demo={demo} replay={replay} season={season} interactionMode={mode} />
    </>
  );
}

export default function Page() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Suspense fallback={<div>Loading...</div>}>
        <SceneSelector />
      </Suspense>
    </div>
  );
}
