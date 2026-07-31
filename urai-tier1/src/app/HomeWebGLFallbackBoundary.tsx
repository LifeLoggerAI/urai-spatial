'use client'

import { useWebGLAvailable } from './HomeSpatialCanvas'
import HomeSpatialWorldFinal from './HomeSpatialWorldFinal'

const fallbackStyles = `.urai-home-webgl-capability-fallback{position:fixed;inset:0;z-index:39;overflow:auto;background:#081b18}.urai-home-webgl-capability-fallback__nav{position:fixed;z-index:48;right:max(10px,env(safe-area-inset-right));top:50%;transform:translateY(-50%);display:grid;gap:8px}.urai-home-webgl-capability-fallback__nav a{display:flex;align-items:center;justify-content:center;width:48px;height:48px;min-width:48px;min-height:48px;border:1px solid rgba(230,246,240,.32);border-radius:50%;background:rgba(6,18,19,.92);color:#f3fbf8;font:700 9px/1 system-ui;text-decoration:none}.urai-home-webgl-capability-fallback__nav a:focus-visible{outline:3px solid #fff;outline-offset:2px}`

export default function HomeWebGLFallbackBoundary() {
  const webglAvailable = useWebGLAvailable()

  if (webglAvailable !== false) return null

  return (
    <section
      className="urai-home-webgl-capability-fallback"
      data-urai-home-runtime="accessible-fallback-without-webgl"
      data-webgl-ready="false"
      aria-label="Spatial Home fallback"
    >
      <div role="status" aria-live="polite" className="sr-only">
        WebGL is unavailable. Accessible Home controls remain available.
      </div>
      <nav className="urai-home-webgl-capability-fallback__nav" aria-label="Accessible Home destinations">
        <a href="/assistant/" aria-label="Open Orb directly">Orb</a>
        <a href="/ground/" aria-label="Open Ground directly">Ground</a>
        <a href="/life-map/" aria-label="Open Life Map directly">Life Map</a>
      </nav>
      <HomeSpatialWorldFinal />
      <style jsx global>{fallbackStyles}</style>
    </section>
  )
}
