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
        zIndex: 1000,
      }}>
        <button onClick={handleExit} style={{
          background: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          border: '1px solid white',
          borderRadius: '5px',
          padding: '10px 20px',
          cursor: 'pointer',
          fontSize: '16px',
          fontFamily: 'sans-serif'
        }}>
          Exit Spatial View
        </button>
      </div>
    </Html>
  );
}
