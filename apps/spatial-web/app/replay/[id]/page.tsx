
'use client';

import { useParams } from 'next/navigation';
import SceneManager from '@/components/SceneManager';
import ReplayScene from '@/components/replay/ReplayScene';

export default function ReplayPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '0';

  return (
    <main style={{ height: '100vh', width: '100vw' }}>
      <SceneManager>
        <ReplayScene id={id} />
      </SceneManager>
    </main>
  );
}
