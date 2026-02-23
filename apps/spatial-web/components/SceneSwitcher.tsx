'use client'

import { useSceneStore } from '@/engine/core/scene-store'

export default function SceneSwitcher() {
  const { setScene } = useSceneStore()

  return (
    <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 100 }}>
      <button onClick={() => setScene('home')} style={{ color: 'white', background: 'black', padding: '10px', margin: '5px' }}>Home</button>
      <button onClick={() => setScene('lifereview')} style={{ color: 'white', background: 'black', padding: '10px', margin: '5px' }}>Life Review</button>
    </div>
  )
}
