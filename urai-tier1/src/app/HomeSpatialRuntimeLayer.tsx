'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import HomeSpatialCanvas, { useWebGLAvailable } from './HomeSpatialCanvas'
import { requestUraiWorldOrbOpen } from '@/spatial/world/worldEvents'

export default function HomeSpatialRuntimeLayer() {
  const pathname = usePathname() ?? '/'
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  const webglAvailable = useWebGLAvailable()

  useEffect(() => () => {
    document.body.style.cursor = 'default'
  }, [])

  if (normalizedPathname !== '/' && normalizedPathname !== '/home') return null
  if (webglAvailable !== true) return null

  return (
    <section
      className="urai-home-spatial-runtime-layer"
      data-urai-home-runtime="one-continuous-webgl-world"
      data-webgl-ready="true"
      aria-label="URAI living spatial Home"
    >
      <HomeSpatialCanvas webglAvailable={webglAvailable} onOrbOpen={requestUraiWorldOrbOpen} />
      <style jsx global>{`
        .urai-home-spatial-runtime-layer .urai-home-spatial-canvas {
          filter: brightness(1.34) saturate(1.2) contrast(1.02);
        }
      `}</style>
    </section>
  )
}
