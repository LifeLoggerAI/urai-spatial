'use client'

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

  if (webglAvailable === true) return null

  return (
    <div
      data-testid="urai-home-accessible-fallback"
      data-webgl-state={webglAvailable === null ? 'detecting' : 'unavailable'}
    >
      <HomeSpatialWorldFinal />
    </div>
  )
}
