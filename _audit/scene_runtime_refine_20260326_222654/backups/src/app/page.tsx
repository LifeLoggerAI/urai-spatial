'use client';

import dynamic from 'next/dynamic';

const SpatialScene = dynamic(() => import('../spatial/scene/SpatialScene'), { ssr: false });

export default function Page() {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#020305',
      }}
    >
      <SpatialScene />
    </main>
  );
}
