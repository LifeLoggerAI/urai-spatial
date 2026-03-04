'use client'

import { Html } from '@react-three/drei'
import { useSceneModeStore } from '../state/useSceneModeStore'

export default function ModeToggle() {
  const mode = useSceneModeStore((s) => s.mode)
  const setMode = useSceneModeStore((s) => s.setMode)

  return (
    <Html position={[0, 7, 0]} center>
      <div style={{ display: 'flex', gap: '10px' }}>
        {['HOME', 'LIFEMAP', 'REPLAY'].map((m) => (
          <div
            key={m}
            onClick={() => setMode(m as any)}
            style={{
              padding: '8px 14px',
              background:
                mode === m
                  ? '#88ccff'
                  : 'rgba(10,15,31,0.85)',
              color: mode === m ? '#000' : '#88ccff',
              border: '1px solid #88ccff',
              borderRadius: '6px',
              fontFamily: 'monospace',
              cursor: 'pointer'
            }}
          >
            {m}
          </div>
        ))}
      </div>
    </Html>
  )
}