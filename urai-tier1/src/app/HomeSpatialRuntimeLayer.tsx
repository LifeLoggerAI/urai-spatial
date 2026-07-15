'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import HomeSpatialCanvas, { useWebGLAvailable } from './HomeSpatialCanvas'

const doorwayLinks = [
  { href: '/ground?from=home-spatial-shortcuts', label: 'Ground' },
  { href: '/life-map?from=home-spatial-shortcuts', label: 'Life Map' },
  { href: '/mirror', label: 'Mirror' },
  { href: '/passport', label: 'Passport' },
  { href: '/spatial/ar-vr', label: 'XR' },
] as const

export default function HomeSpatialRuntimeLayer() {
  const pathname = usePathname() ?? '/'
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  const [orbOpen, setOrbOpen] = useState(false)
  const webglAvailable = useWebGLAvailable()
  const routeEligible = normalizedPathname === '/' || normalizedPathname === '/home'
  const runtimeActive = routeEligible && webglAvailable === true

  useEffect(() => {
    const root = document.documentElement
    if (!runtimeActive) {
      root.classList.remove('urai-home-runtime-active')
      return
    }

    root.classList.add('urai-home-runtime-active')
    return () => root.classList.remove('urai-home-runtime-active')
  }, [runtimeActive])

  if (!runtimeActive) return null

  return createPortal(
    <section
      className="urai-home-spatial-runtime-layer"
      data-urai-home-runtime="one-continuous-webgl-world"
      data-webgl-ready="true"
      data-orb-open={orbOpen ? 'true' : 'false'}
      aria-label="URAI living spatial Home"
    >
      <h1 className="urai-home-spatial-runtime-title">Step inside yourself.</h1>
      <HomeSpatialCanvas webglAvailable onOrbOpen={() => setOrbOpen(true)} />
      <nav className="urai-home-spatial-runtime-portals" aria-label="Spatial doorway shortcuts">
        {doorwayLinks.map((doorway) => <Link key={doorway.href} href={doorway.href}>{doorway.label}</Link>)}
      </nav>
      <aside className="urai-home-spatial-runtime-orb" data-open={orbOpen ? 'true' : 'false'} aria-live="polite">
        <button type="button" aria-label="Close orb guidance" onClick={() => setOrbOpen(false)}>×</button>
        <p>URAI orb</p>
        <strong>Choose a doorway in the world. Ground is your private workforce. Life Map is your memory sky.</strong>
        <nav aria-label="Orb suggested places">
          <Link href="/ground?from=home-orb">Ground</Link>
          <Link href="/life-map?from=home-orb">Life Map</Link>
          <Link href="/mirror">Mirror</Link>
          <Link href="/passport">Passport</Link>
        </nav>
      </aside>
      <style jsx global>{`
        html.urai-home-runtime-active,
        html.urai-home-runtime-active body {
          width: 100%;
          height: 100%;
          overflow: hidden !important;
          background: #07111c !important;
        }

        html.urai-home-runtime-active body > .urai-home-spatial-runtime-layer {
          position: fixed !important;
          inset: 0 !important;
          z-index: 2147483000 !important;
          display: block !important;
          width: 100vw !important;
          height: 100svh !important;
          isolation: isolate !important;
        }

        html.urai-home-runtime-active .urai-home-spatial-world-final {
          display: none !important;
        }

        .urai-home-spatial-runtime-title {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }

        .urai-home-spatial-runtime-layer .urai-home-spatial-canvas {
          filter: brightness(1.34) saturate(1.2) contrast(1.02);
        }

        .urai-home-spatial-runtime-portals {
          position: absolute;
          left: 50%;
          bottom: 58px;
          z-index: 37;
          display: flex;
          align-items: center;
          gap: 7px;
          max-width: calc(100vw - 32px);
          padding: 7px;
          transform: translateX(-50%);
          overflow-x: auto;
          scrollbar-width: none;
          border: 1px solid rgba(220, 250, 255, .16);
          border-radius: 999px;
          background: rgba(3, 9, 15, .56);
          box-shadow: 0 18px 54px rgba(0, 0, 0, .34), 0 0 44px rgba(103, 232, 249, .08);
          backdrop-filter: blur(16px);
          transition: opacity .2s ease, transform .2s ease;
        }

        .urai-home-spatial-runtime-portals::-webkit-scrollbar {
          display: none;
        }

        .urai-home-spatial-runtime-portals a {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 7px 12px;
          border: 1px solid rgba(188, 245, 248, .2);
          border-radius: 999px;
          color: rgba(248, 252, 252, .94);
          background: rgba(7, 20, 28, .72);
          text-decoration: none;
          white-space: nowrap;
          font: 850 .7rem/1 Inter, ui-sans-serif, system-ui, sans-serif;
          letter-spacing: .035em;
        }

        .urai-home-spatial-runtime-portals a:hover,
        .urai-home-spatial-runtime-portals a:focus-visible {
          border-color: rgba(188, 245, 248, .52);
          background: rgba(12, 37, 47, .92);
          outline: 2px solid rgba(188, 245, 248, .72);
          outline-offset: 2px;
        }

        .urai-home-spatial-runtime-layer[data-orb-open="true"] .urai-home-spatial-runtime-portals {
          opacity: .22;
          pointer-events: none;
          transform: translateX(-50%) translateY(4px);
        }

        @media (max-width: 760px) {
          .urai-home-spatial-runtime-portals {
            bottom: 74px;
            width: calc(100vw - 28px);
            justify-content: flex-start;
          }

          .urai-home-spatial-runtime-portals a {
            min-height: 32px;
            padding: 7px 11px;
            font-size: .66rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .urai-home-spatial-runtime-portals {
            transition: none;
          }
        }
      `}</style>
    </section>,
    document.body,
  )
}
