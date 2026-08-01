'use client'

import { useEffect, useState } from 'react'
import HomeSpatialWorldFinal from './HomeSpatialWorldFinal'
import { useWebGLAvailable } from './HomeSpatialCanvas'

/**
 * Home has exactly one settled visual owner. The template-mounted DOM/CSS
 * threshold remains available before hydration and while capability detection
 * is unresolved. Once capability resolves, HomeSpatialRuntimeLayer owns either
 * the WebGL world or the complete no-WebGL accessible fallback.
 */
export default function FinalHomeThreshold() {
  const webglAvailable = useWebGLAvailable()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (mounted && webglAvailable !== null) return null

  return (
    <div
      data-testid="urai-home-accessible-fallback"
      data-webgl-state={!mounted || webglAvailable === null ? 'detecting' : 'unavailable'}
    >
      <HomeSpatialWorldFinal />
    </div>
  )
}
