
'use client';

import { Html } from '@react-three/drei';
import { useRouter } from 'next/navigation';

export default function HUD({ mode }: { mode: string }) {
  const router = useRouter();

  const handleExit = () => {
    // Navigate back to a non-spatial replay or menu screen.
    router.push('/replay');
  };

  return (
    <Html>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        color: 'white',
        padding: '10px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: '5px',
        cursor: 'pointer'
      }}
        onClick={handleExit}
      >
        Exit
      </div>
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: 'white',
        padding: '10px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: '5px',
      }}>
        Mode: {mode}
      </div>
    </Html>
  );
}
