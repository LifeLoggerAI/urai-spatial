'use client'

import { Html } from '@react-three/drei'
import { useSceneModeStore, SceneMode } from '../state/useSceneModeStore'

const MODES: SceneMode[] = ['HOME', 'LIFEMAP', 'REPLAY']

export default function ModeToggle() {

  const mode = useSceneModeStore((s) => s.mode)
  const setMode = useSceneModeStore((s) => s.setMode)

  return (
    <Html position={[0, 7, 0]} center>
      <div style={{ display: 'flex', gap: '10px' }}>
        {MODES.map((m) => (

          <div
            key={m}
            onClick={() => setMode(m)}
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