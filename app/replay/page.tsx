'use client';

import { useRouter } from 'next/navigation';

export default function Replay() {
  const router = useRouter();

  return (
    <div>
      <h1>Exited Spatial Scene</h1>
      <p>This is the non-spatial replay and menu screen.</p>
      <button onClick={() => router.back()}>Go Back</button>
    </div>
  );
}
