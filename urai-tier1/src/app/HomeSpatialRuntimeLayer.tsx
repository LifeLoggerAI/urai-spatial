'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import HomeSpatialCanvas, { useWebGLAvailable } from './HomeSpatialCanvas'

export default function HomeSpatialRuntimeLayer() {
  const pathname = usePathname() ?? '/'
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  const [orbOpen, setOrbOpen] = useState(false)
  const webglAvailable = useWebGLAvailable()

  if (normalizedPathname !== '/' && normalizedPathname !== '/home') return null
  if (webglAvailable !== true) return null

  return (
    <section
      className="urai-home-spatial-runtime-layer"
      data-urai-home-runtime="one-continuous-webgl-world"
      data-webgl-ready="true"
      aria-label="URAI living spatial Home"
    >
      <HomeSpatialCanvas webglAvailable={webglAvailable} onOrbOpen={() => setOrbOpen(true)} />
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
