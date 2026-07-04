'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import HomeSpatialCanvas from './HomeSpatialCanvas'

export default function HomeSpatialRuntimeLayer() {
  const pathname = usePathname() ?? '/'
  const [orbOpen, setOrbOpen] = useState(false)

  if (pathname !== '/' && pathname !== '/home') return null

  return (
    <section
      className="urai-home-spatial-runtime-layer"
      data-urai-home-runtime="one-continuous-webgl-world"
      aria-label="URAI living spatial Home"
    >
      <HomeSpatialCanvas onOrbOpen={() => setOrbOpen(true)} />
      <aside className="urai-home-spatial-runtime-orb" data-open={orbOpen ? 'true' : 'false'} aria-live="polite">
        <button type="button" aria-label="Close orb guidance" onClick={() => setOrbOpen(false)}>×</button>
        <p>URAI orb</p>
        <strong>Choose a doorway in the world. Ground is your private workforce. Life Map is your memory sky.</strong>
        <nav aria-label="Orb suggested places">
          <Link href="/ground?from=home-orb">Ground</Link>
          <Link href="/life-map?from=home-orb">Life Map</Link>
          <Link href="/mirror">Mirror</Link>
          <Link href="/passport">Passport</Link>
        </nav>
      </aside>
    </section>
  )
}
