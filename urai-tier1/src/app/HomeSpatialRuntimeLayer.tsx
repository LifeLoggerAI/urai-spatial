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
      data-orb-open={orbOpen ? 'true' : 'false'}
      aria-label="URAI living spatial Home"
    >
      <HomeSpatialCanvas webglAvailable={webglAvailable} onOrbOpen={() => setOrbOpen(true)} />
      <aside className="urai-home-spatial-runtime-orb" data-open={orbOpen ? 'true' : 'false'} aria-live="polite">
        <button type="button" aria-label="Close orb guidance" onClick={() => setOrbOpen(false)}>×</button>
        <p>URAI orb</p>
        <strong>The ground opens your private infrastructure. The sky opens your Life Map.</strong>
        <nav aria-label="Accessible world entrances">
          <Link href="/ground?from=home-orb">Enter through Ground</Link>
          <Link href="/life-map?from=home-orb">Open the Life Map sky</Link>
        </nav>
      </aside>
      <style jsx global>{`
        .urai-home-spatial-runtime-layer .urai-home-spatial-canvas {
          filter: brightness(1.34) saturate(1.2) contrast(1.02);
        }
      `}</style>
    </section>
  )
}
