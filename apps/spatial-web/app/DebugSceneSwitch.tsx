'use client';
import { useIdentityStore } from '@/engine/state/identity-store'

export function DebugSceneSwitch() {
  const setScene = useIdentityStore((s) => s.setScene)

  return (
    <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 100 }}>
      <button onClick={() => setScene('home')}>Home</button>
      <button onClick={() => setScene('lifemap')}>LifeMap</button>
      <button onClick={() => setScene('replay')}>Replay</button>
    </div>
  )
}
