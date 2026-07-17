'use client'

import HomeSpatialWorldFinal from './HomeSpatialWorldFinal'
import { useWebGLAvailable } from './HomeSpatialCanvas'

/**
 * Home has exactly one visual owner. The template-mounted WebGL runtime owns
 * capable devices; the DOM/CSS world is an accessible no-WebGL fallback only.
 */
export default function FinalHomeThreshold() {
  const webglAvailable = useWebGLAvailable()

  if (webglAvailable === true) return null

  if (webglAvailable === null) {
    return (
      <main
        aria-label="Opening URAI Home"
        data-testid="urai-home-runtime-probe"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          minHeight: '100svh',
          color: '#dffbff',
          background: 'radial-gradient(circle at 50% 52%, rgba(103,232,249,.14), transparent 26%), #071821',
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
        }}
      >
        Opening Home
      </main>
    )
  }

  return <HomeSpatialWorldFinal />
}
