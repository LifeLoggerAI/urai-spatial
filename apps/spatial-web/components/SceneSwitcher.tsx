'use client'

import { useSceneStore } from '@/engine/core/scene-store'

export default function SceneSwitcher() {
  const { setScene } = useSceneStore()

  return (
    <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 100 }}>
      <a href="/" onClick={() => setScene('home')} style={{ color: 'white', background: 'black', padding: '10px', margin: '5px', textDecoration: 'none' }}>Home</a>
      <a href="/lifereview" onClick={() => setScene('lifereview')} style={{ color: 'white', background: 'black', padding: '10px', margin: '5px', textDecoration: 'none' }}>Life Review</a>
      <a href="/case-studies/spatial-memory-engine" style={{ color: 'white', background: 'black', padding: '10px', margin: '5px', textDecoration: 'none' }}>Case Study</a>
      <a href="/capabilities" style={{ color: 'white', background: 'black', padding: '10px', margin: '5px', textDecoration: 'none' }}>Capabilities</a>
      <a href="/about" style={{ color: 'white', background: 'black', padding: '10px', margin: '5px', textDecoration: 'none' }}>About</a>
      <a href="/launch" style={{ color: 'white', background: 'black', padding: '10px', margin: '5px', textDecoration: 'none' }}>Launch</a>
    </div>
  )
}
