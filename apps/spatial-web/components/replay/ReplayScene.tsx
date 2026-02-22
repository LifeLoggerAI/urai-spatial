'use client';

import { useRouter } from 'next/navigation';
import { Html } from '@react-three/drei';

interface ReplaySceneProps {
  id: string;
}

function HtmlOverlay({ id, onBack }: { id: string; onBack: () => void; }) {
  return (
    <Html>
      <div
        style={{
          position: 'absolute',
          top: '-200px',
          left: '-100px',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '20px',
          borderRadius: '10px',
          color: 'white',
        }}
      >
        <p>Replay ID: {id}</p>
        <button onClick={onBack} style={{color: 'black'}}>Back to LifeMap</button>
      </div>
    </Html>
  );
}

export default function ReplayScene({ id }: ReplaySceneProps) {
  const router = useRouter();

  return (
    <>
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#4a00ff" />
      </mesh>
      <HtmlOverlay id={id} onBack={() => router.push('/lifemap')} />
    </>
  );
}
