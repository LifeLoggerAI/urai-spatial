'use client'

import { useEffect, useState } from 'react'
import HomeSpatialWorldFinal from './HomeSpatialWorldFinal'
import { useWebGLAvailable } from './HomeSpatialCanvas'

/**
 * Home has exactly one visual owner. The template-mounted WebGL runtime owns
 * capable devices; the DOM/CSS world is rendered first so no-JS, hydration
 * failure, capability detection, and no-WebGL paths always retain a complete
 * accessible Home. It is removed only after WebGL is positively confirmed.
 */
export default function FinalHomeThreshold() {
  const webglAvailable = useWebGLAvailable()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (mounted && webglAvailable === true) return null

  return (
    <div
      data-testid="urai-home-accessible-fallback"
      data-webgl-state={!mounted || webglAvailable === null ? 'detecting' : 'unavailable'}
    >
      <HomeSpatialWorldFinal />
    </div>
  )
}
