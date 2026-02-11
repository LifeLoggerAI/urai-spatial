
'use client';

import { Html } from '@react-three/drei';

export default function HUD({ mode }: { mode: string }) {
  const handleExit = () => {
    // In a real app, this would trigger a state change to exit the spatial scene
    // For now, we'll just log to the console
    console.log('Exiting spatial scene...');
    // This could also be a router push, a state update, etc.
    // For example: router.push('/replay');
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
      }}>
        <p>Controls: Gaze and Dwell</p>
      </div>
    </Html>
  );
}
