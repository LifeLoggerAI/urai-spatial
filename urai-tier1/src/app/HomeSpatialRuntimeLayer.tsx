'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import HomeSanctuaryFallback from './HomeSanctuaryFallback'
import HomeSpatialCanvas, { useWebGLAvailable } from './HomeSpatialCanvas'
import { requestUraiWorldOrbOpen } from '@/spatial/world/worldEvents'

export default function HomeSpatialRuntimeLayer() {
  const pathname = usePathname() ?? '/'
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  const webglAvailable = useWebGLAvailable()
  const [contextLost, setContextLost] = useState(false)
  const homeRoute = normalizedPathname === '/' || normalizedPathname === '/home'
  const homeRuntimeActive = homeRoute && webglAvailable !== null

  useEffect(() => {
    document.body.style.cursor = 'default'
    if (!homeRuntimeActive) {
      document.body.classList.remove('urai-home-runtime-active')
      return
    }
    document.body.classList.add('urai-home-runtime-active')
    return () => {
      document.body.classList.remove('urai-home-runtime-active')
      document.body.style.cursor = 'default'
    }
  }, [homeRuntimeActive])

  useEffect(() => setContextLost(false), [normalizedPathname])

  if (!homeRoute || webglAvailable === null) return null

  const useFallback = webglAvailable === false || contextLost

  return (
    <section
      className="urai-home-spatial-runtime-layer"
      data-urai-home-runtime="single-authoritative-sanctuary"
      data-webgl-ready={useFallback ? 'false' : 'true'}
      data-home-renderer={useFallback ? 'layered-2d' : 'webgl'}
      aria-label="URAI living personal sanctuary"
    >
      {useFallback ? (
        <HomeSanctuaryFallback
          reason={contextLost ? 'context-lost' : 'no-webgl'}
          onOrbOpen={requestUraiWorldOrbOpen}
        />
      ) : (
        <HomeSpatialCanvas
          webglAvailable={true}
          onOrbOpen={requestUraiWorldOrbOpen}
          onContextLost={() => setContextLost(true)}
        />
      )}
    </section>
  )
}
