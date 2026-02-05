'use client';

import { Html } from '@react-three/drei';

export default function HUD({ mode }: { mode: string }) {
  return (
    <Html position={[-4, 3, -10]}>
      <div className="text-white bg-black bg-opacity-50 p-2 rounded">
        <h1 className="text-lg">Mode: {mode}</h1>
        <p>Controls: Gaze and Pinch</p>
      </div>
    </Html>
  );
}
