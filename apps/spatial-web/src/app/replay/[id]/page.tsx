
'use client';

import { Canvas } from '@react-three/fiber';
import { useRouter, useParams } from 'next/navigation';
import OrbCore from 'apps/spatial-web/src/components/OrbCore';
import { useLifeMapData } from '@/hooks/useLifeMapData';

export default function ReplayPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { memories } = useLifeMapData();

  const memory = memories.find(m => m.id === id);

  if (!memory) {
    return <div>Loading memory...</div>;
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <OrbCore emotionalIntensity={memory.emotionalIntensity || 0.5} active={true} />
      </Canvas>

      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        textAlign: 'center',
        fontFamily: 'sans-serif'
      }}>
        <h2>{memory.title || 'A Memory'}</h2>
        <p>{new Date(memory.createdAt).toLocaleDateString()}</p>
        <p style={{ maxWidth: '600px', margin: '20px auto' }}>{memory.summary || 'No details available.'}</p>
      </div>

      <button 
        onClick={() => router.push('/')} 
        style={{
          position: 'absolute',
          bottom: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          background: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          border: '1px solid white',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Return to LifeMap
      </button>
    </div>
  );
}
