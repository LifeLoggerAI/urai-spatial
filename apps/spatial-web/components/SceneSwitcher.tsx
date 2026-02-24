'use client'

import Link from 'next/link'

export default function SceneSwitcher() {

  return (
    <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 100 }}>
      <Link href="/" style={{ color: 'white', background: 'black', padding: '10px', margin: '5px', textDecoration: 'none' }}>Home</Link>
      <Link href="/lifereview" style={{ color: 'white', background: 'black', padding: '10px', margin: '5px', textDecoration: 'none' }}>Life Review</Link>
      <Link href="/case-studies/spatial-memory-engine" style={{ color: 'white', background: 'black', padding: '10px', margin: '5px', textDecoration: 'none' }}>Case Study</Link>
      <Link href="/capabilities" style={{ color: 'white', background: 'black', padding: '10px', margin: '5px', textDecoration: 'none' }}>Capabilities</Link>
      <Link href="/about" style={{ color: 'white', background: 'black', padding: '10px', margin: '5px', textDecoration: 'none' }}>About</Link>
      <Link href="/launch" style={{ color: 'white', background: 'black', padding: '10px', margin: '5px', textDecoration: 'none' }}>Launch</Link>
    </div>
  )
}
