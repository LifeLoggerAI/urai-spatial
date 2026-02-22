'use client';

import SceneManager from '@/components/SceneManager';
import HomeScene from '@/components/HomeScene';

export default function HomePage() {
  return (
    <main style={{ height: '100vh', width: '100vw' }}>
      <SceneManager>
        <HomeScene />
      </SceneManager>
    </main>
  );
}
