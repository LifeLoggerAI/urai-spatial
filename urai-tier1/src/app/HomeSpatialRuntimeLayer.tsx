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
      <button
        type="button"
        className="urai-home-spatial-orb-trigger"
        aria-label="Orb private companion"
        aria-expanded={orbOpen}
        aria-controls="urai-home-spatial-orb-panel"
        onClick={() => setOrbOpen(true)}
      >
        <span aria-hidden="true" />
        <strong>Orb</strong>
      </button>
      <aside
        id="urai-home-spatial-orb-panel"
        className="urai-home-spatial-runtime-orb"
        data-open={orbOpen ? 'true' : 'false'}
        aria-live="polite"
      >
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

        .urai-home-spatial-orb-trigger {
          position: absolute;
          left: 50%;
          bottom: 76px;
          z-index: 12;
          display: inline-flex;
          min-width: 56px;
          min-height: 56px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 14px;
          border: 1px solid rgba(188, 245, 248, .5);
          border-radius: 999px;
          color: #f4ffff;
          background: rgba(3, 15, 22, .82);
          box-shadow: 0 12px 38px rgba(0, 0, 0, .34), 0 0 30px rgba(103, 232, 249, .18);
          transform: translateX(-50%);
          cursor: pointer;
          touch-action: manipulation;
        }

        .urai-home-spatial-orb-trigger > span {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #dffeff;
          box-shadow: 0 0 18px rgba(103, 232, 249, .95);
        }

        .urai-home-spatial-orb-trigger:focus-visible {
          outline: 3px solid rgba(103, 232, 249, .9);
          outline-offset: 4px;
        }

        .urai-home-spatial-runtime-orb a,
        .urai-home-spatial-runtime-orb > button {
          min-width: 44px;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          touch-action: manipulation;
        }

        @media (max-width: 760px) {
          .urai-home-spatial-orb-trigger {
            bottom: 68px;
          }
        }
      `}</style>
    </section>
  )
}
