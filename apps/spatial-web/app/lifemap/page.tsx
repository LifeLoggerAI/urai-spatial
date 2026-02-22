'use client';

import SceneManager from '@/components/SceneManager';
import Starfield from '@/components/Starfield';

export default function LifeMapPage() {
  return (
    <main style={{ height: '100vh', width: '100vw' }}>
      <SceneManager>
        <Starfield />
      </SceneManager>
    </main>
  );
}
