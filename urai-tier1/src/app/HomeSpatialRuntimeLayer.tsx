'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import HomeSpatialCanvas, { useWebGLAvailable } from './HomeSpatialCanvas'
import { requestUraiWorldOrbOpen } from '@/spatial/world/worldEvents'

export default function HomeSpatialRuntimeLayer() {
  const pathname = usePathname() ?? '/'
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  const webglAvailable = useWebGLAvailable()
  const homeRuntimeActive = (normalizedPathname === '/' || normalizedPathname === '/home') && webglAvailable === true

  useEffect(() => {
    document.body.style.cursor = 'default'

    if (!homeRuntimeActive) {
      document.body.classList.remove('urai-home-webgl-active')
      return
    }

    document.body.classList.add('urai-home-webgl-active')
    return () => {
      document.body.classList.remove('urai-home-webgl-active')
      document.body.style.cursor = 'default'
    }
  }, [homeRuntimeActive])

  if (!homeRuntimeActive) return null

  return (
    <section
      className="urai-home-spatial-runtime-layer"
      data-urai-home-runtime="one-continuous-webgl-world"
      data-webgl-ready="true"
      aria-label="URAI living spatial Home"
    >
      <HomeSpatialCanvas webglAvailable={true} onOrbOpen={requestUraiWorldOrbOpen} />
      <style jsx global>{`
        .urai-home-spatial-runtime-layer .urai-home-spatial-canvas {
          filter: brightness(1.34) saturate(1.2) contrast(1.02);
        }
      `}</style>
    </section>
  )
}
